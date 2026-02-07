from rest_framework import serializers
import imghdr


class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r"^0[567]\d{8}$",
        help_text="Must be a 10-digit Algerian number starting with 05, 06, or 07.",
        required=True,
        trim_whitespace=True,
    )


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r"^0[567]\d{8}$",
        help_text="Must be a 10-digit Algerian number starting with 05, 06, or 07.",
        required=True,
        trim_whitespace=True,
    )

    code = serializers.RegexField(
        regex=r"^\d{6}$",
        help_text="6-digit OTP code.",
        required=True,
    )


# passport/serializers.py

# passport/serializers.py


MAX_IMAGE_SIZE_MB = 5


class BecomeServerSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    city = serializers.CharField()
    driving_license = serializers.ImageField()
    gray_card = serializers.ImageField()

    def validate_first_name(self, value):
        if not value.isalpha():
            raise serializers.ValidationError("First name must contain only letters.")
        return value.title()

    def validate_last_name(self, value):
        if not value.isalpha():
            raise serializers.ValidationError("Last name must contain only letters.")
        return value.title()

    def validate_city(self, value):
        if not value.isdigit() or not (1 <= int(value) <= 58) or len(value) != 2:
            raise serializers.ValidationError("City must be a two-digit number between 01 and 58.")
        return value

    def validate_driving_license(self, value):
        return self._validate_image(value, "driving_license")

    def validate_gray_card(self, value):
        return self._validate_image(value, "gray_card")

    def _validate_image(self, file, field_name):
        # ✅ Check file type
        file_type = imghdr.what(file)
        if file_type not in ["jpeg", "png", "jpg"]:
            raise serializers.ValidationError(
                f"{field_name} must be an image (jpg, jpeg, png)."
            )

        # ✅ Check file size
        if file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"{field_name} must be < {MAX_IMAGE_SIZE_MB}MB."
            )
        return file
