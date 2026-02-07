#!/usr/bin/env python
"""
Create Django superuser programmatically
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import User

def create_superuser(phone_number=None, password=None):
    if not phone_number:
        phone_number = input("Enter phone number (e.g., 0794047421): ").strip()
    
    if not password:
        password = input("Enter password: ").strip()
    
    if not phone_number:
        print("Error: Phone number is required")
        return
    
    if not password:
        print("Error: Password is required")
        return
    
    # Check if user already exists
    if User.objects.filter(phone_number=phone_number).exists():
        user = User.objects.get(phone_number=phone_number)
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        print(f"[OK] Updated existing user {phone_number} to superuser")
    else:
        # Create new superuser
        user = User.objects.create_superuser(
            phone_number=phone_number,
            password=password
        )
        print(f"[OK] Created superuser: {phone_number}")
    
    print(f"\nYou can now login at: http://192.168.192.101:8000/admin/")
    print(f"Phone: {phone_number}")
    print(f"Password: {password}")

if __name__ == "__main__":
    try:
        # Accept command line arguments
        phone = sys.argv[1] if len(sys.argv) > 1 else None
        pwd = sys.argv[2] if len(sys.argv) > 2 else None
        create_superuser(phone_number=phone, password=pwd)
    except KeyboardInterrupt:
        print("\n\nCancelled.")
    except Exception as e:
        print(f"\nError: {e}")
