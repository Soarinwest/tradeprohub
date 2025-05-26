import React, { useState, useEffect } from 'react';
import AddressConfirmationStep from './AddressConfirmationStep';
import ServiceAreaStep from './ServiceAreaStep';

const LocationStep = ({ data, updateData, onNext, onPrev }) => {
  const [currentPhase, setCurrentPhase] = useState('address');
  const [confirmedAddress, setConfirmedAddress] = useState(() => {
    console.log('Initializing with data:', data?.location);
    return data?.location || null;
  });
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    console.log('Current confirmed address:', confirmedAddress);
  }, [confirmedAddress]);

  const handleAddressConfirm = (addressData) => {
    console.log('Address confirmed:', addressData);
    setConfirmedAddress(addressData);
    updateData('location', addressData); // Save partial data
    setCurrentPhase('service_area');
  };

  const handleServiceAreaConfirm = (combinedData) => {
    console.log('Service area confirmed:', combinedData);
    const finalData = {
      ...confirmedAddress,
      ...combinedData
    };
    updateData('location', finalData);
    onNext();
  };

  return (
    <div className="wizard-step">
      {currentPhase === 'address' ? (
        <AddressConfirmationStep
          initialData={confirmedAddress}
          onConfirm={handleAddressConfirm}
          onPrev={onPrev}
          mapboxToken={MAPBOX_TOKEN}
        />
      ) : (
        <ServiceAreaStep
          initialData={data?.location}
          confirmedAddress={confirmedAddress}
          onConfirm={handleServiceAreaConfirm}
          onBack={() => setCurrentPhase('address')}
          mapboxToken={MAPBOX_TOKEN}
        />
      )}
    </div>
  );
};

export default LocationStep;