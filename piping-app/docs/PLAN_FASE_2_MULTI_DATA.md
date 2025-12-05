# 🗺️ Plan Fase 2: Arquitectura Multi-Empresa y Multi-Data Source

Este documento define la estrategia técnica para implementar la lógica de negocio multi-origen de datos en LUKEAPP.

---

## 1. 🏗️ Modelo de Datos (Database Schema)

Necesitamos extender las tablas `empresas` y `proyectos` para almacenar la configuración de conexión. Usaremos columnas `JSONB` para flexibilidad.

### Tabla `empresas`
Agregar configuración global de la empresa.

```sql
ALTER TABLE public.empresas 
ADD COLUMN tipo_datos VARCHAR(50) CHECK (tipo_datos IN ('sharepoint', 'google', 'lukeapp')),
ADD COLUMN data_config JSONB; -- Para credenciales globales o configuración base
```

**Ejemplo `data_config` (SharePoint Global):**
```json
{
  "tenant_id": "uuid-azure",
  "client_id": "uuid-app",
  "client_secret": "encrypted_secret" 
}
```

### Tabla `proyectos`
Agregar configuración específica del proyecto.

```sql
ALTER TABLE public.proyectos
ADD COLUMN config_origen JSONB;
```

**Ejemplo `config_origen` (SharePoint Site):**
```json
{
  "site_url": "https://empresa.sharepoint.com/sites/ProyectoA",
  "lists": {
    "spools": "guid-lista-spools",
    "materiales": "guid-lista-materiales"
  }
}
```

---

## 2. 🔌 Arquitectura de Conectores (Backend)

Implementaremos un patrón **Factory + Strategy** para abstraer la fuente de datos. El frontend nunca sabrá si los datos vienen de SharePoint o Google.

### Estructura de Directorios Propuesta

```
src/
  lib/
    connectors/
      interfaces.ts       # Definición de IDataConnector
      factory.ts          # DataConnectorFactory
      sharepoint/
        connector.ts      # Implementación SharePoint
        graph-client.ts   # Cliente Microsoft Graph
      google/
        connector.ts      # Implementación Google
        sheets-client.ts  # Cliente Google Sheets
      supabase/
        connector.ts      # Implementación Interna
```

### Definición de Interfaces (`interfaces.ts`)

```typescript
export interface IDataConnector {
  // Métodos genéricos que todo conector debe implementar
  getSpools(projectId: string): Promise<Spool[]>;
  getMateriales(projectId: string): Promise<Material[]>;
  updateSpoolStatus(projectId: string, spoolId: string, status: string): Promise<void>;
  // ... otros métodos de negocio
}
```

### Factory (`factory.ts`)

```typescript
export class DataConnectorFactory {
  static async getConnector(proyectoId: string): Promise<IDataConnector> {
    // 1. Leer config del proyecto y empresa desde DB
    const proyecto = await getProyectoConfig(proyectoId);
    
    // 2. Instanciar el conector correcto
    switch (proyecto.empresa.tipo_datos) {
      case 'sharepoint':
        return new SharePointConnector(proyecto.config_origen, proyecto.empresa.data_config);
      case 'google':
        return new GoogleConnector(proyecto.config_origen, proyecto.empresa.data_config);
      case 'lukeapp':
        return new SupabaseConnector(proyecto.id);
      default:
        throw new Error('Tipo de datos no soportado');
    }
  }
}
```

---

## 3. 🛡️ Seguridad y Credenciales

El manejo de secretos (Client Secrets, Service Account Keys) es crítico.

### Estrategia de Almacenamiento
1.  **Variables de Entorno (Recomendado para SaaS único)**: Si LUKEAPP usa una sola App Registration para todos los clientes SharePoint, las credenciales van en `.env.local`.
2.  **Base de Datos (Recomendado para Multi-Tenant real)**: Si cada empresa trae su propia App Registration/Service Account.
    *   ⚠️ **IMPORTANTE**: Los secretos en `data_config` deben estar **ENCRIPTADOS** en reposo.
    *   Podemos usar una clave maestra de LUKEAPP para encriptar/desencriptar estos campos al leer/escribir.

### Flujo de Autenticación
- **SharePoint**: Usar `Client Credentials Flow` (sin usuario interactivo) con los permisos de aplicación (`Sites.ReadWrite.All`).
- **Google**: Usar `Service Account` cargando el JSON de credenciales.

---

## 4. 🚀 API Routes (Next.js)

El frontend consumirá los datos a través de endpoints agnósticos.

**Ejemplo: Obtener Spools**
`GET /api/proyectos/[id]/spools`

```typescript
// src/app/api/proyectos/[id]/spools/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Obtener conector
    const connector = await DataConnectorFactory.getConnector(params.id);
    
    // 2. Ejecutar operación (transparente al origen)
    const spools = await connector.getSpools(params.id);
    
    return NextResponse.json(spools);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 5. 📅 Roadmap de Implementación

### Paso 1: Preparación de Base de Datos
- Crear migración SQL para agregar columnas `tipo_datos`, `data_config`, `config_origen`.
- Actualizar tipos TypeScript.

### Paso 2: Implementación de Interfaces
- Definir `IDataConnector` con los métodos base (lectura de spools, etc.).
- Crear estructura de carpetas.

### Paso 3: Conector Mock / Supabase
- Implementar primero el conector `SupabaseConnector` (nativo) para validar el flujo.
- Crear un `MockConnector` para pruebas sin conexión real.

### Paso 4: Conector SharePoint
- Implementar cliente Microsoft Graph.
- Configurar App Registration de prueba.
- Mapear datos de SharePoint Lists a modelo interno.

### Paso 5: Conector Google
- Implementar cliente Google Sheets.
- Configurar Service Account.
- Mapear columnas de Sheet a modelo interno.

### Paso 6: UI de Configuración
- Crear formularios en `/admin/super` para configurar los orígenes de datos de empresas y proyectos.
