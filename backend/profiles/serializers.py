# File: backend/profiles/serializers.py
# --------------------------------------
from rest_framework import serializers
from .models import BusinessProfile, GalleryImage

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'caption', 'created_at']

class BusinessProfileSerializer(serializers.ModelSerializer):
    gallery_images = GalleryImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = BusinessProfile
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']