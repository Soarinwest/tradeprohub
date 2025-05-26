# File: backend/users/views.py
# ----------------------------
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from .serializers import UserRegistrationSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    POST /api/register/
    Creates new user account for tradespeople
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'User registered successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': 'Registration failed', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )