# 📊 Flujo de Configuración de Origen de Datos

## Resumen

Este documento describe el flujo completo de configuración de origen de datos para empresas y proyectos en PIPING App.

## 🎯 Tipos de Origen de Datos Soportados

### 1. **LukeApp** (Base de datos propia)
- **Icono**: 🗄️
- **Descripción**: Los datos se almacenan directamente en la base de datos de Supabase
- **Configuración requerida**: Ninguna
- **Uso**: Ideal para empresas que quieren usar la plataforma completa sin integraciones externas

### 2. **Google Sheets** (Hojas de cálculo)
- **Icono**: 📊
- **Descripción**: Los datos se leen desde hojas de Google Sheets
- **Configuración requerida**: 
  - `sheets_id`: ID de la hoja de Google Sheets
  - Ejemplo: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
- **Uso**: Para empresas que ya tienen sus datos en Google Sheets

### 3. **SharePoint** (Microsoft 365)
- **Icono**: 📁
- **Descripción**: Los datos se leen desde sitios de SharePoint
- **Configuración requerida**: 
  - `sharepoint_url`: URL completa del sitio de SharePoint
  - Ejemplo: `https://tuempresa.sharepoint.com/sites/proyecto`
- **Uso**: Para empresas que usan Microsoft 365 y SharePoint

---

## 🏢 Flujo de Creación de Empresa

### Paso 1: Abrir Modal de Creación
El Super Admin accede a `/admin/super/empresas` y hace clic en **"Nueva Empresa"**.

### Paso 2: Completar Información Básica
- **Nombre de la Empresa**: Obligatorio
- **Descripción**: Opcional

### Paso 3: Seleccionar Origen de Datos
El usuario selecciona uno de los tres tipos de origen:

#### Si selecciona **LukeApp**:
- No requiere configuración adicional
- Los datos se almacenarán en `empresas.data_config = {}`

#### Si selecciona **Google Sheets**:
- Debe ingresar el **ID de Google Sheets**
- Se guarda en `empresas.data_config = { sheets_id: "..." }`

#### Si selecciona **SharePoint**:
- Debe ingresar la **URL de SharePoint**
- Se guarda en `empresas.data_config = { sharepoint_url: "..." }`

### Paso 4: Crear Proyecto Inicial (Opcional)
- Checkbox para crear un proyecto inicial
- Si está marcado, se crea un proyecto con la misma configuración de origen

### Paso 5: Guardar
Al hacer clic en **"Crear Empresa"**, se ejecuta:

```typescript
createEmpresaAdmin({
    nombre: "Constructora ABC",
    descripcion: "Empresa de construcción",
    tipoDatos: "google", // o 'lukeapp' o 'sharepoint'
    dataConfig: { sheets_id: "1BxiMVs0..." }, // según el tipo
    crearProyecto: true,
    proyectoNombre: "Proyecto Piloto"
})
```

**Resultado en BD**:
```sql
-- Tabla: empresas
INSERT INTO empresas (nombre, descripcion, tipo_datos, data_config, estado)
VALUES ('Constructora ABC', 'Empresa de construcción', 'google', 
        '{"sheets_id": "1BxiMVs0..."}', 'ACTIVA');

-- Tabla: proyectos (si crearProyecto = true)
INSERT INTO proyectos (empresa_id, nombre, codigo, estado, config_origen)
VALUES (uuid, 'Proyecto Piloto', 'PRO-123', 'ACTIVO', '{}');
```

---

## 📁 Flujo de Creación de Proyecto

### Paso 1: Seleccionar Empresa
Desde la lista de empresas, hacer clic en **"Agregar Proyecto"**.

### Paso 2: Completar Información del Proyecto
- **Nombre del Proyecto**: Obligatorio
- **Descripción**: Opcional

### Paso 3: Configurar Origen de Datos
El modal muestra automáticamente el tipo de origen de datos de la empresa:

#### Si la empresa usa **LukeApp**:
- Mensaje informativo: "Los datos se almacenarán en la base de datos de LukeApp"
- No requiere configuración adicional

#### Si la empresa usa **Google Sheets**:
- Campo para ingresar **ID de Google Sheets específico del proyecto**
- Permite que cada proyecto tenga su propia hoja de cálculo

#### Si la empresa usa **SharePoint**:
- Campo para ingresar **URL de SharePoint específica del proyecto**
- Permite que cada proyecto tenga su propio sitio/carpeta

### Paso 4: Guardar
Al hacer clic en **"Crear Proyecto"**, se ejecuta:

```typescript
createProyecto({
    empresaId: "uuid-empresa",
    nombre: "Edificio Norte",
    descripcion: "Construcción edificio norte",
    configOrigen: { sheets_id: "1BxiMVs0..." } // según el tipo de empresa
})
```

**Resultado en BD**:
```sql
INSERT INTO proyectos (empresa_id, nombre, codigo, descripcion, estado, config_origen)
VALUES ('uuid-empresa', 'Edificio Norte', 'EDI-456', 
        'Construcción edificio norte', 'ACTIVO', 
        '{"sheets_id": "1BxiMVs0..."}');
```

---

## 🔄 Cómo Funciona el Conector

### DataConnectorFactory

Cuando se necesita acceder a datos de un proyecto, el sistema usa el **Factory Pattern**:

```typescript
// 1. Obtener el conector correcto
const connector = await DataConnectorFactory.getConnector(projectId);

// 2. El factory lee la configuración del proyecto y su empresa
const { data: proyecto } = await supabase
    .from('proyectos')
    .select(`
        id,
        config_origen,
        empresa:empresas (
            id,
            tipo_datos,
            data_config
        )
    `)
    .eq('id', projectId)
    .single();

// 3. Instancia el conector correcto según tipo_datos
switch (empresa.tipo_datos) {
    case 'lukeapp':
        return new SupabaseConnector(projectId);
    
    case 'google':
        return new GoogleConnector(proyecto.config_origen, empresa.data_config);
    
    case 'sharepoint':
        return new SharePointConnector(proyecto.config_origen, empresa.data_config);
}

// 4. Usar el conector
const spools = await connector.getSpools();
const materiales = await connector.getMateriales();
```

---

## 📋 Estructura de Datos

### Tabla: `empresas`
```typescript
{
    id: string
    nombre: string
    descripcion?: string
    tipo_datos: 'lukeapp' | 'google' | 'sharepoint'
    data_config: {
        // Para Google Sheets
        sheets_id?: string
        
        // Para SharePoint
        sharepoint_url?: string
        
        // Vacío para LukeApp
    }
    estado: 'ACTIVA' | 'INACTIVA'
}
```

### Tabla: `proyectos`
```typescript
{
    id: string
    empresa_id: string
    nombre: string
    codigo: string
    descripcion?: string
    estado: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'
    config_origen: {
        // Configuración específica del proyecto
        // Hereda el tipo de la empresa pero puede tener valores diferentes
        sheets_id?: string
        sharepoint_url?: string
    }
}
```

---

## 🎨 UI/UX

### Modal de Creación de Empresa
- **Selector visual** con 3 tarjetas (LukeApp, Google Sheets, SharePoint)
- **Campos condicionales** que aparecen según la selección
- **Validación** antes de guardar
- **Colores distintivos**:
  - LukeApp: Púrpura
  - Google Sheets: Verde
  - SharePoint: Azul

### Modal de Creación de Proyecto
- **Muestra el tipo de origen** de la empresa
- **Campos de configuración específicos** según el tipo
- **Mensaje informativo** para LukeApp (no requiere config)
- **Validación** de campos requeridos según el tipo

---

## ✅ Validaciones

### Al crear empresa:
1. Nombre es obligatorio
2. Si tipo = 'google', `googleSheetsId` es obligatorio
3. Si tipo = 'sharepoint', `sharepointUrl` es obligatorio
4. Si `crearProyecto = true`, `proyectoNombre` es obligatorio

### Al crear proyecto:
1. Nombre es obligatorio
2. Si empresa.tipo_datos = 'google', `googleSheetsId` es obligatorio
3. Si empresa.tipo_datos = 'sharepoint', `sharepointUrl` es obligatorio

---

## 🚀 Próximos Pasos

1. **Implementar GoogleConnector**: Leer datos desde Google Sheets API
2. **Implementar SharePointConnector**: Leer datos desde SharePoint API
3. **Agregar autenticación OAuth**: Para Google y Microsoft
4. **Agregar validación de conexión**: Probar la conexión antes de guardar
5. **Agregar UI de edición**: Permitir cambiar la configuración después de crear

---

## 📝 Notas Técnicas

- **Herencia de configuración**: Los proyectos heredan el `tipo_datos` de la empresa, pero pueden tener su propia `config_origen`
- **Factory Pattern**: Permite cambiar fácilmente entre diferentes fuentes de datos
- **Interface común**: Todos los conectores implementan `IDataConnector`
- **Configuración flexible**: `data_config` y `config_origen` son objetos JSON flexibles
