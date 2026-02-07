from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, Profile, ServerUpgradeRequest


@receiver(post_save, sender=User)
def create_profile_for_user(sender, instance, created, **kwargs):
    """
    Automatically create a Profile when a new User is created.
    Ensures every user has a linked profile for role management.
    """
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=ServerUpgradeRequest)
def auto_promote_to_server(sender, instance, **kwargs):
    """
    If a ServerUpgradeRequest is both reviewed and approved,
    the associated user's profile role is set to 'server'.
    """
    if instance.approved and instance.reviewed:
        profile = instance.user.profile
        if profile.role != "server":
            profile.role = "server"
            profile.save()
