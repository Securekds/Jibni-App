import hashlib
import random
from datetime import timedelta
from django.utils import timezone

from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)

# ==========================
# Custom User Model
# ==========================


class CustomUserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        """
        Create a regular user identified by phone number only.
        Password is not used; login is OTP-based.
        """
        if not phone_number:
            raise ValueError("Users must have a phone number.")
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        """
        Create a superuser with password requirement.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not password:
            raise ValueError("Superuser must have a password.")

        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model that uses phone number as the unique identifier.
    """

    phone_number = models.CharField(max_length=15, unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.phone_number


# ==========================
# OTP Model
# ==========================


class OTP(models.Model):
    """
    Stores hashed OTP codes for a given phone number with expiry and attempt tracking.
    """

    phone_number = models.CharField(max_length=15)
    code_hash = models.CharField(max_length=64)  # SHA256 hash of OTP code
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    generation_attempts = models.PositiveIntegerField(
        default=0
    )  # Daily OTP request cap
    verification_attempts = models.PositiveIntegerField(default=0)  # Max tries per OTP

    @staticmethod
    def hash_code(code: str) -> str:
        return hashlib.sha256(code.encode()).hexdigest()

    @staticmethod
    def generate_code() -> str:
        return f"{random.randint(100000, 999999)}"

    def is_expired(self):
        return timezone.now() > self.expires_at


# ==========================
# Profile Model
# ==========================


class Profile(models.Model):
    """
    Extends the User model with personal data and service-related roles.
    """

    user = models.OneToOneField(
        "passport.User", on_delete=models.CASCADE, related_name="profile"
    )

    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)

    role = models.CharField(
        max_length=20,
        choices=(("client", "Client"), ("server", "Server")),
        default="client",
    )
    open_to_work = models.BooleanField(default=True)  # Server availability
    engaged = models.BooleanField(default=False)  # If currently serving a client
    banned = models.BooleanField(default=False)  # If user is banned
    driving_license = models.ImageField(upload_to="licenses/", null=True, blank=True)
    gray_card = models.ImageField(upload_to="gray_cards/", null=True, blank=True)
    licence_id = models.CharField(max_length=100, null=True, blank=True)  # N° de permis
    gray_card_id = models.CharField(max_length=100, null=True, blank=True)
    rating = models.FloatField(null=True, blank=True, default=0)  # Max rating = 5
    last_active = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.user.phone_number}"


# ==========================
# Server Upgrade Request
# ==========================


class ServerUpgradeRequest(models.Model):
    """
    Represents a user's request to upgrade from client to server.
    Admins must review and approve.
    """

    user = models.OneToOneField(
        "passport.User", on_delete=models.CASCADE, related_name="upgrade_request"
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    rejection_reason = models.TextField(null=True, blank=True)  # Optional admin message

    def __str__(self):
        return f"Upgrade request for {self.user.phone_number}"
