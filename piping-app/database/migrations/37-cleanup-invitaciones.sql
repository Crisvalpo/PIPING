-- 1. Rename columns to standard English names
DO $$
BEGIN
    -- Rename creado_por -> created_by
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitaciones' AND column_name = 'creado_por') THEN
        ALTER TABLE public.invitaciones RENAME COLUMN creado_por TO created_by;
    END IF;

    -- Rename usado_por -> used_by
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitaciones' AND column_name = 'usado_por') THEN
        ALTER TABLE public.invitaciones RENAME COLUMN usado_por TO used_by;
    END IF;

    -- Rename fecha_uso -> used_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitaciones' AND column_name = 'fecha_uso') THEN
        ALTER TABLE public.invitaciones RENAME COLUMN fecha_uso TO used_at;
    END IF;
END $$;

-- 2. Drop redundant legacy columns
ALTER TABLE public.invitaciones DROP COLUMN IF EXISTS fecha_creacion;
ALTER TABLE public.invitaciones DROP COLUMN IF EXISTS usado;

-- 3. Cleanup Indexes (optional, but good practice if names changed)
-- Postgres usually keeps indexes working after rename, but names might be confusing.
-- We'll leave them as is for safety unless they conflict.
