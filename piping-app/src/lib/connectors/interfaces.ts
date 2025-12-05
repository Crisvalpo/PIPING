export interface IDataConnector {
    /**
     * Verifica si la conexión con el origen de datos es válida
     */
    testConnection(): Promise<{ success: boolean; message: string }>;

    /**
     * Obtiene la lista de Spools del proyecto
     * @param filters Filtros opcionales
     */
    getSpools(filters?: Record<string, any>): Promise<any[]>;

    /**
     * Obtiene la lista de Materiales del proyecto
     */
    getMateriales(): Promise<any[]>;
}
