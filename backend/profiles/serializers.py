# backend/profiles/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Business, Location, EmployeeProfile

class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'logo', 'phone', 'email']

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'latitude', 'longitude']

class EmployeeProfileSerializer(serializers.ModelSerializer):
    business = BusinessSerializer()

    class Meta:
        model = EmployeeProfile
        fields = ['id', 'user', 'business', 'services_offered', 'hourly_rate', 'certifications', 'profile_photo']
        read_only_fields = ['user']

    def create(self, validated_data):
        business_data = validated_data.pop('business')
        business = Business.objects.create(**business_data)
        user = self.context['request'].user
        profile = EmployeeProfile.objects.create(user=user, business=business, **validated_data)
        return profile

    def update(self, instance, validated_data):
        business_data = validated_data.pop('business', None)
        if business_data:
            BusinessSerializer().update(instance.business, business_data)
        return super().update(instance, validated_data)

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)