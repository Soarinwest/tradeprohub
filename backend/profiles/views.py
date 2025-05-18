from rest_framework import generics, permissions
from .models import TradespersonProfile
from .serializers import TradespersonProfileSerializer
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework.serializers import ModelSerializer
from rest_framework import status



class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = TradespersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.tradespersonprofile
    

class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]