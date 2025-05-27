import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

/**
 * ServiceAreaStep - Define service coverage area
 */
const ServiceAreaStep = ({ data, updateData, onNext, onPrev }) => {
  const [selectedAreaType, setSelectedAreaType] = useState(data.serviceArea?.type || 'radius');
  const [serviceAreaData, setServiceAreaData] = useState(null);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
  } = useForm({
    defaultValues: {
      service_area_type: data.serviceArea?.type || 'radius',
      service_radius: data.serviceArea?.radius || 25,
      willing_to_travel_outside: data.serviceArea?.willing_to_travel_outside || false,
    },
  });

  const watchedServiceAreaType = watch('service_area_type');
  const watchedRadius = watch('service_radius');

  useEffect(() => {
    setSelectedAreaType(watchedServiceAreaType);
  }, [watchedServiceAreaType]);

  const handleServiceAreaDataChange = (data) => {
    setServiceAreaData(data);
  };

  const onSubmit = (formData) => {
    const finalData = {
      type: formData.service_area_type,
      radius: formData.service_area_type === 'radius' ? formData.service_radius : null,
      willing_to_travel_outside: formData.willing_to_travel_outside,
      ...serviceAreaData
    };
    
    console.log('Service area submitted:', finalData);
    updateData('serviceArea', finalData);
    onNext();
  };

  const renderServiceAreaMap = () => {
    if (!data.address || !data.address.latitude || !data.address.longitude) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            Please complete the address step first to set your service area.
          </p>
        </div>
      );
    }

    switch (selectedAreaType) {
      case 'radius':
        return (
          <RadiusServiceArea
            address={data.address}
            mapboxToken={MAPBOX_TOKEN}
            onDataChange={handleServiceAreaDataChange}
            radius={watchedRadius}
          />
        );
      case 'town':
        return (
          <BoundaryServiceArea
            address={data.address}
            mapboxToken={MAPBOX_TOKEN}
            boundaryType="town"
            onDataChange={handleServiceAreaDataChange}
          />
        );
      case 'county':
        return (
          <BoundaryServiceArea
            address={data.address}
            mapboxToken={MAPBOX_TOKEN}
            boundaryType="county"
            onDataChange={handleServiceAreaDataChange}
          />
        );
      case 'state':
        return (
          <BoundaryServiceArea
            address={data.address}
            mapboxToken={MAPBOX_TOKEN}
            boundaryType="state"
            onDataChange={handleServiceAreaDataChange}
          />
        );
      case 'custom_draw':
        return (
          <CustomDrawServiceArea
            address={data.address}
            mapboxToken={MAPBOX_TOKEN}
            onDataChange={handleServiceAreaDataChange}
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
          Service Coverage Area
        </h2>
        <p className="text-secondary-600">
          Define the area where you provide services.
        </p>
        
        {/* Address Summary */}
        {data.address && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              ✓ Business Address: {data.address.address_line1}, {data.address.city}, {data.address.state} {data.address.zip_code}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
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

              {/* Radius Slider - Only show for radius type */}
              {selectedAreaType === 'radius' && (
                <div className="bg-primary-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Service Radius: <span className="font-bold text-primary-600">{watchedRadius} miles</span>
                  </label>
                  <input
                    {...register('service_radius')}
                    type="range"
                    min="1"
                    max="100"
                    className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-secondary-500 mt-1">
                    <span>1 mile</span>
                    <span>100 miles</span>
                  </div>
                </div>
              )}

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
                  disabled={!data.address}
                >
                  Next: Pricing →
                </button>
              </div>
            </div>
          </div>

          <div>
            {renderServiceAreaMap()}
          </div>
        </div>
      </form>
    </div>
  );
};

// Radius Service Area Component
const RadiusServiceArea = ({ address, mapboxToken, onDataChange, radius }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const mapContainer = useRef(null);
  
  // First useEffect for map initialization
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
          
          // Add marker
          const newMarker = new mapboxglInstance.Marker({ color: '#3b82f6' })
            .setLngLat([address.longitude, address.latitude])
            .addTo(map);
          setMarker(newMarker);
        });

      } catch (error) {
        console.error('Error initializing radius map:', error);
      }
    };

    initMap();

    return () => {
      if (marker) marker.remove();
      if (mapInstance) mapInstance.remove();
      if (mapContainer.current) mapContainer.innerHTML = '';
    };
  }, [mapboxToken, address]); // Remove marker and mapInstance from dependencies

  // Separate useEffect for circle updates
  useEffect(() => {
    const updateCircle = (map, currentRadius) => {
      if (!map || !address) return;

      // Remove existing layers
      if (map.getLayer('circle-fill')) {
        map.removeLayer('circle-fill');
        map.removeLayer('circle-border');
        map.removeSource('circle');
      }

      // Create circle coordinates
      const radiusInKm = currentRadius * 1.60934;
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

      // Add circle source and layers
      map.addSource('circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords]
          }
        }
      });

      map.addLayer({
        id: 'circle-fill',
        type: 'fill',
        source: 'circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2
        }
      });

      map.addLayer({
        id: 'circle-border',
        type: 'line',
        source: 'circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2
        }
      });
    };

    if (mapInstance) {
      updateCircle(mapInstance, radius);
      // Wrap onDataChange in a timeout to break the render cycle
      const timeoutId = setTimeout(() => {
        onDataChange({
          type: 'radius',
          radius: radius,
          center: [address.longitude, address.latitude]
        });
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [radius, mapInstance, address?.latitude, address?.longitude]); // Remove onDataChange from dependencies

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          Service Area Preview
        </h3>
        <p className="text-sm text-secondary-600">
          Your service area covers a {radius} mile radius from your business location.
        </p>
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

// Boundary Service Area Component
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
          
          // Add marker
          new mapboxglInstance.Marker({ color: '#10b981' })
            .setLngLat([address.longitude, address.latitude])
            .addTo(map);
          
          // Load boundary
          loadBoundary(map);
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

  const loadBoundary = async (map) => {
    try {
      // For demonstration, create a simple bounding box
      // In production, you'd fetch actual boundary data from an API
      const info = {
        name: `${address.city}, ${address.state}`,
        type: boundaryType
      };

      setBoundaryInfo(info);
      onDataChange({
        type: boundaryType,
        info: info
      });

      // Create a simple box around the location for demonstration
      const size = boundaryType === 'state' ? 2 : boundaryType === 'county' ? 0.5 : 0.1;
      const bounds = [
        [address.longitude - size, address.latitude - size],
        [address.longitude + size, address.latitude - size],
        [address.longitude + size, address.latitude + size],
        [address.longitude - size, address.latitude + size],
        [address.longitude - size, address.latitude - size]
      ];

      map.addSource('boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [bounds]
          }
        }
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

    } catch (error) {
      console.error('Error loading boundary:', error);
    }
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

// Custom Draw Service Area Component
const CustomDrawServiceArea = ({ address, mapboxToken, onDataChange }) => {
  const [area, setArea] = useState(0);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const pointsRef = useRef([]);
  const polygonRef = useRef(false);

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

        mapRef.current = map;

        map.on('load', () => {
          // Add marker
          new mapboxglInstance.Marker({ color: '#8b5cf6' })
            .setLngLat([address.longitude, address.latitude])
            .addTo(map);

          // Add drawing instructions
          map.addControl({
            onAdd: function() {
              const div = document.createElement('div');
              div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
              div.innerHTML = `
                <div style="padding: 10px; background: white; border-radius: 4px;">
                  <p style="margin: 0; font-size: 12px;">
                    Click points on the map to draw your service area.
                    Double-click to finish.
                  </p>
                </div>
              `;
              return div;
            },
            onRemove: function() {}
          }, 'top-left');

          // Handle clicks for drawing polygon
          map.on('click', handleMapClick);
          map.on('dblclick', handleDoubleClick);
        });

      } catch (error) {
        console.error('Error initializing draw map:', error);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
        mapRef.current.off('dblclick', handleDoubleClick);
        mapRef.current.remove();
      }
      if (mapContainer.current) {
        mapContainer.current.innerHTML = '';
      }
    };
  }, [mapboxToken, address]);

  const handleMapClick = (e) => {
    const map = mapRef.current;
    if (!map) return;

    pointsRef.current.push([e.lngLat.lng, e.lngLat.lat]);
    
    if (pointsRef.current.length >= 3) {
      if (polygonRef.current) {
        map.removeLayer('polygon-fill');
        map.removeLayer('polygon-border');
        map.removeSource('polygon');
      }

      const coords = [...pointsRef.current, pointsRef.current[0]];
      
      map.addSource('polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          }
        }
      });

      map.addLayer({
        id: 'polygon-fill',
        type: 'fill',
        source: 'polygon',
        paint: {
          'fill-color': '#8b5cf6',
          'fill-opacity': 0.2
        }
      });

      map.addLayer({
        id: 'polygon-border',
        type: 'line',
        source: 'polygon',
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 2
        }
      });

      polygonRef.current = true;
      
      // Calculate area (simplified)
      const calculatedArea = Math.abs(coords.reduce((acc, coord, i) => {
        const next = coords[i + 1] || coords[0];
        return acc + (coord[0] * next[1] - next[0] * coord[1]);
      }, 0) / 2) * 12391399903;
      
      setArea(calculatedArea);
      onDataChange({
        type: 'custom_draw',
        polygon: coords,
        area: calculatedArea
      });
    }
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (pointsRef.current.length >= 3) {
      mapRef.current?.doubleClickZoom.enable();
    }
  };

  const clearDrawing = () => {
    const map = mapRef.current;
    if (!map) return;

    // Clear the polygon from the map
    if (polygonRef.current) {
      map.removeLayer('polygon-fill');
      map.removeLayer('polygon-border');
      map.removeSource('polygon');
      polygonRef.current = false;
    }

    // Reset the points array
    pointsRef.current = [];
    
    // Reset the area
    setArea(0);
    
    // Notify parent component
    onDataChange({
      type: 'custom_draw',
      polygon: null,
      area: 0
    });
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-secondary-900">
            Draw Custom Service Area
          </h3>
          {polygonRef.current && (
            <button
              type="button"
              onClick={clearDrawing}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 
                       border border-red-300 hover:border-red-400 
                       rounded-md bg-white hover:bg-red-50 
                       transition-colors duration-200"
            >
              Clear Drawing
            </button>
          )}
        </div>
        <p className="text-sm text-secondary-600 mb-4">
          Click points on the map to draw your service area polygon.
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

export default ServiceAreaStep;