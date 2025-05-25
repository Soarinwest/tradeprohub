# File: backend/profiles/serializers.py
# --------------------------------------
from rest_framework import serializers
from .models import BusinessProfile, GalleryImage

class GalleryImageSerializer(serializers.ModelSerializer):
    """Serializer for gallery images"""
    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'caption', 'uploaded_at']

class BusinessProfileSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for business profiles
    Handles nested data structures for location, pricing, media, and availability
    """
    gallery = GalleryImageSerializer(many=True, read_only=True)
    
    # Nested serializers for complex data structures
    business_info = serializers.SerializerMethodField()
    location_info = serializers.SerializerMethodField()
    pricing_info = serializers.SerializerMethodField()
    media_info = serializers.SerializerMethodField()
    availability_info = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProfile
        fields = [
            'id', 'user', 'is_complete', 'created_at', 'updated_at',
            'business_info', 'location_info', 'pricing_info', 
            'media_info', 'availability_info', 'gallery',
            # Individual fields for direct access
            'business_name', 'business_phone', 'business_email', 'logo',
            'address_line1', 'address_line2', 'city', 'state', 'zip_code', 
            'country', 'latitude', 'longitude', 'service_radius',
            'pricing_mode', 'hourly_rate', 'minimum_charge', 'quote_packages',
            'certifications', 'profile_photo', 'gallery_images',
            'availability_schedule'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_business_info(self, obj):
        """Get structured business information"""
        return {
            'name': obj.business_name,
            'phone': obj.business_phone,
            'email': obj.business_email,
            'logo': obj.logo.url if obj.logo else None
        }

    def get_location_info(self, obj):
        """Get structured location information"""
        return {
            'address_line1': obj.address_line1,
            'address_line2': obj.address_line2,
            'city': obj.city,
            'state': obj.state,
            'zip_code': obj.zip_code,
            'country': obj.country,
            'latitude': float(obj.latitude) if obj.latitude else None,
            'longitude': float(obj.longitude) if obj.longitude else None,
            'service_radius': obj.service_radius
        }

    def get_pricing_info(self, obj):
        """Get structured pricing information"""
        return {
            'mode': obj.pricing_mode,
            'hourly_rate': float(obj.hourly_rate) if obj.hourly_rate else None,
            'minimum_charge': float(obj.minimum_charge) if obj.minimum_charge else None,
            'quote_packages': obj.quote_packages
        }

    def get_media_info(self, obj):
        """Get structured media information"""
        return {
            'certifications': obj.certifications,
            'profile_photo': obj.profile_photo.url if obj.profile_photo else None,
            'gallery_images': obj.gallery_images
        }

    def get_availability_info(self, obj):
        """Get structured availability information"""
        return obj.availability_schedule

    def validate_business_phone(self, value):
        """Validate phone number format"""
        import re
        phone_pattern = r'^\+?1?[-.\s]?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$'
        if not re.match(phone_pattern, value.replace(' ', '')):
            raise serializers.ValidationError("Invalid phone number format")
        return value

    def validate_quote_packages(self, value):
        """Validate quote packages structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Quote packages must be a list")
        
        for package in value:
            if not isinstance(package, dict):
                raise serializers.ValidationError("Each package must be an object")
            
            required_fields = ['name', 'description', 'price']
            for field in required_fields:
                if field not in package:
                    raise serializers.ValidationError(f"Package missing required field: {field}")
        
        return value

    def validate_availability_schedule(self, value):
        """Validate availability schedule structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Availability schedule must be an object")
        
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for day, schedule in value.items():
            if day not in valid_days:
                raise serializers.ValidationError(f"Invalid day: {day}")
            
            if not isinstance(schedule, dict):
                raise serializers.ValidationError(f"Schedule for {day} must be an object")
            
            if 'enabled' not in schedule:
                raise serializers.ValidationError(f"Schedule for {day} missing 'enabled' field")
        
        return value

    def create(self, validated_data):
        """Create business profile with current user"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update business profile"""
        # Handle nested updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance