import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { mediaStepSchema } from '../../utils/validation';

/**
 * MediaStep - Profile photos, certifications, and gallery management
 * Handles image uploads and certification information
 */
const MediaStep = ({ data, updateData, onNext, onPrev }) => {
  const [profilePreview, setProfilePreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(mediaStepSchema),
    defaultValues: {
      certifications: data.media.certifications || '',
      profile_photo: null,
      gallery_images: [],
    },
  });

  const watchedCertifications = watch('certifications');

  // Handle profile photo upload
  const handleProfilePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('profile_photo', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle gallery images upload
  const handleGalleryImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const currentImages = galleryPreviews.length;
      const remainingSlots = 10 - currentImages;
      const filesToAdd = files.slice(0, remainingSlots);

      setValue('gallery_images', [...(watch('gallery_images') || []), ...filesToAdd]);

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreviews((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        const currentImages = galleryPreviews.length;
        const remainingSlots = 10 - currentImages;
        const filesToAdd = imageFiles.slice(0, remainingSlots);

        setValue('gallery_images', [...(watch('gallery_images') || []), ...filesToAdd]);

        filesToAdd.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setGalleryPreviews((prev) => [...prev, reader.result]);
          };
          reader.readAsDataURL(file);
        });
      }
    }
  };

  // Remove gallery image
  const removeGalleryImage = (index) => {
    const newImages = [...(watch('gallery_images') || [])];
    newImages.splice(index, 1);
    setValue('gallery_images', newImages);

    const newPreviews = [...galleryPreviews];
    newPreviews.splice(index, 1);
    setGalleryPreviews(newPreviews);
  };

  const onSubmit = (formData) => {
    updateData('media', formData);
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Media & Certifications
        </h2>
        <p className="text-secondary-600">
          Showcase your expertise with photos of your work and list your professional certifications.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Profile Photo Section */}
        <div className="bg-secondary-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Profile Photo
          </h3>
          
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {profilePreview ? (
                <div className="relative">
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-lg object-cover border-2 border-secondary-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePreview(null);
                      setValue('profile_photo', null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 bg-secondary-200 rounded-lg flex items-center justify-center">
                  <svg className="w-12 h-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex-grow">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Upload Profile Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePhoto}
                className="block w-full text-sm text-secondary-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
              />
              {errors.profile_photo && (
                <p className="text-red-600 text-sm mt-1">{errors.profile_photo.message}</p>
              )}
              <p className="text-sm text-secondary-600 mt-2">
                Your professional photo helps build trust with customers. Use a clear, friendly headshot.
              </p>
            </div>
          </div>
        </div>

        {/* Certifications Section */}
        <div className="bg-secondary-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Certifications & Licenses
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              List Your Professional Certifications
            </label>
            <textarea
              {...register('certifications')}
              rows="4"
              className={`input-field ${errors.certifications ? 'border-red-500' : ''}`}
              placeholder="e.g., Licensed Master Electrician&#10;EPA Certified&#10;OSHA 30-Hour Construction Safety&#10;State Contractor License #12345"
            />
            {errors.certifications && (
              <p className="text-red-600 text-sm mt-1">{errors.certifications.message}</p>
            )}
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-secondary-600">
                Include licenses, certifications, and special training
              </p>
              <span className="text-sm text-secondary-500">
                {watchedCertifications.length}/2000 characters
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
            <div className="flex">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800">Build Trust</h4>
                <p className="text-sm text-green-700 mt-1">
                  Displaying certifications helps customers trust your expertise and professionalism.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="bg-secondary-50 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">
              Work Gallery
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              Show off your best work! Upload up to 10 photos ({galleryPreviews.length}/10 used)
            </p>
          </div>

          {/* Gallery Grid */}
          {galleryPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {galleryPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-secondary-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drag and Drop Upload Area */}
          {galleryPreviews.length < 10 && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-secondary-300 hover:border-secondary-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <svg className="w-12 h-12 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <p className="text-lg font-medium text-secondary-900 mb-2">
                Drop photos here or click to upload
              </p>
              <p className="text-sm text-secondary-600 mb-4">
                PNG, JPG, GIF, WEBP up to 5MB each
              </p>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImages}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <button
                type="button"
                className="btn-primary"
                onClick={() => document.querySelector('input[type="file"][multiple]').click()}
              >
                Choose Files
              </button>
            </div>
          )}

          {errors.gallery_images && (
            <p className="text-red-600 text-sm mt-2">{errors.gallery_images.message}</p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onPrev}
            className="btn-secondary"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            Next: Availability →
          </button>
        </div>
      </form>
    </div>
  );
};

export default MediaStep;