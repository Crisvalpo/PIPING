-- Add execution tracking columns to spools_welds
ALTER TABLE spools_welds
ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS welder_id TEXT, -- Can be UUID if we have a welders table, or just text for now
ADD COLUMN IF NOT EXISTS foreman_id TEXT; -- Can be UUID if we have a foremen table, or just text for now

-- Add execution tracking columns to bolted_joints
ALTER TABLE bolted_joints
ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP WITH TIME ZONE;

-- Add availability request tracking to material_take_off
ALTER TABLE material_take_off
ADD COLUMN IF NOT EXISTS availability_request_id UUID;

-- Create a table for availability requests if it doesn't exist (optional, but good practice)
CREATE TABLE IF NOT EXISTS availability_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- e.g. "REQ-001"
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    requested_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key if table exists
DO $$ BEGIN
    ALTER TABLE material_take_off 
    ADD CONSTRAINT fk_availability_request 
    FOREIGN KEY (availability_request_id) 
    REFERENCES availability_requests(id) 
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
