-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/ztjxuhqomyykcqzzgfku/sql)

-- 1. Add Package Photo URLs to shipments and checkpoints tables
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS package_photo_url TEXT;

ALTER TABLE public.shipment_checkpoints 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create the chat_messages table for Realtime On-Site Customer Live Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  tracking_number TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  voice_duration INT,
  status TEXT DEFAULT 'delivered',
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created earlier with fewer columns
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'delivered';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Enable RLS and create public access policies for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read chat_messages" 
ON public.chat_messages FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert chat_messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update chat_messages" 
ON public.chat_messages FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete chat_messages" 
ON public.chat_messages FOR DELETE 
USING (true);

-- Enable Supabase Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
