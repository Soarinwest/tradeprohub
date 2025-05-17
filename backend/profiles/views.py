from rest_framework import generics, permissions
from .models import TradespersonProfile
from .serializers import TradespersonProfileSerializer

class ProfileDetail(generics.RetrieveUpdateAPIView):
    queryset = TradespersonProfile.objects.all()
    serializer_class = TradespersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated]