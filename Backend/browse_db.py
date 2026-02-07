#!/usr/bin/env python
"""
Database Browser Script
Browse and query the SQLite database
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from passport.models import User, Profile, OTP, ServerUpgradeRequest
from wire.models import Mission, Ratings, Report, Fraud

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def browse_users():
    print_section("USERS")
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    for user in users[:10]:  # Show first 10
        print(f"  ID: {user.id} | Phone: {user.phone_number} | Active: {user.is_active}")
    if users.count() > 10:
        print(f"  ... and {users.count() - 10} more")

def browse_profiles():
    print_section("PROFILES")
    profiles = Profile.objects.all()
    print(f"Total Profiles: {profiles.count()}")
    for profile in profiles[:10]:
        role_icon = "🚗" if profile.role == "server" else "👤"
        print(f"  {role_icon} {profile.user.phone_number} | {profile.first_name} {profile.last_name} | Role: {profile.role} | Rating: {profile.rating}")
    if profiles.count() > 10:
        print(f"  ... and {profiles.count() - 10} more")

def browse_missions():
    print_section("MISSIONS")
    missions = Mission.objects.all().order_by('-created_at')
    print(f"Total Missions: {missions.count()}")
    for mission in missions[:10]:
        print(f"  Mission ID: {mission.mission_id}")
        print(f"    Client: {mission.client.phone_number} → Server: {mission.server.phone_number}")
        print(f"    Status: {mission.status} | Price: {mission.price} | Created: {mission.created_at}")
        print()
    if missions.count() > 10:
        print(f"  ... and {missions.count() - 10} more")

def browse_ratings():
    print_section("RATINGS")
    ratings = Ratings.objects.all().order_by('-created_at')
    print(f"Total Ratings: {ratings.count()}")
    for rating in ratings[:10]:
        print(f"  ⭐ {rating.score}/5 | From: {rating.rater.phone_number} → To: {rating.rated.phone_number} | Mission: {rating.mission.mission_id}")
    if ratings.count() > 10:
        print(f"  ... and {ratings.count() - 10} more")

def browse_reports():
    print_section("REPORTS")
    reports = Report.objects.all().order_by('-created_at')
    print(f"Total Reports: {reports.count()}")
    for report in reports[:10]:
        print(f"  📋 {report.subject}")
        print(f"    From: {report.reporter.phone_number} → To: {report.reported.phone_number}")
        print(f"    Mission: {report.mission.mission_id} | Reviewed: {report.reviewed}")
        print()
    if reports.count() > 10:
        print(f"  ... and {reports.count() - 10} more")

def browse_fraud():
    print_section("FRAUD RECORDS")
    frauds = Fraud.objects.all().order_by('-created_at')
    print(f"Total Fraud Records: {frauds.count()}")
    for fraud in frauds[:10]:
        print(f"  ⚠️  Mission: {fraud.mission.mission_id}")
        print(f"    Client: {fraud.client.phone_number} | Server: {fraud.server.phone_number}")
        print(f"    Alerts: {len(fraud.alerts)} | Viewed: {fraud.viewed}")
        print()
    if frauds.count() > 10:
        print(f"  ... and {frauds.count() - 10} more")

def browse_upgrade_requests():
    print_section("SERVER UPGRADE REQUESTS")
    requests = ServerUpgradeRequest.objects.all().order_by('-submitted_at')
    print(f"Total Requests: {requests.count()}")
    for req in requests[:10]:
        status = "✅ Approved" if req.approved else "❌ Rejected" if req.reviewed else "⏳ Pending"
        print(f"  {status} | User: {req.user.phone_number} | Submitted: {req.submitted_at}")
    if requests.count() > 10:
        print(f"  ... and {requests.count() - 10} more")

def main():
    print("\n" + "="*60)
    print("  JIBNI DATABASE BROWSER")
    print("="*60)
    
    browse_users()
    browse_profiles()
    browse_missions()
    browse_ratings()
    browse_reports()
    browse_fraud()
    browse_upgrade_requests()
    
    print("\n" + "="*60)
    print("  Browse Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
