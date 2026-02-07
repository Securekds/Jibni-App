#!/usr/bin/env python
"""
Check and fix user role in database
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import User, Profile

def check_user_role(phone_number):
    """Check user role and fix if needed"""
    try:
        user = User.objects.get(phone_number=phone_number)
        profile = Profile.objects.get(user=user)
        
        print(f"\n{'='*70}")
        print(f"  USER ROLE CHECK")
        print(f"{'='*70}")
        print(f"User ID: {user.id}")
        print(f"Phone: {user.phone_number}")
        print(f"Current Role: {profile.role}")
        print(f"Profile ID: {profile.id}")
        
        # Check if there's an approved upgrade request
        from passport.models import ServerUpgradeRequest
        try:
            upgrade_request = ServerUpgradeRequest.objects.get(user=user)
            print(f"\nUpgrade Request Status:")
            print(f"  Reviewed: {upgrade_request.reviewed}")
            print(f"  Approved: {upgrade_request.approved}")
            print(f"  Submitted: {upgrade_request.submitted_at}")
            
            if upgrade_request.approved and upgrade_request.reviewed and profile.role != 'server':
                print(f"\n[WARNING] ISSUE FOUND: Request is approved but role is not 'server'!")
                print(f"Fixing role...")
                profile.role = 'server'
                profile.save()
                print(f"[SUCCESS] Role updated to 'server'")
            elif upgrade_request.approved and upgrade_request.reviewed and profile.role == 'server':
                print(f"\n[SUCCESS] Role is correct: 'server'")
            else:
                print(f"\n[INFO] Request is not approved yet")
        except ServerUpgradeRequest.DoesNotExist:
            print(f"\n[INFO] No upgrade request found for this user")
        
        print(f"{'='*70}\n")
        
    except User.DoesNotExist:
        print(f"Error: User with phone {phone_number} not found")
    except Profile.DoesNotExist:
        print(f"Error: Profile for user {phone_number} not found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nUsage: python check_user_role.py <phone_number>")
        print("Example: python check_user_role.py 0666854120")
        print("\nOr check all users:")
        users = User.objects.all()
        for user in users:
            try:
                profile = Profile.objects.get(user=user)
                print(f"User {user.id}: {user.phone_number} - Role: {profile.role}")
            except:
                print(f"User {user.id}: {user.phone_number} - No profile")
    else:
        phone_number = sys.argv[1]
        check_user_role(phone_number)
