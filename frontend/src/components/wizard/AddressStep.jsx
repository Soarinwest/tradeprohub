import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { addressStepSchema } from '../../utils/validation';

/**
 * AddressStep - Collects and confirms business address
 */
const AddressStep = ({ data, updateData, onNext, onPrev }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const [mapboxgl, setMapboxgl] = useState(null);
  const mapContainer = useRef(null);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(addressStepSchema),
    defaultValues: {
      address_line1: data.address?.address_line1 || '',
      address_line2: data.address?.address_line2 || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      zip_code: data.address?.zip_code || '',
      latitude: data.address?.latitude || null,
      longitude: data.address?.longitude || null,
    },
  });

  const watchedAddress = watch(['address_line1', 'city', 'state', 'zip_code']);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    let map;
    let mapboxglInstance;

    const initMap = async () => {
      try {
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        const mapboxglModule = await import('mapbox-gl');
        mapboxglInstance = mapboxglModule.default;
        setMapboxgl(mapboxglInstance);

        mapboxglInstance.accessToken = MAPBOX_TOKEN;

        await new Promise(resolve => setTimeout(resolve, 100));

        map = new mapboxglInstance.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: data.address?.longitude && data.address?.latitude 
            ? [data.address.longitude, data.address.latitude]
            : [-98.5795, 39.8283],
          zoom: data.address?.longitude && data.address?.latitude ? 14 : 4,
        });

        map.on('load', () => {
          setMapInstance(map);

          if (data.address?.latitude && data.address?.longitude) {
            const coords = [data.address.longitude, data.address.latitude];
            addMarker(map, coords, mapboxglInstance);
          }
        });

        map.on('click', (e) => {
          const coords = [e.lngLat.lng, e.lngLat.lat];
          setValue('latitude', e.lngLat.lat);
          setValue('longitude', e.lngLat.lng);
          addMarker(map, coords, mapboxglInstance);
          reverseGeocode(e.lngLat.lng, e.lngLat.lat);
        });

      } catch (error) {
        console.error('Error initializing address map:', error);
      }
    };

    initMap();

    return () => {
      if (marker) marker.remove();
      if (mapInstance) mapInstance.remove();
      if (mapContainer.current) mapContainer.current.innerHTML = '';
    };
  }, [MAPBOX_TOKEN]);

  // Geocode address when it changes
  useEffect(() => {
    const [address1, city, state, zip] = watchedAddress;
    if (address1 && city && state && MAPBOX_TOKEN) {
      const fullAddress = `${address1}, ${city}, ${state} ${zip}`;
      geocodeAddress(fullAddress);
    }
  }, [watchedAddress, MAPBOX_TOKEN]);

  const addMarker = (map, coords, mapboxglInstance) => {
    if (marker) marker.remove();
    
    const newMarker = new mapboxglInstance.Marker({ 
      color: '#3b82f6',
      scale: 1.2
    })
      .setLngLat(coords)
      .addTo(map);
    setMarker(newMarker);
  };

  const geocodeAddress = async (address) => {
    if (!MAPBOX_TOKEN || !mapInstance || !mapboxgl) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=US`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setValue('latitude', lat);
        setValue('longitude', lng);

        mapInstance.setCenter([lng, lat]);
        mapInstance.setZoom(14);
        addMarker(mapInstance, [lng, lat], mapboxgl);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const reverseGeocode = async (lng, lat) => {
    if (!MAPBOX_TOKEN) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const addressComponents = place.context || [];
        
        let postcode = place.properties?.short_code || '';
        let locality = '';
        let region = '';

        addressComponents.forEach(component => {
          if (component.id.includes('postcode')) {
            postcode = component.text;
          } else if (component.id.includes('place')) {
            locality = component.text;
          } else if (component.id.includes('region')) {
            region = component.short_code || component.text;
          }
        });

        setValue('address_line1', place.place_name.split(',')[0]);
        setValue('city', locality);
        setValue('state', region);
        setValue('zip_code', postcode);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const onSubmit = (formData) => {
    console.log('Address form submitted:', formData);
    updateData('address', formData);
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Business Address
        </h2>
        <p className="text-secondary-600">
          Enter your business address and confirm the location on the map.
        </p>
      </div>

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
                <p className="text-red-600 text-sm mt-1">{errors.address_line1.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Apartment, Suite, etc.
              </label>
              <input
                {...register('address_line2')}
                className="input-field"
                placeholder="Apt 4B, Suite 200"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  City *
                </label>
                <input
                  {...register('city')}
                  className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                  placeholder="Your City"
                />
                {errors.city && (
                  <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  State *
                </label>
                <input
                  {...register('state')}
                  className={`input-field ${errors.state ? 'border-red-500' : ''}`}
                  placeholder="TX"
                  maxLength={2}
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.state && (
                  <p className="text-red-600 text-sm mt-1">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="md:w-1/2">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                ZIP Code *
              </label>
              <input
                {...register('zip_code')}
                className={`input-field ${errors.zip_code ? 'border-red-500' : ''}`}
                placeholder="75001"
              />
              {errors.zip_code && (
                <p className="text-red-600 text-sm mt-1">{errors.zip_code.message}</p>
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
                Next: Service Area →
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Confirm Location
            </h3>
            <p className="text-sm text-secondary-600">
              {MAPBOX_TOKEN ? 
                'Click on the map to adjust your exact location.' :
                'Enter your address to set your location. (Map preview requires Mapbox token)'
              }
            </p>
          </div>
          
          {MAPBOX_TOKEN ? (
            <div 
              ref={mapContainer}
              className="w-full h-96 rounded-lg border border-secondary-300"
              style={{ minHeight: '400px' }}
            />
          ) : (
            <div className="w-full h-96 bg-secondary-100 rounded-lg border border-secondary-300 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-secondary-600 font-medium">Map Preview</p>
                <p className="text-sm text-secondary-500">Enter your address to set location</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressStep;