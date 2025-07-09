import { useState, useEffect } from 'react';
import { 
  Shipment,
  ShipmentWithDetails
} from '../types/database';
import { 
  getShipments,
  getShipmentWithDetails
} from '../services/shippingService';

// Hook for managing shipments list
export const useShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const data = await getShipments();
      setShipments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  return { shipments, loading, error, refetch: fetchShipments };
};

// Hook for managing shipment details
export const useShipmentDetails = (shipmentId: string | null) => {
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShipmentDetails = async () => {
    if (!shipmentId) {
      setShipmentDetails(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getShipmentWithDetails(shipmentId);
      setShipmentDetails(data);
      if (!data) {
        setError('Shipment not found');
      }
    } catch (err) {
      console.error('Error fetching shipment details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shipment details');
      setShipmentDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentDetails();
  }, [shipmentId]);

  return { 
    shipmentDetails, 
    loading, 
    error, 
    refetch: fetchShipmentDetails,
    setShipmentDetails 
  };
};