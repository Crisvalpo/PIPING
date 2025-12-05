-- ===================================================================
-- CARGA MASIVA: Personal del Proyecto
-- ===================================================================
-- Importa todos los trabajadores desde la tabla de RRHH
-- ===================================================================

-- Insertar personal masivamente
INSERT INTO personal (rut, nombre, email, activo) VALUES
('8.935.849-3', 'NAVARRO PAVEZ ROBERTO NARCISO', NULL, TRUE),
('16.486.752-8', 'VIDAL MARTINEZ ALEXANDER EDUARDO', NULL, TRUE),
('7.767.526-4', 'ALFARO CARMONA OMAR DEL CARMEN', NULL, TRUE),
('10.894.011-5', 'CARRERA CASTILLO IVAN GUILLERMO', NULL, TRUE),
('6.405.601-8', 'ESPINOZA FUENTES CLAUDIO ENRIQUE', NULL, TRUE),
('16.333.732-0', 'VERGARA TRONCOSO MICHAEL PAUL', NULL, TRUE),
('9.309.305-4', 'ZAPATA VALDEBENITO MARCELO ENRIQUE', NULL, TRUE),
('10.227.043-6', 'CUEVAS RIVERA SERGIO ANDRES', NULL, TRUE),
('16.331.372-3', 'MONTECINO DELGADO ANGELO PATRICIO', NULL, TRUE),
('6.238.439-5', 'ORDENES ESCALONA SERGIO ANANIAS', NULL, TRUE),
('10.665.285-6', 'GUTIERREZ VASQUEZ SERGIO EDGARDO', NULL, TRUE),
('11.986.568-9', 'TOLEDO ORELLANA DIMITRI WLADIMIR', NULL, TRUE),
('9.432.053-4', 'CANALES SANHUEZA CUSTODIO HERNAN', NULL, TRUE),
('17.461.124-6', 'LUNA GONZALEZ ARIEL ENRIQUE', NULL, TRUE),
('10.184.969-4', 'PINCHEIRA ORTIZ HECTOR ARMANDO', NULL, TRUE),
('12.768.459-6', 'MONTOYA CEA LUIS ALFREDO', NULL, TRUE),
('17.221.810-5', 'TORRES VIVALLOS OSCAR BENJAMIN', NULL, TRUE),
('15.096.998-0', 'SALDIVIA AÑAZCO CARLOS VILDO', NULL, TRUE),
('15.083.473-2', 'AÑAZCO ITURRIETA VILDO ANDRES', NULL, TRUE),
('21.192.964-2', 'HERRERA RIQUELME MATIAS JESUS', NULL, TRUE),
('20.707.791-7', 'VALENCIA GONZALEZ VICTOR ELIAM', NULL, TRUE),
('13.192.025-3', 'FERNANDEZ CASTRO JONNY GUILLERMO', NULL, TRUE),
('20.175.488-7', 'LARA LUKE NICOLAS ALEXANDER', NULL, TRUE),
('15.974.840-5', 'BUGUEÑO SOTO JOSE LUIS', NULL, TRUE)
ON CONFLICT (rut) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    activo = EXCLUDED.activo;

-- Verificar cuántos se insertaron
SELECT COUNT(*) as total_personal FROM personal;

-- Ver resumen por cargo (basado en tabla original, para referencia)
DO $$
BEGIN
    RAISE NOTICE '
===== RESUMEN DE PERSONAL IMPORTADO =====

SUPERVISORES: 10 personas
- Navarro Pavez Roberto Narciso
- Vidal Martinez Alexander Eduardo  
- Alfaro Carmona Omar Del Carmen
- Carrera Castillo Ivan Guillermo
- Cuevas Rivera Sergio Andres
- Gutierrez Vasquez Sergio Edgardo
- Canales Sanhueza Custodio Hernan
- Luna Gonzalez Ariel Enrique
- Pincheira Ortiz Hector Armando
- Montoya Cea Luis Alfredo

CAPATACES: 3 personas  
- Torres Vivallos Oscar Benjamin
- Saldivia Añazco Carlos Vildo
- Fernandez Castro Jonny Guillermo

MAESTROS: 5 personas
- Añazco Iturrieta Vildo Andres (MAESTRO MAYOR)
- Herrera Riquelme Matias Jesus (MAESTRO PRIMERA)
- Valencia Gonzalez Victor Eliam (MAESTRO PRIMERA)
- Lara Luke Nicolas Alexander (MAESTRO PRIMERA)
- Bugueño Soto Jose Luis (MAESTRO PRIMERA)

COORDINADORES/JEFES: 3 personas
- Espinoza Fuentes Claudio Enrique (COORDINADOR)
- Zapata Valdebenito Marcelo Enrique (JEFE DE AREA)
- Toledo Orellana Dimitri Wladimir (JEFE DE AREA)

OTROS: 3 personas
- Vergara Troncoso Michael Paul (CONTROL PROYECTO)
- Montecino Delgado Angelo Patricio (INSPECTOR CALIDAD)
- Ordenes Escalona Sergio Ananias (INSPECTOR CALIDAD)

TOTAL: 24 trabajadores
==========================================
';
END $$;

-- Lista final de personal insertado
SELECT 
    rut,
    nombre,
    activo,
    created_at
FROM personal
ORDER BY nombre;
