# backend/profiles/views.py
from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from .models import EmployeeProfile
from .serializers import (
    EmployeeProfileSerializer,
    RegisterSerializer,
    BusinessSerializer,
    LocationSerializer
)

class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/
    """
    # No authentication checks here
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

# Token endpoints are included via URL patterns

# Create EmployeeProfile (and nested Business)
class EmployeeProfileCreateView(generics.CreateAPIView):
    """
    POST /api/employee-profile/ -> create Business + EmployeeProfile for the authenticated user
    """
    serializer_class = EmployeeProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

# Retrieve or update own EmployeeProfile
class EmployeeProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/my-employee-profile/ -> returns logged-in user's EmployeeProfile
    PUT  /api/my-employee-profile/ -> updates logged-in user's EmployeeProfile
    """
    serializer_class = EmployeeProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.employee_profile
        except EmployeeProfile.DoesNotExist:
            raise NotFound(detail="No profile found for this user.")
