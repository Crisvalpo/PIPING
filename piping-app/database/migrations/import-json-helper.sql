-- ===================================================================
-- API ENDPOINT HELPER: Carga masiva desde frontend
-- ===================================================================
-- Script JSON para importar desde la aplicación web
-- ===================================================================

-- Endpoint: POST /api/personal/bulk
-- Body format:
/*
{
  "workers": [
    {
      "rut": "8.935.849-3",
      "nombre": "NAVARRO PAVEZ ROBERTO NARCISO",
      "cargo": "SUPERVISOR PIPING"
    },
    ...
  ]
}
*/

-- Estructura JSON completa de los 24 trabajadores:
SELECT jsonb_build_object(
    'workers', jsonb_agg(
        jsonb_build_object(
            'rut', rut,
            'nombre', nombre,
            'email', email,
            'cargo', 'Por asignar'
        )
    )
) as bulk_import_json
FROM (VALUES
    ('8.935.849-3', 'NAVARRO PAVEZ ROBERTO NARCISO'),
    ('16.486.752-8', 'VIDAL MARTINEZ ALEXANDER EDUARDO'),
    ('7.767.526-4', 'ALFARO CARMONA OMAR DEL CARMEN'),
    ('10.894.011-5', 'CARRERA CASTILLO IVAN GUILLERMO'),
    ('6.405.601-8', 'ESPINOZA FUENTES CLAUDIO ENRIQUE'),
    ('16.333.732-0', 'VERGARA TRONCOSO MICHAEL PAUL'),
    ('9.309.305-4', 'ZAPATA VALDEBENITO MARCELO ENRIQUE'),
    ('10.227.043-6', 'CUEVAS RIVERA SERGIO ANDRES'),
    ('16.331.372-3', 'MONTECINO DELGADO ANGELO PATRICIO'),
    ('6.238.439-5', 'ORDENES ESCALONA SERGIO ANANIAS'),
    ('10.665.285-6', 'GUTIERREZ VASQUEZ SERGIO EDGARDO'),
    ('11.986.568-9', 'TOLEDO ORELLANA DIMITRI WLADIMIR'),
    ('9.432.053-4', 'CANALES SANHUEZA CUSTODIO HERNAN'),
    ('17.461.124-6', 'LUNA GONZALEZ ARIEL ENRIQUE'),
    ('10.184.969-4', 'PINCHEIRA ORTIZ HECTOR ARMANDO'),
    ('12.768.459-6', 'MONTOYA CEA LUIS ALFREDO'),
    ('17.221.810-5', 'TORRES VIVALLOS OSCAR BENJAMIN'),
    ('15.096.998-0', 'SALDIVIA AÑAZCO CARLOS VILDO'),
    ('15.083.473-2', 'AÑAZCO ITURRIETA VILDO ANDRES'),
    ('21.192.964-2', 'HERRERA RIQUELME MATIAS JESUS'),
    ('20.707.791-7', 'VALENCIA GONZALEZ VICTOR ELIAM'),
    ('13.192.025-3', 'FERNANDEZ CASTRO JONNY GUILLERMO'),
    ('20.175.488-7', 'LARA LUKE NICOLAS ALEXANDER'),
    ('15.974.840-5', 'BUGUEÑO SOTO JOSE LUIS')
) AS t(rut, nombre, email);

-- Para importar, copiar el resultado JSON y enviarlo a: POST /api/personal/bulk
