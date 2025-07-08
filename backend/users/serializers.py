# File: backend/users/serializers.py
# Enhanced serializers for comprehensive authentication
from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import EmailVerificationToken, PasswordResetToken, AuditLog
import re

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Enhanced user registration serializer with comprehensive validation
    """
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    confirmPassword = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    terms_accepted = serializers.BooleanField(write_only=True)
    marketing_emails = serializers.BooleanField(default=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirmPassword',
            'first_name', 'last_name', 'phone_number',
            'account_type', 'terms_accepted', 'marketing_emails'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'username': {'required': True},
        }

    def validate_email(self, value):
        """Enhanced email validation"""
        value = value.lower().strip()
        
        # Check if email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        # Basic email format validation (Django handles most of this)
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Please enter a valid email address.")
        
        # Block common disposable email domains
        disposable_domains = [
            '10minutemail.com', 'guerrillamail.com', 'tempmail.org',
            'mailinator.com', 'throwaway.email'
        ]
        domain = value.split('@')[1]
        if domain in disposable_domains:
            raise serializers.ValidationError("Disposable email addresses are not allowed.")
        
        return value

    def validate_username(self, value):
        """Enhanced username validation"""
        value = value.strip()
        
        # Check length
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        if len(value) > 30:
            raise serializers.ValidationError("Username must be less than 30 characters.")
        
        # Check format
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, and underscores."
            )
        
        # Check if username already exists
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        
        # Block reserved usernames
        reserved_usernames = [
            'admin', 'administrator', 'root', 'support', 'help',
            'api', 'www', 'mail', 'ftp', 'blog', 'about'
        ]
        if value.lower() in reserved_usernames:
            raise serializers.ValidationError("This username is reserved.")
        
        return value

    def validate_phone_number(self, value):
        """Enhanced phone number validation"""
        if not value:
            return value
        
        # Remove all non-digit characters
        cleaned = re.sub(r'\D', '', value)
        
        # Check length
        if len(cleaned) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        
        if len(cleaned) > 15:
            raise serializers.ValidationError("Phone number must be less than 15 digits.")
        
        # Format as +1XXXXXXXXXX for US numbers
        if len(cleaned) == 10:
            cleaned = f"+1{cleaned}"
        elif len(cleaned) == 11 and cleaned.startswith('1'):
            cleaned = f"+{cleaned}"
        elif not cleaned.startswith('+'):
            cleaned = f"+{cleaned}"
        
        return cleaned

    def validate_terms_accepted(self, value):
        """Validate terms acceptance"""
        if not value:
            raise serializers.ValidationError("You must accept the terms and conditions.")
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        # Password confirmation
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({
                'confirmPassword': "Password confirmation doesn't match."
            })
        
        # Remove confirmPassword from validated data
        attrs.pop('confirmPassword')
        
        return attrs

    def create(self, validated_data):
        """Create user with enhanced features"""
        # Remove non-model fields
        terms_accepted = validated_data.pop('terms_accepted')
        marketing_emails = validated_data.pop('marketing_emails', False)
        
        # Create user
        user = User.objects.create_user(
            **validated_data,
            marketing_emails=marketing_emails,
            is_active=True,  # User can login but email needs verification
        )
        
        # Create email verification token
        EmailVerificationToken.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Enhanced login serializer with security features
    """
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    remember_me = serializers.BooleanField(default=False)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Find user by email
            try:
                user = User.objects.get(email=email.lower())
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'email': 'No account found with this email address.'
                })

            # Check if account is locked
            if user.is_account_locked:
                raise serializers.ValidationError({
                    'non_field_errors': f'Account is locked until {user.account_locked_until}. Please try again later.'
                })

            # Check if account is active
            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': 'This account has been deactivated.'
                })

            # Authenticate user
            user = authenticate(username=user.username, password=password)
            
            if user:
                # Reset failed login attempts on successful authentication
                user.reset_failed_login()
                attrs['user'] = user
            else:
                # Increment failed login attempts
                try:
                    failed_user = User.objects.get(email=email.lower())
                    failed_user.increment_failed_login()
                except User.DoesNotExist:
                    pass
                
                raise serializers.ValidationError({
                    'password': 'Invalid password.'
                })
        else:
            raise serializers.ValidationError({
                'non_field_errors': 'Must include email and password.'
            })

        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request password reset"""
    email = serializers.EmailField()

    def validate_email(self, value):
        """Check if user exists"""
        try:
            user = User.objects.get(email=value.lower())
            if not user.is_active:
                raise serializers.ValidationError("This account is not active.")
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            pass
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm password reset with token"""
    token = serializers.UUIDField()
    password = serializers.CharField(validators=[validate_password])
    confirmPassword = serializers.CharField()

    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({
                'confirmPassword': "Password confirmation doesn't match."
            })
        
        # Validate token
        try:
            reset_token = PasswordResetToken.objects.get(token=attrs['token'])
            if not reset_token.is_valid:
                raise serializers.ValidationError({
                    'token': 'Invalid or expired reset token.'
                })
            attrs['reset_token'] = reset_token
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                'token': 'Invalid reset token.'
            })
        
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Email verification"""
    token = serializers.UUIDField()

    def validate_token(self, value):
        try:
            verification_token = EmailVerificationToken.objects.get(token=value)
            if not verification_token.is_valid:
                raise serializers.ValidationError("Invalid or expired verification token.")
            return verification_token
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token.")


class PasswordChangeSerializer(serializers.Serializer):
    """Change password for authenticated users"""
    current_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    confirm_password = serializers.CharField()

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Password confirmation doesn't match."
            })
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer for updates"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'phone_number', 'account_type',
            'email_verified', 'phone_verified', 'profile_completed',
            'marketing_emails', 'notifications_enabled',
            'created_at', 'last_activity'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'email_verified', 'phone_verified',
            'profile_completed', 'created_at', 'last_activity'
        ]

    def validate_phone_number(self, value):
        """Validate phone number format"""
        if not value:
            return value
        
        # Remove all non-digit characters
        cleaned = re.sub(r'\D', '', value)
        
        # Check length
        if len(cleaned) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        
        # Format as +1XXXXXXXXXX for US numbers
        if len(cleaned) == 10:
            cleaned = f"+1{cleaned}"
        elif len(cleaned) == 11 and cleaned.startswith('1'):
            cleaned = f"+{cleaned}"
        elif not cleaned.startswith('+'):
            cleaned = f"+{cleaned}"
        
        return cleaned


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user lists (admin use)"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'account_type',
            'email_verified', 'is_active', 'created_at', 'last_activity'
        ]