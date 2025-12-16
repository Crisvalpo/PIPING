-- Crear tabla de roles y permisos
CREATE TABLE IF NOT EXISTS app_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 5,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer (necesario para login)
CREATE POLICY "Public read access" ON app_roles
    FOR SELECT USING (true);

-- Política: Solo Admin puede modificar
CREATE POLICY "Admin write access" ON app_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.rol = 'ADMIN'
        )
    );

-- Seed de Roles Iniciales (Basado en src/config/roles.ts)
INSERT INTO app_roles (id, name, description, level, permissions) VALUES
('ADMIN', 'Administrador', 'Superusuario. Configuración total del sistema y la plantilla.', 1, '{"lineas": "CRUD", "isometricos": "CRUD", "spools": "CRUD", "materiales": "CRUD", "testPacks": "CRUD", "juntas": "CRUD", "usuarios": "CRUD", "configuracion": "CRUD", "reportes": "CRUD"}'),
('GERENCIA / JEFE DE PROYECTO', 'Gerencia / Jefe de Proyecto', 'Lector de alto nivel. Necesita ver el panorama general.', 2, '{"lineas": "R", "isometricos": "R", "spools": "R", "materiales": "R", "testPacks": "R", "juntas": "R", "reportes": "R"}'),
('P&C (PLANIFICACIÓN)', 'P&C (Planificación)', 'Lector enfocado en el avance programado vs. real.', 3, '{"lineas": "R", "isometricos": "R", "spools": "R", "reportes": "R"}'),
('CLIENTE / ITO', 'Cliente / ITO', 'Lector externo. Valida el avance y la calidad.', 3, '{"testPacks": "RU", "juntas": "R", "reportes": "R"}'),
('SOLO LECTURA', 'Solo Lectura', 'Rol genérico para consulta interna.', 5, '{"lineas": "R", "isometricos": "R", "spools": "R", "reportes": "R"}'),
('OFICINA TECNICA', 'Oficina Técnica', 'Editor inicial. Carga la ingeniería base del proyecto.', 3, '{"lineas": "CRU", "isometricos": "CRU", "materiales": "CRU"}'),
('CONTROL DOCUMENT', 'Control Document', 'Especialista de O.T. Mantiene vigentes los planos.', 3, '{"isometricos": "CRU"}'),
('TALLER / PREFABRICACIÓN', 'Taller / Prefabricación', 'Editor de estado. Reporta el avance en taller.', 4, '{"spools": "RU"}'),
('LOGISTICA', 'Logística', 'Editor de estado. Control de patio, bodega y despachos.', 4, '{"spools": "RU", "materiales": "RU"}'),
('EXPEDITOR', 'Expeditor', 'Sigue el material antes de que llegue a obra.', 4, '{"materiales": "RU"}'),
('SUPERVISOR TERRENO', 'Supervisor Terreno', 'Editor en campo. Reporta el montaje físico.', 4, '{"spools": "RU", "juntas": "RU"}'),
('CALIDAD / QA', 'Calidad / QA', 'Editor en campo. Registra inspecciones y liberaciones.', 4, '{"juntas": "RU", "testPacks": "RU"}'),
('SECRETARIO PIPING', 'Secretario Piping', 'Gestor de datos. Mantiene el "maestro de spools" actualizado.', 3, '{"lineas": "CRUD", "isometricos": "CRUD", "spools": "CRUD"}'),
('SECRETARIO PRECOM', 'Secretario Precom', 'Gestor de datos. Arma y gestiona los circuitos de prueba.', 3, '{"testPacks": "CRUD", "juntas": "CRU", "isometricos": "R"}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    level = EXCLUDED.level,
    permissions = EXCLUDED.permissions;
