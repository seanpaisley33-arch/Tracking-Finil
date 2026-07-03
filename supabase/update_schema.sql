-- Run this script in your Supabase SQL Editor to add the new advanced logistics fields

ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'Standard Ground',
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_address TEXT,
ADD COLUMN IF NOT EXISTS declared_value NUMERIC,
ADD COLUMN IF NOT EXISTS stamp_tsa BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS stamp_customs BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS stamp_postage BOOLEAN DEFAULT TRUE;

-- Optional: If you want to drop the whole table to start fresh, uncomment below (WARNING: Data Loss!)
-- DROP TABLE public.shipment_checkpoints;
-- DROP TABLE public.shipments;
-- Then run the original schema.sql again.
