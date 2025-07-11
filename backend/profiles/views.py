from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import BusinessProfile, GalleryImage, ServicePackage
from .serializers import (
    BusinessProfileSerializer, 
    BusinessProfileCreateSerializer,
    BusinessProfileUpdateSerializer,
    GalleryImageSerializer
)

class BusinessProfileViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for managing business profiles
    """
    serializer_class = BusinessProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessProfile.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return BusinessProfileCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BusinessProfileUpdateSerializer
        return BusinessProfileSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Enhanced create with better error handling"""
        # Check if user already has a profile
        existing_profile = BusinessProfile.objects.filter(user=request.user).first()
        if existing_profile:
            return Response({
                'error': 'Profile already exists',
                'profile_id': existing_profile.id,
                'message': 'Use PUT to update existing profile'
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Enhanced update with partial support"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return Response({
                'error': 'Update failed',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='me')
    def get_my_profile(self, request):
        """Get the current user's profile"""
        try:
            profile = BusinessProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except BusinessProfile.DoesNotExist:
            return Response({
                'error': 'Profile not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['put', 'patch'], url_path='me')
    def update_my_profile(self, request):
        """Update the current user's profile"""
        try:
            profile = BusinessProfile.objects.get(user=request.user)
            partial = request.method == 'PATCH'
            serializer = BusinessProfileUpdateSerializer(
                profile, 
                data=request.data, 
                partial=partial,
                context={'request': request}
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response({
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except BusinessProfile.DoesNotExist:
            # Create new profile if it doesn't exist
            serializer = BusinessProfileCreateSerializer(
                data=request.data,
                context={'request': request}
            )
            
            if serializer.is_valid():
                profile = serializer.save()
                response_serializer = BusinessProfileSerializer(profile)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Creation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='upload-images')
    def upload_images(self, request, pk=None):
        """Upload gallery images for a profile"""
        profile = self.get_object()
        
        uploaded_files = request.FILES.getlist('images')
        if not uploaded_files:
            return Response({
                'error': 'No images provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        created_images = []
        for image_file in uploaded_files:
            gallery_image = GalleryImage.objects.create(
                profile=profile,
                image=image_file,
                caption=request.data.get('caption', '')
            )
            created_images.append(GalleryImageSerializer(gallery_image).data)

        return Response({
            'message': f'Uploaded {len(created_images)} images',
            'images': created_images
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        """Delete a specific gallery image"""
        profile = self.get_object()
        
        try:
            image = GalleryImage.objects.get(id=image_id, profile=profile)
            image.delete()
            return Response({
                'message': 'Image deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except GalleryImage.DoesNotExist:
            return Response({
                'error': 'Image not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='completion-status')
    def completion_status(self, request, pk=None):
        """Get profile completion status"""
        profile = self.get_object()
        
        return Response({
            'is_complete': profile.is_complete,
            'completion_percentage': profile.completion_percentage,
            'missing_fields': self._get_missing_fields(profile)
        })

    def _get_missing_fields(self, profile):
        """Get list of missing required fields"""
        missing = []
        
        required_fields = {
            'business_name': 'Business Name',
            'business_phone': 'Business Phone',
            'business_email': 'Business Email',
            'address_line1': 'Street Address',
            'city': 'City',
            'state': 'State',
            'zip_code': 'ZIP Code',
            'service_radius': 'Service Radius',
            'pricing_mode': 'Pricing Mode',
        }
        
        for field, label in required_fields.items():
            if not getattr(profile, field):
                missing.append(label)
        
        # Check pricing-specific requirements
        if profile.pricing_mode == 'hourly' and not profile.hourly_rate:
            missing.append('Hourly Rate')
        elif profile.pricing_mode == 'quoted' and not profile.quote_packages:
            missing.append('Quote Packages')
            
        return missing