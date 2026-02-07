#!/usr/bin/env python
"""
Script to find driver phone numbers
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from django.contrib.auth import get_user_model
from passport.models import Profile

User = get_user_model()

def find_driver_phone(user_id=None):
    """Find phone number for a driver by user ID"""
    try:
        if user_id:
            user = User.objects.get(id=user_id)
        else:
            print("Error: Please provide user_id")
            return
        
        profile = user.profile
        
        print(f"\n{'='*70}")
        print(f"  DRIVER INFORMATION")
        print(f"{'='*70}")
        print(f"User ID: {user.id}")
        print(f"Phone Number: {user.phone_number}")
        print(f"Role: {profile.role}")
        print(f"Engaged: {profile.engaged}")
        print(f"Open to Work: {profile.open_to_work}")
        if hasattr(profile, 'first_name'):
            print(f"Name: {profile.first_name} {profile.last_name if hasattr(profile, 'last_name') else ''}")
        print(f"{'='*70}\n")
        
    except User.DoesNotExist:
        print(f"Error: User with ID {user_id} not found")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

def list_all_drivers():
    """List all users with server role"""
    try:
        profiles = Profile.objects.filter(role='server')
        
        print(f"\n{'='*70}")
        print(f"  ALL DRIVERS (SERVER ROLE)")
        print(f"{'='*70}")
        
        if not profiles.exists():
            print("No drivers found")
        else:
            for profile in profiles:
                user = profile.user
                print(f"\nUser ID: {user.id}")
                print(f"Phone Number: {user.phone_number}")
                print(f"Engaged: {profile.engaged}")
                print(f"Open to Work: {profile.open_to_work}")
                if hasattr(profile, 'first_name'):
                    print(f"Name: {profile.first_name} {profile.last_name if hasattr(profile, 'last_name') else ''}")
                print("-" * 70)
        
        print(f"{'='*70}\n")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--list":
        list_all_drivers()
    elif len(sys.argv) >= 2:
        try:
            user_id = int(sys.argv[1])
            find_driver_phone(user_id)
        except ValueError:
            print("Error: user_id must be a number")
            print("Usage: python find_driver_phone.py <user_id>")
            print("   or: python find_driver_phone.py --list")
    else:
        print("Usage: python find_driver_phone.py <user_id>")
        print("   or: python find_driver_phone.py --list")
        print("\nExample: python find_driver_phone.py 3")
        print("   or: python find_driver_phone.py --list")
