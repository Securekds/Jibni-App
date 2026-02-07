#!/usr/bin/env python
"""
Script to reset a driver's 'engaged' status to False
This allows the driver to appear in nearby servers search results
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

def reset_engaged(phone_number=None, user_id=None):
    """Reset engaged status for a driver"""
    try:
        if phone_number:
            user = User.objects.get(phone_number=phone_number)
        elif user_id:
            user = User.objects.get(id=user_id)
        else:
            print("Error: Please provide either phone_number or user_id")
            return False
        
        profile = user.profile
        if profile.role != 'server':
            print(f"User {user.phone_number} (ID: {user.id}) is not a server (role: {profile.role})")
            return False
        
        print(f"Current status for user {user.phone_number} (ID: {user.id}):")
        print(f"  - engaged: {profile.engaged}")
        print(f"  - open_to_work: {profile.open_to_work}")
        print(f"  - role: {profile.role}")
        
        if profile.engaged:
            profile.engaged = False
            profile.open_to_work = True  # Also ensure they're available
            profile.save()
            print(f"\n[SUCCESS] Successfully reset engaged status!")
            print(f"  - engaged: {profile.engaged}")
            print(f"  - open_to_work: {profile.open_to_work}")
            return True
        else:
            print(f"\nUser is already not engaged (engaged=False)")
            return True
            
    except User.DoesNotExist:
        print(f"Error: User not found")
        return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python reset_driver_engaged.py <phone_number>")
        print("   or: python reset_driver_engaged.py --user-id <user_id>")
        print("\nExample: python reset_driver_engaged.py 0778669194")
        sys.exit(1)
    
    if sys.argv[1] == "--user-id" and len(sys.argv) >= 3:
        user_id = int(sys.argv[2])
        reset_engaged(user_id=user_id)
    else:
        phone_number = sys.argv[1]
        reset_engaged(phone_number=phone_number)
