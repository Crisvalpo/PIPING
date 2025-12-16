-- Fix RLS policy to allow SUPER_ADMIN to edit roles
DROP POLICY IF EXISTS "Admin write access" ON app_roles;

CREATE POLICY "Admin write access" ON app_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.rol IN ('ADMIN', 'SUPER_ADMIN')
        )
    );
