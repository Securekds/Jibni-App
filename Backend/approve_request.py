#!/usr/bin/env python
"""
Approve or Reject Server Upgrade Request
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import ServerUpgradeRequest

def approve_request(request_id, approve=True, rejection_reason=None):
    """Approve or reject a server upgrade request by ID"""
    try:
        req = ServerUpgradeRequest.objects.get(id=request_id)
        user = req.user
        
        if req.reviewed:
            print(f"Request {request_id} has already been reviewed.")
            if req.approved:
                print(f"Status: APPROVED")
            else:
                print(f"Status: REJECTED")
                if req.rejection_reason:
                    print(f"Reason: {req.rejection_reason}")
            return
        
        req.reviewed = True
        req.approved = approve
        if not approve and rejection_reason:
            req.rejection_reason = rejection_reason
        req.save()
        
        if approve:
            # Update user role to 'server'
            from passport.models import Profile
            try:
                profile = Profile.objects.get(user=user)
                profile.role = 'server'
                profile.save()
                print(f"✓ Request {request_id} APPROVED")
                print(f"  User: {user.phone_number}")
                print(f"  Role updated to: server")
                print(f"  Profile ID: {profile.id}")
            except Profile.DoesNotExist:
                # Create profile if it doesn't exist
                profile = Profile.objects.create(user=user, role='server')
                print(f"✓ Request {request_id} APPROVED")
                print(f"  User: {user.phone_number}")
                print(f"  Profile created with role: server")
        else:
            print(f"✗ Request {request_id} REJECTED")
            if rejection_reason:
                print(f"  Reason: {rejection_reason}")
                
    except ServerUpgradeRequest.DoesNotExist:
        print(f"Error: Request {request_id} not found")
    except Exception as e:
        print(f"Error: {e}")

def list_pending_requests():
    """List all pending requests"""
    pending = ServerUpgradeRequest.objects.filter(reviewed=False).order_by('-submitted_at')
    
    if not pending.exists():
        print("No pending requests found.")
        return []
    
    print("\n" + "="*70)
    print("  PENDING REQUESTS")
    print("="*70)
    
    requests_list = []
    for req in pending:
        user = req.user
        profile = user.profile if hasattr(user, 'profile') else None
        
        print(f"\n[ID: {req.id}]")
        print(f"  Phone: {user.phone_number}")
        if profile:
            print(f"  Name: {profile.first_name} {profile.last_name}")
            print(f"  City: {profile.city}")
        print(f"  Submitted: {req.submitted_at}")
        
        requests_list.append(req.id)
    
    return requests_list

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("\n" + "="*70)
        print("  SERVER UPGRADE REQUEST APPROVAL TOOL")
        print("="*70)
        
        pending = list_pending_requests()
        
        if pending:
            print("\n" + "="*70)
            print("  USAGE:")
            print("="*70)
            print("  To APPROVE a request:")
            print(f"    python approve_request.py {pending[0]} approve")
            print("\n  To REJECT a request:")
            print(f"    python approve_request.py {pending[0]} reject \"Reason here\"")
            print("\n  Or use Django Admin:")
            print("    http://172.20.10.3:8000/admin/passport/serverupgraderequest/")
        else:
            print("\nNo pending requests to approve.")
    else:
        request_id = int(sys.argv[1])
        action = sys.argv[2].lower() if len(sys.argv) > 2 else 'approve'
        reason = sys.argv[3] if len(sys.argv) > 3 else None
        
        if action == 'approve':
            approve_request(request_id, approve=True)
        elif action == 'reject':
            approve_request(request_id, approve=False, rejection_reason=reason)
        else:
            print(f"Unknown action: {action}. Use 'approve' or 'reject'")
