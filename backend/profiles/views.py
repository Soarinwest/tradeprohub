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
    GET  /api/my-profile/    → fetch own profile
    PUT  /api/my-profile/    → update own profile
    PATCH/… same
    """
    queryset = TradespersonProfile.objects.all()
    serializer_class = TradespersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Provide DRF a queryset so get_queryset() no longer breaks


def get_object(self):
# If no profile exists, return 404 instead of crashing
    try:
        return self.request.user.tradespersonprofile
    except TradespersonProfile.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound(detail="No profile found for this user.")