-- Multi-Carrier Shipment Tracking Web Platform - Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  user_role TEXT CHECK (user_role IN ('admin', 'driver', 'customer')) DEFAULT 'customer',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Shipments Table
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number TEXT UNIQUE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id),
  receiver_name TEXT NOT NULL,
  receiver_email TEXT,
  destination_address TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'CREATED',
  estimated_delivery TIMESTAMPTZ,
  carrier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit indexes
CREATE INDEX idx_shipments_tracking_number ON public.shipments(tracking_number);

-- 3. Shipment Checkpoints Table
CREATE TABLE public.shipment_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_description TEXT,
  location_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit indexes
CREATE INDEX idx_shipment_checkpoints_shipment_id ON public.shipment_checkpoints(shipment_id);

-- Setup Row Level Security (RLS)

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Shipments RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shipments are viewable by everyone." ON public.shipments FOR SELECT USING (true);
CREATE POLICY "Admins can insert shipments." ON public.shipments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);
CREATE POLICY "Admins can update shipments." ON public.shipments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- Checkpoints RLS
ALTER TABLE public.shipment_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checkpoints are viewable by everyone." ON public.shipment_checkpoints FOR SELECT USING (true);
CREATE POLICY "Admins and Drivers can insert checkpoints." ON public.shipment_checkpoints FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role IN ('admin', 'driver'))
);

-- Set up Realtime for Checkpoints (Required for Map Updates)
alter publication supabase_realtime add table public.shipment_checkpoints;
