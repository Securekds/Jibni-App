#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Fix user role to 'server'
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import User, Profile

def fix_user_role(phone_number):
    """Fix user role to 'server'"""
    try:
        user = User.objects.get(phone_number=phone_number)
        profile = Profile.objects.get(user=user)
        
        print(f"\n{'='*70}")
        print(f"  FIXING USER ROLE")
        print(f"{'='*70}")
        print(f"User ID: {user.id}")
        print(f"Phone: {user.phone_number}")
        print(f"Current Role: {profile.role}")
        
        if profile.role != 'server':
            profile.role = 'server'
            profile.save()
            print(f"\n[SUCCESS] Role updated to 'server'")
        else:
            print(f"\n[INFO] Role is already 'server'")
        
        print(f"{'='*70}\n")
        
    except User.DoesNotExist:
        print(f"Error: User with phone {phone_number} not found")
    except Profile.DoesNotExist:
        print(f"Error: Profile for user {phone_number} not found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nUsage: python fix_user_role.py <phone_number>")
        print("Example: python fix_user_role.py 0666854120")
    else:
        phone_number = sys.argv[1]
        fix_user_role(phone_number)
