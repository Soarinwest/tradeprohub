from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User

from .models import TradespersonProfile
from .serializers import TradespersonProfileSerializer

# ─── User Registration ───────────────────────────────────────────────────────

class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Uses Django's create_user to hash password
        return User.objects.create_user(**validated_data)

class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


# ─── Profile Creation ────────────────────────────────────────────────────────

class ProfileCreateView(generics.CreateAPIView):
    """
    POST /api/profile/
    Creates a blank profile for the logged-in user.
    """
    serializer_class = TradespersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'tradespersonprofile'):
            raise ValidationError("Profile already exists.")
        serializer.save(user=user)


# ─── Profile Retrieve/Update ─────────────────────────────────────────────────
class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/my-profile/ → retrieve your profile (404 if none)
    PUT  /api/my-profile/ → update your profile
    """
    queryset = TradespersonProfile.objects.all()
    serializer_class = TradespersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.tradespersonprofile
        except TradespersonProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(detail="No profile found for this user.")