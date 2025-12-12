import { IDataConnector } from '../interfaces'
import { supabase } from '@/lib/supabase'

export class SupabaseConnector implements IDataConnector {
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const { count, error } = await supabase
                .from('proyectos')
                .select('*', { count: 'exact', head: true })
                .eq('id', this.projectId)

            if (error) throw error;

            return {
                success: true,
                message: 'Conexión a Supabase establecida correctamente'
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error de conexión: ${error.message}`
            };
        }
    }

    async getSpools(filters?: Record<string, any>): Promise<any[]> {
        let query = supabase
            .from('spools')
            .select('*')
            .eq('project_id', this.projectId);

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const { data, error } = await query;
        if (error) throw new Error(`Error al obtener spools: ${error.message}`);

        return data || [];
    }

    async getMateriales(): Promise<any[]> {
        // Implementación básica placeholder, ya que la tabla de materiales puede variar
        try {
            const { data, error } = await supabase
                .from('materials') // Asumiendo nombre de tabla standard
                .select('*')
                .eq('project_id', this.projectId);

            if (error) {
                // Si la tabla no existe, retornamos array vacío sin error fatal
                console.warn('Tabla materials no encontrada o error:', error.message);
                return [];
            }
            return data || [];
        } catch (error) {
            return [];
        }
    }
}
