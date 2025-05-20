# backend/profiles/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Business, Location, EmployeeProfile

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'latitude', 'longitude']

class BusinessSerializer(serializers.ModelSerializer):
    locations = LocationSerializer(many=True, required=False)

    class Meta:
        model = Business
        fields = ['id', 'name', 'logo', 'phone', 'email', 'locations']

    def create(self, validated_data):
        locations_data = validated_data.pop('locations', [])
        business = Business.objects.create(**validated_data)
        for loc in locations_data:
            Location.objects.create(business=business, **loc)
        return business

    def update(self, instance, validated_data):
        locations_data = validated_data.pop('locations', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if locations_data is not None:
            # simple replace strategy: clear and recreate
            instance.locations.all().delete()
            for loc in locations_data:
                Location.objects.create(business=instance, **loc)
        return instance

class EmployeeProfileSerializer(serializers.ModelSerializer):
    business = BusinessSerializer()

    class Meta:
        model = EmployeeProfile
        fields = ['id', 'services_offered', 'hourly_rate', 'certifications', 'profile_photo', 'business']
        read_only_fields = ['id']

    def create(self, validated_data):
        business_data = validated_data.pop('business')
        business = BusinessSerializer().create(business_data)
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
