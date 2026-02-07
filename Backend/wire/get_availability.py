# Add this endpoint to get current availability without toggling
# This can be added to wire/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_availability(request):
    """Get current availability status without toggling"""
    user = request.user
    profile = user.profile
    return Response({
        "status": "success",
        "open_to_work": profile.open_to_work,
        "role": profile.role,
    })
