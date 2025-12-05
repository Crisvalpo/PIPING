import { createClient } from '@supabase/supabase-js'
import { IDataConnector } from './interfaces'
import { SupabaseConnector } from './supabase/connector'
import { GoogleConnector } from './google/connector'
// import { SharePointConnector } from './sharepoint/connector'

export class DataConnectorFactory {
    /**
     * Obtiene la instancia del conector adecuado para un proyecto
     * @param projectId ID del proyecto
     */
    static async getConnector(projectId: string): Promise<IDataConnector> {
        // 1. Inicializar cliente Supabase
        // Usamos la clave anónima porque la Service Role no está configurada en este entorno
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 2. Obtener configuración del proyecto y su empresa
        const { data: proyecto, error } = await supabase
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

        if (error || !proyecto) {
            throw new Error(`No se pudo cargar la configuración del proyecto: ${error?.message}`);
        }

        // Casting explícito para evitar errores de TS con relaciones anidadas
        const empresa = (proyecto as any).empresa;
        const tipoDatos = empresa?.tipo_datos || 'lukeapp';

        console.log(`[Factory] Creando conector tipo '${tipoDatos}' para proyecto ${projectId}`);

        // 3. Instanciar el conector correcto
        switch (tipoDatos) {
            case 'lukeapp':
                return new SupabaseConnector(projectId);

            case 'google':
                return new GoogleConnector(proyecto.config_origen, empresa?.data_config);

            case 'sharepoint':
                // return new SharePointConnector(...);
                throw new Error('Conector SharePoint no implementado aún');

            default:
                throw new Error(`Tipo de datos no soportado: ${tipoDatos}`);
        }
    }
}
