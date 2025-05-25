import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { locationStepSchema } from '../../utils/validation';

/**
 * LocationStep - Service area and location wizard step
 * Collects address, coordinates, and service radius with Mapbox integration
 */
const LocationStep = ({ data, updateData, onNext, onPrev }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const [circle, setCircle] = useState(null);
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
    resolver: yupResolver(locationStepSchema),
    defaultValues: data.location,
  });

  const watchedRadius = watch('service_radius', 25);
  const watchedAddress = watch(['address_line1', 'city', 'state', 'zip_code']);

  // Initialize Mapbox
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not found. Map features will be limited.');
      return;
    }

    const initMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.default.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-98.5795, 39.8283], // Center of US
          zoom: 4,
        });

        map.on('load', () => {
          setMapInstance(map);
          
          // If we have existing coordinates, set them
          if (data.location.latitude && data.location.longitude) {
            const coords = [data.location.longitude, data.location.latitude];
            map.setCenter(coords);
            map.setZoom(12);
            addMarkerAndCircle(map, coords, data.location.service_radius || 25);
          }
        });

        // Click to set location
        map.on('click', (e) => {
          const coords = [e.lngLat.lng, e.lngLat.lat];
          setValue('latitude', e.lngLat.lat);
          setValue('longitude', e.lngLat.lng);
          addMarkerAndCircle(map, coords, watchedRadius);
          
          // Reverse geocode to fill address
          reverseGeocode(e.lngLat.lng, e.lngLat.lat);
        });

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [MAPBOX_TOKEN]);

  // Update circle when radius changes
  useEffect(() => {
    if (mapInstance && marker) {
      const coords = marker.getLngLat();
      updateCircle([coords.lng, coords.lat], watchedRadius);
    }
  }, [watchedRadius, mapInstance, marker]);

  // Geocode address when it changes
  useEffect(() => {
    const [address1, city, state, zip] = watchedAddress;
    if (address1 && city && state && MAPBOX_TOKEN) {
      const fullAddress = `${address1}, ${city}, ${state} ${zip}`;
      geocodeAddress(fullAddress);
    }
  }, [watchedAddress, MAPBOX_TOKEN]);

  const addMarkerAndCircle = (map, coords, radius) => {
    // Remove existing marker and circle
    if (marker) marker.remove();
    if (circle && map.getSource('circle')) {
      map.removeLayer('circle');
      map.removeSource('circle');
    }

    // Add new marker
    const mapboxgl = window.mapboxgl || require('mapbox-gl');
    const newMarker = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat(coords)
      .addTo(map);
    setMarker(newMarker);

    // Add service radius circle
    updateCircle(coords, radius);
  };

  const updateCircle = (coords, radius) => {
    if (!mapInstance) return;

    if (circle && mapInstance.getSource('circle')) {
      mapInstance.removeLayer('circle');
      mapInstance.removeSource('circle');
    }

    // Create circle polygon
    const radiusInKm = radius * 1.60934; // Convert miles to km
    const points = 64;
    const circleCoords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInKm * Math.cos(angle);
      const dy = radiusInKm * Math.sin(angle);
      
      const deltaLng = dx / (111.32 * Math.cos(coords[1] * Math.PI / 180));
      const deltaLat = dy / 110.54;
      
      circleCoords.push([
        coords[0] + deltaLng,
        coords[1] + deltaLat
      ]);
    }
    circleCoords.push(circleCoords[0]); // Close the polygon

    mapInstance.addSource('circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circleCoords]
        }
      }
    });

    mapInstance.addLayer({
      id: 'circle',
      type: 'fill',
      source: 'circle',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2
      }
    });

    setCircle(true);
  };

  const geocodeAddress = async (address) => {
    if (!MAPBOX_TOKEN) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=US`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setValue('latitude', lat);
        setValue('longitude', lng);

        if (mapInstance) {
          mapInstance.setCenter([lng, lat]);
          mapInstance.setZoom(12);
          addMarkerAndCircle(mapInstance, [lng, lat], watchedRadius);
        }
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
        
        // Extract address components
        let postcode = place.properties?.short_code;
        let locality = '';
        let region = '';

        addressComponents.forEach(component => {
          if (component.id.includes('postcode')) {
            postcode = component.text;
          } else if (component.id.includes('place')) {
            locality = component.text;
          } else if (component.id.includes('region')) {
            region = component.text;
          }
        });

        // Update form fields
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
    updateData('location', formData);
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Service Location & Coverage Area
        </h2>
        <p className="text-secondary-600">
          Tell us where you're based and how far you're willing to travel for jobs.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Address Form */}
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

            {/* Service Radius */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Service Radius: <span className="font-bold text-primary-600">{watchedRadius} miles</span>
              </label>
              <input
                {...register('service_radius')}
                type="range"
                min="1"
                max="100"
                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${watchedRadius}%, #e2e8f0 ${watchedRadius}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-secondary-500 mt-1">
                <span>1 mile</span>
                <span>100 miles</span>
              </div>
              <p className="text-sm text-secondary-600 mt-2">
                How far are you willing to travel for jobs?
              </p>
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
                Next: Pricing →
              </button>
            </div>
          </form>
        </div>

        {/* Map */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Service Area Map
            </h3>
            <p className="text-sm text-secondary-600">
              {MAPBOX_TOKEN ? 
                'Click on the map to set your exact location, or enter your address and we\'ll find it.' :
                'Enter your address to set your service location. (Map preview requires Mapbox token)'
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

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default LocationStep;