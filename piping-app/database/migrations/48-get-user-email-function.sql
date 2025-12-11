-- Migration: Create function to get user email from auth.users
-- Date: 2024-12-11
-- Allows querying user emails from client code safely

-- Create a function to get user email by ID
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_id;
    
    RETURN user_email;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_user_email IS 'Gets user email from auth.users for display purposes';
