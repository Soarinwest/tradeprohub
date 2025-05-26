import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const RadiusServiceArea = ({ 
  address, 
  radius,
  mapboxToken 
}) => {
  const mapContainer = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [marker, setMarker] = useState(null);
  const [circle, setCircle] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || !address) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [address.longitude, address.latitude],
      zoom: 10
    });

    map.on('load', () => {
      setMapInstance(map);

      // Add marker at business location
      const newMarker = new mapboxgl.Marker()
        .setLngLat([address.longitude, address.latitude])
        .addTo(map);
      setMarker(newMarker);
    });

    return () => {
      if (marker) marker.remove();
      if (circle) circle.remove();
      map.remove();
    };
  }, [mapboxToken, address]);

  // Update circle when radius changes
  useEffect(() => {
    if (!mapInstance || !address) return;

    // Remove existing circle
    if (mapInstance.getLayer('service-radius')) {
      mapInstance.removeLayer('service-radius');
    }
    if (mapInstance.getSource('service-radius')) {
      mapInstance.removeSource('service-radius');
    }

    // Create new circle
    const center = [address.longitude, address.latitude];
    
    mapInstance.addSource('service-radius', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          radius: radius
        }
      }
    });

    mapInstance.addLayer({
      id: 'service-radius',
      type: 'circle',
      source: 'service-radius',
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, radius * 50]
          ],
          base: 2
        },
        'circle-color': '#4338ca',
        'circle-opacity': 0.15,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#4338ca'
      }
    });

    setCircle(true);

    // Adjust zoom to fit circle
    const zoomLevel = Math.max(8, 11 - Math.log(radius) / Math.log(2));
    mapInstance.flyTo({
      center: center,
      zoom: zoomLevel,
      duration: 1000
    });
  }, [radius, mapInstance, address]);

  return (
    <div 
      ref={mapContainer}
      className="w-full h-[400px] rounded-lg border border-secondary-300"
      style={{ minHeight: '400px' }}
    />
  );
};

export default RadiusServiceArea;