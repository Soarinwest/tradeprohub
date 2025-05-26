import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { locationStepSchema } from '../../utils/validation';
import api from '../../services/api';
import { profileService } from '../../services/profileService';

/**
 * LocationStep - Two-phase location wizard: Address confirmation + Service area selection
 */
const LocationStep = ({ data, updateData, onNext, onPrev }) => {
  const [currentPhase, setCurrentPhase] = useState('address');
  const [confirmedAddress, setConfirmedAddress] = useState(data?.location || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Log state changes
    console.log('LocationStep state updated:', {
      currentPhase,
      confirmedAddress,
      error
    });
  }, [currentPhase, confirmedAddress, error]);


  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(locationStepSchema),
    defaultValues: {
      ...data.location,
      service_area_type: data.location?.service_area_type || 'radius',
      willing_to_travel_outside: data.location?.willing_to_travel_outside || false,
    },
  });

  const watchedAddressLine1 = watch('address_line1');
  const watchedCity = watch('city');
  const watchedState = watch('state');
  const watchedZipCode = watch('zip_code');
  const watchedServiceAreaType = watch('service_area_type', 'radius');

  const onConfirmAddress = async (formData) => {
    try {
      console.log('Form data received:', formData); // Debug log

      // Make sure we have the required location data
      if (!formData.latitude || !formData.longitude) {
        throw new Error('Please select a location on the map');
      }

      // Create a cleaned data object
      const locationData = {
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || '',
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      console.log('Attempting to confirm location with:', locationData); // Debug log

      // For now, let's bypass the API call and just set the confirmed address
      setConfirmedAddress(locationData);
      setCurrentPhase('service_area');

      /* Comment out the API call for now
      const confirmedData = await confirmLocation(formData);
      setConfirmedAddress(confirmedData);
      setCurrentPhase('service_area');
      */

      return { success: true, data: locationData };
    } catch (error) {
      console.error('Failed to confirm address:', error);
      // Show error to user
      alert(error.message || 'Failed to confirm address. Please try again.');
      return { success: false, error: error.message };
    }
  };

  const onConfirmServiceArea = (areaData) => {
    setServiceAreaData(areaData);
    const finalData = {
      ...confirmedAddress,
      ...areaData,
      service_area_type: watchedServiceAreaType,
      willing_to_travel_outside: getValues('willing_to_travel_outside')
    };
    updateData('location', finalData);
    onNext();
  };

  const goBackToAddress = () => {
    setCurrentPhase('address');
    setServiceAreaData(null);
  };

  if (currentPhase === 'address') {
    return (
      <AddressConfirmationStep
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        setValue={setValue}
        onConfirm={onConfirmAddress}
        onPrev={onPrev}
        mapboxToken={MAPBOX_TOKEN}
        initialData={data.location}
        watch={watch} 
      />
    );
  }

  return (
    <ServiceAreaStep
      confirmedAddress={confirmedAddress}
      serviceAreaType={watchedServiceAreaType}
      register={register}
      setValue={setValue}
      onConfirm={onConfirmServiceArea}
      onBack={goBackToAddress}
      mapboxToken={MAPBOX_TOKEN}
      watch={watch} // Add this line
    />
  );
};

// Phase 1: Address Confirmation Component
const AddressConfirmationStep = ({ 
  register, 
  handleSubmit, 
  errors, 
  setValue, 
  onConfirm, 
  onPrev, 
  mapboxToken, 
  initialData,
  watch 
}) => {
  const mapContainer = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // Clean up previous instances
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }
        if (markerRef.current) {
          markerRef.current.remove();
        }

        // Clear container
        mapContainer.current.innerHTML = '';

        const mapboxgl = await import('mapbox-gl');
        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-98.5795, 39.8283],
          zoom: 4
        });

        // Store map instance in ref
        mapInstanceRef.current = map;

        map.on('load', () => {
          if (!isMounted) return;

          if (initialData?.latitude && initialData?.longitude) {
            const coords = [initialData.longitude, initialData.latitude];
            map.setCenter(coords);
            map.setZoom(12);
            addMarker(coords);
          }
        });

        map.on('click', (e) => {
          if (!isMounted) return;
          const coords = [e.lngLat.lng, e.lngLat.lat];
          setValue('latitude', e.lngLat.lat);
          setValue('longitude', e.lngLat.lng);
          addMarker(coords);
          reverseGeocode(coords[0], coords[1]);
        });

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [mapboxToken]);

  const addMarker = useCallback((coords) => {
    if (!mapInstanceRef.current) return;

    try {
      if (markerRef.current) {
        markerRef.current.remove();
      }

      const mapboxgl = require('mapbox-gl');
      const newMarker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(coords)
        .addTo(mapInstanceRef.current);

      markerRef.current = newMarker;
    } catch (error) {
      console.error('Error adding marker:', error);
    }
  }, []);

  // Geocode address when it changes
  useEffect(() => {
    const [address1, city, state, zip] = watchedAddress;
    if (address1 && city && state && mapboxToken) {
      const fullAddress = `${address1}, ${city}, ${state} ${zip}`;
      geocodeAddress(fullAddress);
    }
  }, [watchedAddress, mapboxToken]);

  const geocodeAddress = async (address) => {
    if (!mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=US`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setValue('latitude', lat);
        setValue('longitude', lng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter([lng, lat]);
          mapInstanceRef.current.setZoom(12);
          addMarker([lng, lat]);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const reverseGeocode = async (lng, lat) => {
    if (!mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const addressComponents = place.context || [];
        
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

        setValue('address_line1', place.place_name.split(',')[0]);
        setValue('city', locality);
        setValue('state', region);
        setValue('zip_code', postcode);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const onSubmit = async (data) => {
    console.log('Form submitted with:', data); // Debug log
    
    try {
      if (!data.latitude || !data.longitude) {
        alert('Please select a location on the map');
        return;
      }
      
      await onConfirm(data);
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Confirm Your Business Address
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

            {/* Add hidden fields for coordinates */}
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
          </form>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Confirm Location
            </h3>
            <p className="text-sm text-secondary-600">
              {mapboxToken ? 
                'Click on the map to adjust your exact location.' :
                'Enter your address to set your location. (Map preview requires Mapbox token)'
              }
            </p>
          </div>
          
          {mapboxToken ? (
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

// Phase 2: Service Area Selection Component
const ServiceAreaStep = ({ 
  confirmedAddress, 
  serviceAreaType, 
  register, 
  setValue, 
  onConfirm, 
  onBack, 
  mapboxToken,
  watch // Add this line
}) => {
  const [serviceAreaData, setServiceAreaData] = useState(null);

  const renderServiceAreaMap = () => {
    switch (serviceAreaType) {
      case 'radius':
        return (
          <RadiusServiceArea
            address={confirmedAddress}
            mapboxToken={mapboxToken}
            onDataChange={setServiceAreaData} // Add this line
            register={register}
            watch={watch}
            setValue={setValue}
          />
        );
      case 'town':
        return (
          <BoundaryServiceArea
            address={confirmedAddress}
            mapboxToken={mapboxToken}
            boundaryType="town"
            onDataChange={setServiceAreaData}
          />
        );
      case 'county':
        return (
          <BoundaryServiceArea
            address={confirmedAddress}
            mapboxToken={mapboxToken}
            boundaryType="county"
            onDataChange={setServiceAreaData}
          />
        );
      case 'state':
        return (
          <BoundaryServiceArea
            address={confirmedAddress}
            mapboxToken={mapboxToken}
            boundaryType="state"
            onDataChange={setServiceAreaData}
          />
        );
      case 'custom_draw':
        return (
          <CustomDrawServiceArea
            address={confirmedAddress}
            mapboxToken={mapboxToken}
            onDataChange={setServiceAreaData}
          />
        );
      default:
        return <div>Please select a service area type</div>;
    }
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Define Your Service Coverage Area
        </h2>
        <p className="text-secondary-600">
          Choose how you want to define your service area.
        </p>
        
        {/* Address Summary */}
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            ✓ Confirmed Address: {confirmedAddress?.address_line1}, {confirmedAddress?.city}, {confirmedAddress?.state} {confirmedAddress?.zip_code}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-green-600 hover:text-green-700 underline mt-1"
          >
            Change address
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="space-y-6">
            {/* Service Area Type Selection */}
            <div className="bg-secondary-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-secondary-700 mb-3">
                Service Area Type *
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    {...register('service_area_type')}
                    type="radio"
                    value="radius"
                    className="mr-3"
                  />
                  <span className="text-sm">Radius from my location</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('service_area_type')}
                    type="radio"
                    value="town"
                    className="mr-3"
                  />
                  <span className="text-sm">My town/city only</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('service_area_type')}
                    type="radio"
                    value="county"
                    className="mr-3"
                  />
                  <span className="text-sm">My county</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('service_area_type')}
                    type="radio"
                    value="state"
                    className="mr-3"
                  />
                  <span className="text-sm">My state</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('service_area_type')}
                    type="radio"
                    value="custom_draw"
                    className="mr-3"
                  />
                  <span className="text-sm">Draw custom area on map</span>
                </label>
              </div>
            </div>

            {/* Travel Outside Option */}
            <div className="bg-primary-50 p-4 rounded-lg">
              <label className="flex items-start">
                <input
                  {...register('willing_to_travel_outside')}
                  type="checkbox"
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-secondary-900">
                    Willing to discuss projects outside my service area
                  </span>
                  <p className="text-xs text-secondary-600 mt-1">
                    Check this if you're open to considering special projects outside your normal service area.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onConfirm(serviceAreaData)}
                disabled={!serviceAreaData}
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  serviceAreaData 
                    ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                    : 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
                }`}
              >
                Confirm Service Area & Continue →
              </button>
              
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 px-4 text-sm text-secondary-600 hover:text-secondary-700 underline"
              >
                ← Back to Address
              </button>
            </div>
          </div>
        </div>

        <div>
          {renderServiceAreaMap()}
        </div>
      </div>
    </div>
  );
};

// Individual Service Area Components
const RadiusServiceArea = ({ 
  address, 
  register, 
  setValue, 
  onConfirm, 
  mapboxToken, 
  watch,
  onDataChange // Add this line
}) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const [radius, setRadius] = useState(25);
  const mapContainer = useRef(null);

  const watchedRadius = watch('service_radius', 25);

  useEffect(() => {
    setRadius(watchedRadius);
  }, [watchedRadius]);

  useEffect(() => {
    if (!mapboxToken || !address?.latitude || !address?.longitude) return;

    const initMap = async () => {
      try {
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        const mapboxglModule = await import('mapbox-gl');
        const mapboxglInstance = mapboxglModule.default;
        mapboxglInstance.accessToken = mapboxToken;

        await new Promise(resolve => setTimeout(resolve, 100));

        const map = new mapboxglInstance.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [address.longitude, address.latitude],
          zoom: 10,
        });

        map.on('load', () => {
          setMapInstance(map);
          addMarkerAndCircle(map, [address.longitude, address.latitude], mapboxglInstance);
        });

      } catch (error) {
        console.error('Error initializing radius map:', error);
      }
    };

    initMap();

    return () => {
      if (marker) marker.remove();
      if (mapInstance) mapInstance.remove();
      if (mapContainer.current) mapContainer.current.innerHTML = '';
    };
  }, [mapboxToken, address]);

  useEffect(() => {
    if (mapInstance && marker) {
      updateCircle();
      if (onDataChange) { // Add null check
        onDataChange({
          type: 'radius',
          radius: radius,
          center: [address.longitude, address.latitude]
        });
      }
    }
  }, [radius, mapInstance, marker, address, onDataChange]); // Add onDataChange to deps

  const addMarkerAndCircle = (map, coords, mapboxglInstance) => {
    const newMarker = new mapboxglInstance.Marker({ color: '#3b82f6' })
      .setLngLat(coords)
      .addTo(map);
    setMarker(newMarker);
    updateCircle();
  };

  const updateCircle = () => {
    if (!mapInstance) return;

    if (mapInstance.getLayer('circle-fill')) {
      mapInstance.removeLayer('circle-fill');
      mapInstance.removeLayer('circle-border');
      mapInstance.removeSource('circle');
    }

    const radiusInKm = radius * 1.60934;
    const coords = [address.longitude, address.latitude];
    const points = 64;
    const circleCoords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInKm * Math.cos(angle);
      const dy = radiusInKm * Math.sin(angle);
      
      const deltaLng = dx / (111.32 * Math.cos((coords[1] * Math.PI) / 180));
      const deltaLat = dy / 110.54;
      
      circleCoords.push([
        coords[0] + deltaLng,
        coords[1] + deltaLat
      ]);
    }
    circleCoords.push(circleCoords[0]);

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
      id: 'circle-fill',
      type: 'fill',
      source: 'circle',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2
      }
    });

    mapInstance.addLayer({
      id: 'circle-border',
      type: 'line',
      source: 'circle',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2
      }
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          Radius Service Area
        </h3>
        <p className="text-sm text-secondary-600 mb-4">
          Set how far you're willing to travel for jobs.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Service Radius: <span className="font-bold text-primary-600">{radius} miles</span>
          </label>
          <input
            {...register('service_radius')}
            type="range"
            min="1"
            max="100"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-secondary-500 mt-1">
            <span>1 mile</span>
            <span>100 miles</span>
          </div>
        </div>
      </div>
      
      {mapboxToken ? (
        <div 
          ref={mapContainer}
          className="w-full h-96 rounded-lg border border-secondary-300"
        />
      ) : (
        <div className="w-full h-96 bg-secondary-100 rounded-lg border border-secondary-300 flex items-center justify-center">
          <p className="text-secondary-600">Map requires Mapbox token</p>
        </div>
      )}
    </div>
  );
};

const BoundaryServiceArea = ({ address, mapboxToken, boundaryType, onDataChange }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [boundaryInfo, setBoundaryInfo] = useState(null);
  const mapContainer = useRef(null);

  useEffect(() => {
    if (!mapboxToken || !address?.latitude || !address?.longitude) return;

    const initMap = async () => {
      try {
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        const mapboxglModule = await import('mapbox-gl');
        const mapboxglInstance = mapboxglModule.default;
        mapboxglInstance.accessToken = mapboxToken;

        await new Promise(resolve => setTimeout(resolve, 100));

        const map = new mapboxglInstance.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [address.longitude, address.latitude],
          zoom: boundaryType === 'state' ? 6 : boundaryType === 'county' ? 8 : 10,
        });

        map.on('load', () => {
          setMapInstance(map);
          loadBoundary(map, mapboxglInstance);
        });

      } catch (error) {
        console.error('Error initializing boundary map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstance) mapInstance.remove();
      if (mapContainer.current) mapContainer.current.innerHTML = '';
    };
  }, [mapboxToken, address, boundaryType]);

  const loadBoundary = async (map, mapboxglInstance) => {
    // Add marker
    new mapboxglInstance.Marker({ color: '#10b981' })
      .setLngLat([address.longitude, address.latitude])
      .addTo(map);

    try {
      let boundaryData = null;
      let info = null;

      if (boundaryType === 'town') {
        const result = await fetchCityBoundary([address.longitude, address.latitude], mapboxToken);
        boundaryData = result.boundary;
        info = result.info;
      } else {
        const tilesetId = boundaryType === 'county' ? 'mapbox.boundaries-adm2-v4' : 'mapbox.boundaries-adm1-v4';
        const result = await fetchAdminBoundary([address.longitude, address.latitude], mapboxToken, tilesetId);
        boundaryData = result.boundary;
        info = result.info;
      }

      if (boundaryData) {
        map.addSource('boundary', {
          type: 'geojson',
          data: boundaryData
        });

        map.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundary',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.2
          }
        });

        map.addLayer({
          id: 'boundary-border',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': '#10b981',
            'line-width': 2
          }
        });

        setBoundaryInfo(info);
        onDataChange({
          type: boundaryType,
          boundary: boundaryData,
          info: info
        });
      }
    } catch (error) {
      console.error('Error loading boundary:', error);
    }
  };

  const fetchCityBoundary = async (coords, token) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${token}&types=place&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        if (place.bbox) {
          const [minLng, minLat, maxLng, maxLat] = place.bbox;
          return {
            boundary: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [minLng, minLat], [maxLng, minLat], 
                  [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]
                ]]
              }
            },
            info: { name: place.place_name }
          };
        }
      }
    } catch (error) {
      console.error('Error fetching city boundary:', error);
    }
    return { boundary: null, info: null };
  };

  const fetchAdminBoundary = async (coords, token, tilesetId) => {
    try {
      // First try the boundaries API
      const response = await fetch(
        `https://api.mapbox.com/v4/${tilesetId}/tilequery/${coords[0]},${coords[1]}.json?access_token=${token}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return {
            boundary: data.features[0],
            info: { name: data.features[0].properties?.name || 'Administrative Area' }
          };
        }
      }

      // Fallback to geocoding API if boundaries not available
      const geocodeResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${token}&types=${boundaryType === 'state' ? 'region' : 'district'}`
      );
      
      const geocodeData = await geocodeResponse.json();
      if (geocodeData.features && geocodeData.features.length > 0) {
        const feature = geocodeData.features[0];
        // Create an approximate boundary using the bbox
        if (feature.bbox) {
          const [minLng, minLat, maxLng, maxLat] = feature.bbox;
          return {
            boundary: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [minLng, minLat],
                  [maxLng, minLat],
                  [maxLng, maxLat],
                  [minLng, maxLat],
                  [minLng, minLat]
                ]]
              }
            },
            info: { name: feature.place_name }
          };
        }
      }
    } catch (error) {
      console.error('Error fetching boundary:', error);
    }
    return { boundary: null, info: null };
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          {boundaryType.charAt(0).toUpperCase() + boundaryType.slice(1)} Boundary
        </h3>
        <p className="text-sm text-secondary-600 mb-4">
          Service area limited to your {boundaryType}.
        </p>
        
        {boundaryInfo && (
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium text-green-800">
              Service Area: {boundaryInfo.name}
            </p>
          </div>
        )}
      </div>
      
      {mapboxToken ? (
        <div 
          ref={mapContainer}
          className="w-full h-96 rounded-lg border border-secondary-300"
        />
      ) : (
        <div className="w-full h-96 bg-secondary-100 rounded-lg border border-secondary-300 flex items-center justify-center">
          <p className="text-secondary-600">Map requires Mapbox token</p>
        </div>
      )}
    </div>
  );
};

const CustomDrawServiceArea = ({ address, mapboxToken, onDataChange }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [drawInstance, setDrawInstance] = useState(null);
  const [area, setArea] = useState(0);
  const mapContainer = useRef(null);

  useEffect(() => {
    if (!mapboxToken || !address?.latitude || !address?.longitude) return;

    const initMap = async () => {
      try {
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        // Load Mapbox GL Draw
        if (!window.MapboxDraw) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css';
          document.head.appendChild(link);

          const script = document.createElement('script');
          script.src = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js';
          await new Promise((resolve) => {
            script.onload = resolve;
            document.head.appendChild(script);
          });
        }

        const mapboxglModule = await import('mapbox-gl');
        const mapboxglInstance = mapboxglModule.default;
        mapboxglInstance.accessToken = mapboxToken;

        await new Promise(resolve => setTimeout(resolve, 100));

        const map = new mapboxglInstance.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [address.longitude, address.latitude],
          zoom: 10,
        });

        map.on('load', () => {
          setMapInstance(map);

          // Add marker
          new mapboxglInstance.Marker({ color: '#8b5cf6' })
            .setLngLat([address.longitude, address.latitude])
            .addTo(map);

          // Initialize draw
          const draw = new window.MapboxDraw({
            displayControlsDefault: false,
            controls: {
              polygon: true,
              trash: true
            },
            defaultMode: 'draw_polygon',
            // Add custom styles
            styles: [
              // Styling for vertex points
              {
                id: 'gl-draw-point',
                type: 'circle',
                filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
                paint: {
                  'circle-radius': 5,
                  'circle-color': '#3b82f6' // blue-500
                }
              },
              // Styling for the polygon
              {
                id: 'gl-draw-polygon-fill',
                type: 'fill',
                filter: ['all', ['==', '$type', 'Polygon']],
                paint: {
                  'fill-color': '#3b82f6',
                  'fill-opacity': 0.1
                }
              },
              // Styling for the polygon outline
              {
                id: 'gl-draw-polygon-stroke',
                type: 'line',
                filter: ['all', ['==', '$type', 'Polygon']],
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 2
                }
              }
            ]
          });

          map.addControl(draw, 'top-right');
          setDrawInstance(draw);

          map.on('draw.create', (e) => updateArea(e, draw));
          map.on('draw.delete', (e) => updateArea(e, draw));
          map.on('draw.update', (e) => updateArea(e, draw));
        });

      } catch (error) {
        console.error('Error initializing draw map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstance) mapInstance.remove();
      if (mapContainer.current) mapContainer.current.innerHTML = '';
    };
  }, [mapboxToken, address]);

  const updateArea = (e, draw) => {
    const data = draw.getAll();
    if (data.features.length > 0) {
      const area = calculateArea(data.features[0]);
      setArea(area);
      onDataChange({
        type: 'custom_draw',
        polygon: data.features[0],
        area: area
      });
    } else {
      setArea(0);
      onDataChange(null);
    }
  };

  const calculateArea = (feature) => {
    // Simple polygon area calculation
    const coords = feature.geometry.coordinates[0];
    let area = 0;
    const n = coords.length;
    
    for (let i = 0; i < n - 1; i++) {
      area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
    }
    
    return Math.abs(area / 2) * 12391399903; // Convert to square meters (rough)
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          Draw Custom Service Area
        </h3>
        <p className="text-sm text-secondary-600 mb-4">
          Use the polygon tool to draw your exact service area.
        </p>
        
        {area > 0 && (
          <div className="bg-purple-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium text-purple-800">
              Area: {(area / 1000000).toFixed(2)} km² ({(area * 0.000247105).toFixed(2)} acres)
            </p>
          </div>
        )}
      </div>
      
      {mapboxToken ? (
        <div 
          ref={mapContainer}
          className="w-full h-96 rounded-lg border border-secondary-300"
        />
      ) : (
        <div className="w-full h-96 bg-secondary-100 rounded-lg border border-secondary-300 flex items-center justify-center">
          <p className="text-secondary-600">Map requires Mapbox token</p>
        </div>
      )}
    </div>
  );
};

const confirmLocation = async (locationData) => {
  try {
    const result = await profileService.saveWizardStep('location', locationData);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to save location');
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};

const DebugPanel = ({ data }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg opacity-75 max-w-md">
      <pre className="text-xs overflow-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default LocationStep;