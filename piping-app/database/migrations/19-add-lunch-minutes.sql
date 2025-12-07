-- Add lunch_break_minutes to project_shifts
-- This column was missing in the initial schema but is used by the frontend

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_shifts' 
        AND column_name = 'lunch_break_minutes'
    ) THEN
        ALTER TABLE project_shifts 
        ADD COLUMN lunch_break_minutes INTEGER DEFAULT 60;
    END IF;
END $$;
