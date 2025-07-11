# --------------------------------------
from rest_framework import serializers
from .models import BusinessProfile, GalleryImage, ServicePackage

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'caption', 'order', 'created_at']

class ServicePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePackage
        fields = ['id', 'name', 'description', 'price', 'duration', 'is_active']

class BusinessProfileSerializer(serializers.ModelSerializer):
    gallery_images = GalleryImageSerializer(many=True, read_only=True)
    service_packages = ServicePackageSerializer(many=True, read_only=True)
    completion_percentage = serializers.ReadOnlyField()
    
    # File upload fields
    business_logo = serializers.ImageField(required=False, allow_null=True)
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = BusinessProfile
        fields = [
            'id',
            # Basic business info
            'business_name', 'business_phone', 'business_email', 'business_logo',
            # Address
            'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'latitude', 'longitude',
            # Service area
            'service_area_type', 'service_radius', 'willing_to_travel_outside',
            # Pricing
            'pricing_mode', 'hourly_rate', 'minimum_charge', 'quote_packages',
            # Media
            'certifications', 'profile_photo',
            # Availability
            'availability_schedule', 'available_immediately', 'start_date',
            # Status
            'is_complete', 'is_active', 'completion_percentage',
            # Relationships
            'gallery_images', 'service_packages',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'is_complete', 'completion_percentage', 'created_at', 'updated_at']

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
            
            try:
                float(package['price'])
            except (ValueError, TypeError):
                raise serializers.ValidationError("Package price must be a valid number")
        
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
                continue
            
            if 'enabled' in schedule and schedule['enabled']:
                if 'start_time' not in schedule or 'end_time' not in schedule:
                    raise serializers.ValidationError(f"Enabled day {day} must have start_time and end_time")
        
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        pricing_mode = attrs.get('pricing_mode')
        
        # Validate pricing requirements based on mode
        if pricing_mode == 'hourly':
            if not attrs.get('hourly_rate'):
                raise serializers.ValidationError({
                    'hourly_rate': 'Hourly rate is required for hourly pricing mode'
                })
        elif pricing_mode == 'quoted':
            if not attrs.get('quote_packages'):
                raise serializers.ValidationError({
                    'quote_packages': 'Quote packages are required for quoted pricing mode'
                })
        
        return attrs


class BusinessProfileCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for profile creation"""
    
    class Meta:
        model = BusinessProfile
        fields = [
            'business_name', 'business_phone', 'business_email',
            'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'service_radius'
        ]

    def create(self, validated_data):
        """Create profile with user from request"""
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)


class BusinessProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for profile updates with file handling"""
    
    # Handle file uploads separately
    uploaded_gallery_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = BusinessProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Handle gallery images if provided
        gallery_images = validated_data.pop('uploaded_gallery_images', [])
        
        # Update the profile
        profile = super().update(instance, validated_data)
        
        # Add new gallery images
        for image in gallery_images:
            GalleryImage.objects.create(
                profile=profile,
                image=image
            )
        
        return profile


class BusinessProfileListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    
    class Meta:
        model = BusinessProfile
        fields = [
            'id', 'business_name', 'business_phone', 'business_email',
            'city', 'state', 'service_radius', 'pricing_mode',
            'is_complete', 'completion_percentage', 'created_at'
        ]