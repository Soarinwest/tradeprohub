from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import BusinessProfile
from .serializers import BusinessProfileSerializer

class BusinessProfileView(generics.RetrieveUpdateAPIView):
    """
    Business profile endpoint
    GET /api/profile/ - Get current user's business profile
    PUT /api/profile/ - Update current user's business profile
    """
    serializer_class = BusinessProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get or create business profile for current user"""
        profile, created = BusinessProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'business_name': '',
                'business_phone': '',
                'business_email': self.request.user.email,
                'address_line1': '',
                'city': '',
                'state': '',
                'zip_code': '',
            }
        )
        return profile

    def retrieve(self, request, *args, **kwargs):
        """Get business profile"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response({
                'success': True,
                'profile': serializer.data
            })
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """Update business profile"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            
            if serializer.is_valid():
                profile = serializer.save()
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'profile': serializer.data
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, *args, **kwargs):
        """Handle PUT requests (same as update)"""
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        """Handle PATCH requests (same as update)"""
        return self.update(request, *args, **kwargs)
        