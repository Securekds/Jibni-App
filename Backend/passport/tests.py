from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from passport.models import OTP, User, ServerUpgradeRequest


# === Utility ===


def dummy_image():
    return SimpleUploadedFile(
        "test.jpg", b"fake-image-content", content_type="image/jpeg"
    )


# === Auth Flow Tests ===


class AuthFlowTests(APITestCase):
    """
    Covers OTP send, verify, and logout flow.
    """

    def setUp(self):
        self.phone_number = "+213661112233"
        self.send_url = reverse("send_otp")
        self.verify_url = reverse("verify_otp")
        self.logout_url = reverse("logout")

    def test_send_otp_success(self):
        response = self.client.post(self.send_url, {"phone_number": self.phone_number})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("otp", response.data["data"])  # Remove in production

    def test_send_otp_rate_limit(self):
        for _ in range(5):
            self.client.post(self.send_url, {"phone_number": self.phone_number})
        response = self.client.post(self.send_url, {"phone_number": self.phone_number})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data["status"], "error")

    def test_send_otp_resend_too_soon(self):
        self.client.post(self.send_url, {"phone_number": self.phone_number})
        response = self.client.post(self.send_url, {"phone_number": self.phone_number})
        self.assertEqual(response.status_code, 429)
        self.assertIn("Please wait", response.data["message"])

    def test_verify_otp_success(self):
        otp_code = "123456"
        OTP.objects.create(
            phone_number=self.phone_number,
            code_hash=OTP.hash_code(otp_code),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        response = self.client.post(
            self.verify_url, {"phone_number": self.phone_number, "code": otp_code}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("access", response.data["data"])

    def test_verify_otp_incorrect_code(self):
        OTP.objects.create(
            phone_number=self.phone_number,
            code_hash=OTP.hash_code("123456"),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        response = self.client.post(
            self.verify_url, {"phone_number": self.phone_number, "code": "000000"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["status"], "error")

    def test_verify_otp_expired(self):
        OTP.objects.create(
            phone_number=self.phone_number,
            code_hash=OTP.hash_code("123456"),
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        response = self.client.post(
            self.verify_url, {"phone_number": self.phone_number, "code": "123456"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("expired", response.data["message"])

    def test_verify_otp_too_many_attempts(self):
        OTP.objects.create(
            phone_number=self.phone_number,
            code_hash=OTP.hash_code("123456"),
            expires_at=timezone.now() + timedelta(minutes=5),
            verification_attempts=5,
        )
        response = self.client.post(
            self.verify_url, {"phone_number": self.phone_number, "code": "123456"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Too many incorrect", response.data["message"])

    def test_logout_success(self):
        user = User.objects.create(phone_number=self.phone_number)
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = self.client.post(self.logout_url, {"refresh": str(refresh)})
        self.assertEqual(response.status_code, 205)
        self.assertEqual(response.data["status"], "success")

    def test_logout_missing_token(self):
        user = User.objects.create(phone_number=self.phone_number)
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = self.client.post(self.logout_url, {})
        self.assertEqual(response.status_code, 400)

    def test_logout_invalid_token(self):
        user = User.objects.create(phone_number=self.phone_number)
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = self.client.post(self.logout_url, {"refresh": "badtoken"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["status"], "error")


# === Server Upgrade Tests ===


class BecomeServerTests(TestCase):
    """
    Tests for the 'Become a Server' upgrade request flow.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create(phone_number="+213666000999")
        self.profile = self.user.profile
        self.profile.first_name = "Ali"
        self.profile.last_name = "Ben"
        self.profile.save()

        self.client.force_authenticate(user=self.user)
        self.url = reverse("become-server")

        self.valid_payload = {
            "first_name": "Ali",
            "last_name": "Ben",
            "driving_license": dummy_image(),
            "gray_card": dummy_image(),
        }

    def test_successful_upgrade_request(self):
        response = self.client.post(self.url, self.valid_payload, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertIn("success", response.data["status"])
        self.assertTrue(ServerUpgradeRequest.objects.filter(user=self.user).exists())

    def test_missing_first_name(self):
        payload = self.valid_payload.copy()
        del payload["first_name"]
        response = self.client.post(self.url, payload, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing first_name", response.data["message"])

    def test_missing_last_name(self):
        payload = self.valid_payload.copy()
        del payload["last_name"]
        response = self.client.post(self.url, payload, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_missing_driving_license(self):
        payload = self.valid_payload.copy()
        del payload["driving_license"]
        response = self.client.post(self.url, payload, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_missing_gray_card(self):
        payload = self.valid_payload.copy()
        del payload["gray_card"]
        response = self.client.post(self.url, payload, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_already_server_user(self):
        self.profile.role = "server"
        self.profile.save()
        response = self.client.post(self.url, self.valid_payload, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("already a server", response.data["message"])

    def test_duplicate_upgrade_request(self):
        ServerUpgradeRequest.objects.create(user=self.user)
        response = self.client.post(self.url, self.valid_payload, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("already submitted", response.data["message"])

    def test_role_auto_upgrade_on_admin_approval(self):
        req = ServerUpgradeRequest.objects.create(user=self.user)
        self.assertEqual(self.profile.role, "client")
        req.reviewed = True
        req.approved = True
        req.save()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.role, "server")

    def test_role_does_not_upgrade_if_not_approved(self):
        ServerUpgradeRequest.objects.create(
            user=self.user, reviewed=True, approved=False
        )
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.role, "client")

    def test_role_does_not_upgrade_if_not_reviewed(self):
        ServerUpgradeRequest.objects.create(
            user=self.user, reviewed=False, approved=True
        )
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.role, "client")


# === Server Upgrade Status View ===


class ServerUpgradeStatusTests(TestCase):
    """
    Tests the GET endpoint that shows current upgrade status.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create(phone_number="+213666000999")
        self.client.force_authenticate(self.user)
        self.url = reverse("server-upgrade-status")

    def test_upgrade_status_not_submitted(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upgrade_status"], "not_submitted")
        self.assertEqual(response.data["status"], "success")

    def test_upgrade_status_pending(self):
        ServerUpgradeRequest.objects.create(
            user=self.user, reviewed=False, approved=False
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upgrade_status"], "pending")

    def test_upgrade_status_approved(self):
        ServerUpgradeRequest.objects.create(
            user=self.user, reviewed=True, approved=True
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upgrade_status"], "approved")

    def test_upgrade_status_rejected(self):
        ServerUpgradeRequest.objects.create(
            user=self.user,
            reviewed=True,
            approved=False,
            rejection_reason="Gray card not readable",
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upgrade_status"], "rejected")
        self.assertEqual(response.data["rejection_reason"], "Gray card not readable")
