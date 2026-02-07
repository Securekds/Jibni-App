#!/usr/bin/env python
"""
View Server Upgrade Requests (Truck Driver Requests)
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import ServerUpgradeRequest, Profile

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def view_all_requests():
    print_section("ALL SERVER UPGRADE REQUESTS")
    requests = ServerUpgradeRequest.objects.all().order_by('-submitted_at')
    
    if not requests.exists():
        print("No upgrade requests found.")
        return
    
    print(f"Total Requests: {requests.count()}\n")
    
    for req in requests:
        user = req.user
        profile = user.profile if hasattr(user, 'profile') else None
        
        # Status
        if not req.reviewed:
            status = "[PENDING]"
        elif req.approved:
            status = "[APPROVED]"
        else:
            status = "[REJECTED]"
        
        print(f"{status}")
        print(f"  User: {user.phone_number}")
        if profile:
            print(f"  Name: {profile.first_name} {profile.last_name}")
            print(f"  City: {profile.city}")
            print(f"  Current Role: {profile.role}")
        print(f"  Submitted: {req.submitted_at}")
        if req.reviewed:
            print(f"  Reviewed: Yes")
            if req.approved:
                print(f"  Result: Approved")
            else:
                print(f"  Result: Rejected")
                if req.rejection_reason:
                    print(f"  Reason: {req.rejection_reason}")
        else:
            print(f"  Reviewed: No (PENDING ADMIN REVIEW)")
        print()

def view_pending_requests():
    print_section("PENDING REQUESTS (Need Review)")
    pending = ServerUpgradeRequest.objects.filter(reviewed=False).order_by('-submitted_at')
    
    if not pending.exists():
        print("No pending requests. All requests have been reviewed.")
        return
    
    print(f"Pending Requests: {pending.count()}\n")
    
    for req in pending:
        user = req.user
        profile = user.profile if hasattr(user, 'profile') else None
        
        print(f"[Request ID: {req.id}]")
        print(f"  Phone: {user.phone_number}")
        if profile:
            print(f"  Name: {profile.first_name} {profile.last_name}")
            print(f"  City: {profile.city}")
            print(f"  Driving License: {'Yes' if profile.driving_license else 'No'}")
            print(f"  Gray Card: {'Yes' if profile.gray_card else 'No'}")
        print(f"  Submitted: {req.submitted_at}")
        print(f"  Days Pending: {(django.utils.timezone.now() - req.submitted_at).days}")
        print()

def view_statistics():
    print_section("STATISTICS")
    total = ServerUpgradeRequest.objects.count()
    pending = ServerUpgradeRequest.objects.filter(reviewed=False).count()
    approved = ServerUpgradeRequest.objects.filter(reviewed=True, approved=True).count()
    rejected = ServerUpgradeRequest.objects.filter(reviewed=True, approved=False).count()
    
    print(f"Total Requests: {total}")
    print(f"  [PENDING]   : {pending}")
    print(f"  [APPROVED]  : {approved}")
    print(f"  [REJECTED]  : {rejected}")
    if total > 0:
        approval_rate = (approved / total) * 100
        print(f"\nApproval Rate: {approval_rate:.1f}%")

def main():
    print("\n" + "="*70)
    print("  SERVER UPGRADE REQUESTS VIEWER")
    print("  (Truck Driver / Server Role Requests)")
    print("="*70)
    
    view_statistics()
    view_pending_requests()
    view_all_requests()
    
    print("\n" + "="*70)
    print("  To approve/reject requests, use Django Admin:")
    print("  http://192.168.192.101:8000/admin/passport/serverupgraderequest/")
    print("="*70 + "\n")

if __name__ == "__main__":
    import django.utils.timezone
    main()
