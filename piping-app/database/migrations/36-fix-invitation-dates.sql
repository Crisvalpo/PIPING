-- Sync legacy dates
DO $$
BEGIN
    -- Update created_at from fecha_creacion if available
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitaciones' AND column_name = 'fecha_creacion') THEN
        UPDATE public.invitaciones
        SET created_at = fecha_creacion
        WHERE fecha_creacion IS NOT NULL;
    END IF;

    -- Update expires_at? Maybe not needed if they are already used.
    
    -- Sync usado status from estado
    -- If estado is 'USADA', ensure usado is TRUE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitaciones' AND column_name = 'usado') THEN
        UPDATE public.invitaciones
        SET usado = true
        WHERE estado = 'USADA' AND usado = false;
        
        UPDATE public.invitaciones
        SET usado = false
        WHERE estado = 'PENDIENTE' AND usado = true;
    END IF;
END $$;
