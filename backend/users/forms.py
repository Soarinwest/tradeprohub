# File: backend/users/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from allauth.account.forms import SignupForm
from phonenumber_field.formfields import PhoneNumberField
from .models import User


class CustomUserCreationForm(UserCreationForm):
    """
    Form for creating new users in the admin
    """
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number')


class CustomUserChangeForm(UserChangeForm):
    """
    Form for updating users in the admin
    """
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number', 
                 'is_active', 'is_staff', 'is_superuser', 'groups', 
                 'user_permissions')


class CustomSignupForm(SignupForm):
    """
    Custom signup form with additional fields
    """
    first_name = forms.CharField(
        max_length=30,
        label='First Name',
        widget=forms.TextInput(attrs={
            'placeholder': 'First Name',
            'class': 'form-control'
        })
    )
    
    last_name = forms.CharField(
        max_length=30,
        label='Last Name',
        widget=forms.TextInput(attrs={
            'placeholder': 'Last Name',
            'class': 'form-control'
        })
    )
    
    phone_number = PhoneNumberField(
        required=False,
        label='Phone Number',
        widget=forms.TextInput(attrs={
            'placeholder': 'Phone Number (optional)',
            'class': 'form-control'
        })
    )
    
    terms_accepted = forms.BooleanField(
        required=True,
        label='I agree to the Terms of Service and Privacy Policy',
        error_messages={
            'required': 'You must agree to the terms to register.'
        }
    )
    
    marketing_consent = forms.BooleanField(
        required=False,
        label='I would like to receive marketing emails about TradeProHub services',
        initial=False
    )
    
    field_order = ['first_name', 'last_name', 'email', 'phone_number', 
                   'password1', 'password2', 'terms_accepted', 'marketing_consent']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Update field attributes
        self.fields['email'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Email Address'
        })
        
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Password'
        })
        
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm Password'
        })
    
    def save(self, request):
        user = super().save(request)
        
        # Save additional fields
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        user.phone_number = self.cleaned_data.get('phone_number', '')
        
        # Save marketing consent (you might want to create a separate model for this)
        # For now, we'll store it in the user's profile when it's created
        
        user.save()
        return user
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            email = email.lower()
        return email


class PhoneVerificationForm(forms.Form):
    """
    Form for phone number verification
    """
    verification_code = forms.CharField(
        max_length=6,
        label='Verification Code',
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter 6-digit code'
        })
    )


class ProfileCompletionForm(forms.ModelForm):
    """
    Form for completing user profile information
    """
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control'}),
        }