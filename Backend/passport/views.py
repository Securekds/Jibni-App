from datetime import timedelta
from django.utils import timezone
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import OTP, User, ServerUpgradeRequest
from .serializers import BecomeServerSerializer, SendOTPSerializer, VerifyOTPSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample


@extend_schema(
    request=SendOTPSerializer,
    responses={
        200: {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "success"},
                "message": {"type": "string", "example": "OTP sent successfully."},
                "data": {
                    "type": "object",
                    "properties": {
                        "otp": {"type": "integer", "example": 123456},
                        "expiration_duration": {"type": "integer", "example": 300},
                    },
                },
            },
        },
        429: {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "error"},
                "message": {"type": "string"},
            },
        },
    },
    examples=[
        OpenApiExample(
            "OTP Sent",
            value={
                "status": "success",
                "message": "OTP sent successfully.",
                "data": {
                    "otp": 123456,
                    "expiration_duration": 300,
                },
            },
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Cooldown Not Passed",
            value={
                "status": "error",
                "message": "Please wait 60 seconds before requesting a new OTP.",
            },
            response_only=True,
            status_codes=["429"],
        ),
        OpenApiExample(
            "Daily Limit Exceeded",
            value={
                "status": "error",
                "message": "OTP request limit exceeded for today. Try again after 24h.",
            },
            response_only=True,
            status_codes=["429"],
        ),
    ],
    description="Sends a 6-digit OTP to the provided phone number. Limited to 5 requests per 24h.",
    tags=["Authentication"],
)
class SendOTPView(APIView):
    """
    Handles sending OTP codes with cooldown and rate limiting.
    """

    RESEND_COOLDOWN_SECONDS = 60
    OTP_EXPIRATION_MINUTES = 5
    MAX_DAILY_REQUESTS = 5

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone_number"]
        now = timezone.now()

         
        otp_record = OTP.objects.filter(phone_number=phone).first()
        if otp_record and otp_record.generation_attempts > self.MAX_DAILY_REQUESTS:
            return Response(
                {
                    "status": "error",
                    "message": "OTP request limit exceeded for today. Try again after 24h.",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 🧼 Cleanup old/valid OTP
        existing_otp = OTP.objects.filter(phone_number=phone).first()
        if existing_otp and not existing_otp.is_expired():
            if (
                now - existing_otp.created_at
            ).total_seconds() < self.RESEND_COOLDOWN_SECONDS:
                return Response(
                    {
                        "status": "error",
                        "message": f"Please wait {self.RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP.",
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            existing_otp.delete()

        # ✅ Create and send OTP
        code = OTP.generate_code()
        code_hash = OTP.hash_code(code)

        prev_attempts = existing_otp.generation_attempts if existing_otp else 0
        OTP.objects.create(
            phone_number=phone,
            code_hash=code_hash,
            expires_at=now + timedelta(minutes=self.OTP_EXPIRATION_MINUTES),
            generation_attempts=prev_attempts + 1,
        )

        print(f"[DEBUG] OTP {code} sent to {phone}") 

        return Response(
            {
                "status": "success",
                "message": "OTP sent successfully.",
                "data": {
                    "otp": int(code), 
                    "expiration_duration": self.OTP_EXPIRATION_MINUTES * 60,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    request=VerifyOTPSerializer,
    responses={
        200: OpenApiResponse(description="OTP verified. JWT tokens returned."),
        400: OpenApiResponse(description="OTP expired"),
        401: OpenApiResponse(description="Incorrect OTP"),
        403: OpenApiResponse(description="Too many incorrect attempts"),
        404: OpenApiResponse(description="No OTP found"),
    },
    description="Verifies the OTP and returns access and refresh tokens. Creates a user if not existing.",
    tags=["Authentication"],
)
class VerifyOTPView(APIView):
    """
    Verifies submitted OTP and returns JWT tokens.
    """

    MAX_VERIFICATION_ATTEMPTS = 5

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone_number"]
        code = serializer.validated_data["code"]
        otp = OTP.objects.filter(phone_number=phone).first()

        if not otp:
            return Response(
                {"status": "error", "message": "No OTP found for this number."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if otp.is_expired():
            otp.delete()
            return Response(
                {
                    "status": "error",
                    "message": "OTP expired. Please request a new one.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.verification_attempts >= self.MAX_VERIFICATION_ATTEMPTS:
            otp.delete()
            return Response(
                {
                    "status": "error",
                    "message": "Too many incorrect attempts. OTP invalidated.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if OTP.hash_code(code) != otp.code_hash:
            otp.verification_attempts += 1
            otp.save()
            remaining = self.MAX_VERIFICATION_ATTEMPTS - otp.verification_attempts
            return Response(
                {
                    "status": "error",
                    "message": f"Incorrect OTP. {remaining} attempt(s) remaining.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        otp.delete()
        user, _ = User.objects.get_or_create(phone_number=phone)
        refresh = RefreshToken.for_user(user)

        # Get user profile data
        profile = user.profile if hasattr(user, 'profile') else None
        role = profile.role if profile else 'user'
        open_to_work = profile.open_to_work if profile else True
        
        return Response(
            {
                "status": "success",
                "message": "OTP verified. Authentication successful.",
                "data": {
                    "access": str(refresh.access_token), 
                    "refresh": str(refresh), 
                    "role": role,
                    "open_to_work": open_to_work,
                },
            }
        )


@extend_schema(
    request=None,
    responses={
        205: OpenApiResponse(description="Refresh token blacklisted. User logged out."),
        400: OpenApiResponse(description="Invalid refresh token."),
    },
    description="Logs out the user by blacklisting the refresh token.",
    tags=["Authentication"],
)
class LogoutView(APIView):
    """
    Blacklists refresh token to log out.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            raise ValidationError({"refresh": "Refresh token is required."})

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"status": "success", "message": "Logged out successfully."},
                status=status.HTTP_205_RESET_CONTENT,
            )
        except TokenError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Invalid refresh token.",
                    "data": {"error": str(e)},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema_view(
    post=extend_schema(
        summary="Refresh access token",
        description="Use a valid refresh token to get a new access token.",
        tags=["Authentication"],
    )
)
class CustomTokenRefreshView(TokenRefreshView):
    pass

@extend_schema(
    request=BecomeServerSerializer,
    responses={
        200: OpenApiResponse(
            description="Upgrade request submitted successfully.",
            response={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "success"},
                    "message": {"type": "string", "example": "Request submitted for review."}
                }
            }
        ),
        400: OpenApiResponse(
            description=(
                "Bad Request - Various validation errors.\n\n"
                "**Response Structure:**\n"
                
                "{\n"
                "  \"status\": \"error\",\n"
                "  \"message\": \"Invalid data.\",\n"
                "  \"errors\": {\n"
                "    \"first_name\": [\"First name must contain only letters.\"],\n"
                "    \"last_name\": [\"Last name must contain only letters.\"],\n"
                "    \"city\": [\"City must be a two-digit number between 01 and 58.\"],\n"
                "    \"driving_license\": [\"driving_license must be an image (jpg, jpeg, png).\", \"driving_license must be < 5MB.\"],\n"
                "    \"gray_card\": [\"gray_card must be an image (jpg, jpeg, png).\", \"gray_card must be < 5MB.\"]\n"
                "  }\n"
                "}\n"
                "```\n\n"
                "**Or for business logic errors (no errors field):**\n"
                
                "{\n"
                "  \"status\": \"error\",\n"
                "  \"message\": \"You are already a server.\"\n"
                "}\n"
                "```\n\n"
                "**Possible Error Messages:**\n"
                "• You are already a server. - User already has server role\n"
                "• Upgrade request already submitted. - Pending request exists\n"
                "• Invalid data. - Validation errors (see errors field)\n\n"
                "**Field-Specific Validation Errors (in errors object):**\n"
                "• first_name: Must contain only letters\n"
                "• last_name: Must contain only letters\n"
                "• city: Must be a two-digit number between 01 and 58\n"
                "• driving_license: Must be jpg/jpeg/png, max 5MB\n"
                "• gray_card: Must be jpg/jpeg/png, max 5MB"
            )
        ),
        403: OpenApiResponse(
            description="Forbidden - Unauthorized attempt to modify another user."
        ),
    },
    methods=["POST"],
    description=(
        "Allows a logged-in user to request becoming a server by submitting documents and identity info.\n\n"
        "**Required Fields:**\n"
        "- first_name: Letters only, auto-capitalized\n"
        "- last_name: Letters only, auto-capitalized\n"
        "- city: Two-digit number (01-58)\n"
        "- driving_license: Image file (jpg/jpeg/png, max 5MB)\n"
        "- gray_card: Image file (jpg/jpeg/png, max 5MB)\n\n"
        "**Constraints:**\n"
        "- User must not already be a server\n"
        "- User must not have a pending upgrade request"
    ),
    tags=["Profile & Role Upgrade"],
)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def become_server_view(request):
    """
    Request upgrade to 'server' role. Requires images and personal info.
    """
    user = request.user
    profile = user.profile

    # 🛑 Already a server
    if profile.role == "server":
        return Response(
            {"status": "error", "message": "You are already a server."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 🛑 Already submitted
    if hasattr(user, "upgrade_request"):
        return Response(
            {"status": "error", "message": "Upgrade request already submitted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ✅ Validate with serializer
    serializer = BecomeServerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "status": "error",
                "message": "Invalid data.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 📦 Extract validated data
    data = serializer.validated_data

    # 🧾 Update profile
    profile.first_name = data["first_name"]
    profile.last_name = data["last_name"]
    profile.city = data["city"]
    profile.driving_license = data["driving_license"]
    profile.gray_card = data["gray_card"]
    profile.save()

    # 📝 Create upgrade request
    ServerUpgradeRequest.objects.create(user=user)

    return Response(
        {"status": "success", "message": "Request submitted for review."},
        status=status.HTTP_200_OK,
    )

@extend_schema(
    responses={
        200: OpenApiResponse(
            description="Returns the current user's server upgrade status."
        ),
        404: OpenApiResponse(description="No upgrade request found."),
    },
    description="Returns whether the upgrade request was approved or rejected.",
    tags=["Profile & Role Upgrade"],
)
class ServerUpgradeStatusView(APIView):
    """
    Returns the current status of the user's server upgrade request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            req = ServerUpgradeRequest.objects.get(user=user)

            if req.reviewed:
                status_str = "approved" if req.approved else "rejected"
            else:
                status_str = "pending"

            return Response(
                {
                    "status": "success", #fixed
                    "upgrade_status": status_str,
                    "reviewed": req.reviewed, #bool
                    "approved": req.approved, #bool
                    "rejection_reason": (
                        req.rejection_reason if not req.approved else None # ex: racisim
                    ),
                }
            )
        except ServerUpgradeRequest.DoesNotExist:
            return Response({"status": "error", "upgrade_status": "not_submitted"},status=status.HTTP_404_NOT_FOUND)




@extend_schema(
    responses={
        200: {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "upgrade_status": {"type": "string"},
                "reviewed": {"type": "boolean"},
                "approved": {"type": "boolean"},
                "rejection_reason": {"type": ["string", "null"]},
                "banned": {"type": "boolean"},
            },
        },
        404: {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "upgrade_status": {"type": "string"},
                "banned": {"type": "boolean"},
            },
        },
    },
    description=(
        "Returns the current user's server upgrade status, including whether their upgrade request "
        "has been approved, rejected, or is pending, the review status, and the rejection reason (if any). "
        "Also indicates if the user is currently banned according to their profile."
    ),
    tags=["User Status"],
)
class UserStatusView(APIView):
    """
    Returns the current status of the user's server upgrade request,
    and whether the user is banned (from the Profile).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get 'banned' status from the user's Profile
        try:
            banned = user.profile.banned
        except AttributeError:
            banned = False  # If no profile, assume not banned (or handle differently)

        try:
            req = ServerUpgradeRequest.objects.get(user=user)
            if req.reviewed:
                status_str = "approved" if req.approved else "rejected"
            else:
                status_str = "pending"
            return Response(
                {
                    "status": "success",
                    "upgrade_status": status_str,
                    "reviewed": req.reviewed,
                    "approved": req.approved,
                    "rejection_reason": (
                        req.rejection_reason if not req.approved else None
                    ),
                    "banned": banned,
                }
            )
        except ServerUpgradeRequest.DoesNotExist:
            return Response(
                {
                    "status": "error",
                    "upgrade_status": "not_submitted",
                    "banned": banned,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
