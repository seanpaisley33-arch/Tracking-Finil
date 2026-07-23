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
  package_photo_url?: string | null;
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
  photo_url?: string | null;
};

export type ChatMessage = {
  id: string;
  shipment_id?: string | null;
  tracking_number?: string | null;
  sender_type: 'user' | 'admin';
  sender_name?: string | null;
  message_type: 'text' | 'image' | 'file' | 'voice';
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: string | null;
  voice_duration?: number | null;
  status?: 'delivered' | 'read';
  is_edited?: boolean;
  created_at: string;
};
