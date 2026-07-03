export type Profile = {
  id: string;
  user_role: 'admin' | 'driver' | 'customer';
  full_name: string | null;
  created_at: string;
};

export type Shipment = {
  id: string;
  tracking_number: string;
  sender_id: string | null;
  receiver_name: string;
  receiver_email: string | null;
  destination_address: string;
  current_status: string;
  estimated_delivery: string | null;
  carrier: string;
  created_at: string;
  updated_at: string;
  weight: number | null;
  dimensions: string | null;
  service_type: string | null;
  sender_name: string | null;
  sender_address: string | null;
  declared_value: number | null;
};

export type ShipmentCheckpoint = {
  id: string;
  shipment_id: string;
  status: string;
  status_description: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};
