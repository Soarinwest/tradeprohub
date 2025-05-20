# backend/profiles/views.py
from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from .models import EmployeeProfile
from .serializers import (
    EmployeeProfileSerializer,
    RegisterSerializer,
    TokenObtainPairView as ObtainToken,
    TokenRefreshView as RefreshToken
)

class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/ → create a new User
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

class EmployeeProfileCreateView(generics.CreateAPIView):
    """
    POST /api/employee-profile/ → create Business, Locations, and EmployeeProfile
    """
    serializer_class = EmployeeProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

class EmployeeProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/my-employee-profile/ → retrieve own profile
    PUT /api/my-employee-profile/ → update own profile
    """
    serializer_class = EmployeeProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.employee_profile
        except EmployeeProfile.DoesNotExist:
            raise NotFound(detail="No profile found for this user.")