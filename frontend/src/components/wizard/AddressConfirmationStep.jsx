import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import mapboxgl from 'mapbox-gl';
import { addressConfirmationSchema } from '../../utils/validation';

const AddressConfirmationStep = ({ 
  initialData, 
  onConfirm, 
  onPrev, 
  mapboxToken 
}) => {
  const mapContainer = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(addressConfirmationSchema),
    defaultValues: initialData || {}
  });

  // Watch coordinates for debugging
  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');

  // Initialize map
  useEffect(() => {
    console.log('Map initialization with token:', !!mapboxToken);
    console.log('Initial data:', initialData);

    if (!mapboxToken || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialData?.longitude && initialData?.latitude 
        ? [initialData.longitude, initialData.latitude]
        : [-98.5795, 39.8283],
      zoom: initialData?.longitude ? 12 : 4
    });

    map.on('load', () => {
      console.log('Map loaded');
      setMapInstance(map);
      setIsMapLoaded(true);

      // Set initial marker if coordinates exist
      if (initialData?.latitude && initialData?.longitude) {
        console.log('Setting initial marker:', initialData.latitude, initialData.longitude);
        updateMarker([initialData.longitude, initialData.latitude]);
      }
    });

    // Add click handler
    map.on('click', (e) => {
      console.log('Map clicked:', e.lngLat);
      const coords = [e.lngLat.lng, e.lngLat.lat];
      setValue('latitude', e.lngLat.lat);
      setValue('longitude', e.lngLat.lng);
      updateMarker(coords);
      reverseGeocode(coords);
    });

    return () => {
      if (marker) marker.remove();
      map.remove();
    };
  }, [mapboxToken]);

  const updateMarker = (coords) => {
    console.log('Updating marker:', coords);
    if (!mapInstance) {
      console.log('Map instance not ready');
      return;
    }

    if (marker) {
      console.log('Removing existing marker');
      marker.remove();
    }

    const newMarker = new mapboxgl.Marker()
      .setLngLat(coords)
      .addTo(mapInstance);

    setMarker(newMarker);
    mapInstance.flyTo({
      center: coords,
      zoom: 14,
      duration: 1000
    });
  };

  const reverseGeocode = async (coords) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features?.length > 0) {
        const result = data.features[0];
        const address = parseMapboxAddress(result);
        
        Object.entries(address).forEach(([key, value]) => {
          setValue(key, value);
        });
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    }
  };

  const parseMapboxAddress = (feature) => {
    const components = {
      address_line1: '',
      city: '',
      state: '',
      zip_code: ''
    };

    feature.context?.forEach(item => {
      if (item.id.startsWith('postcode')) {
        components.zip_code = item.text;
      } else if (item.id.startsWith('place')) {
        components.city = item.text;
      } else if (item.id.startsWith('region')) {
        components.state = item.text;
      }
    });

    components.address_line1 = feature.address 
      ? `${feature.address} ${feature.text}`
      : feature.text;

    return components;
  };

  const onSubmit = (data) => {
    onConfirm(data);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Street Address *
            </label>
            <input
              {...register('address_line1')}
              className={`input-field ${errors.address_line1 ? 'border-red-500' : ''}`}
              placeholder="123 Main Street"
            />
            {errors.address_line1 && (
              <p className="mt-1 text-sm text-red-600">{errors.address_line1.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Address Line 2
            </label>
            <input
              {...register('address_line2')}
              className="input-field"
              placeholder="Suite, Unit, Building (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                City *
              </label>
              <input
                {...register('city')}
                className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                placeholder="City"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                State *
              </label>
              <input
                {...register('state')}
                className={`input-field ${errors.state ? 'border-red-500' : ''}`}
                placeholder="State"
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              ZIP Code *
            </label>
            <input
              {...register('zip_code')}
              className={`input-field ${errors.zip_code ? 'border-red-500' : ''}`}
              placeholder="12345"
            />
            {errors.zip_code && (
              <p className="mt-1 text-sm text-red-600">{errors.zip_code.message}</p>
            )}
          </div>

          {/* Hidden fields for coordinates */}
          <input type="hidden" {...register('latitude')} />
          <input type="hidden" {...register('longitude')} />

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
              Confirm Address →
            </button>
          </div>

          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2">
            <p>Lat: {watchedLat}</p>
            <p>Lng: {watchedLng}</p>
            <p>Map Loaded: {isMapLoaded ? 'Yes' : 'No'}</p>
          </div>
        </form>
      </div>

      <div>
        <div 
          ref={mapContainer}
          className="w-full h-[400px] rounded-lg border border-secondary-300"
          style={{ minHeight: '400px' }}
        />
        <p className="mt-2 text-sm text-secondary-600">
          Click on the map to set your business location
        </p>
      </div>
    </div>
  );
};

export default AddressConfirmationStep;