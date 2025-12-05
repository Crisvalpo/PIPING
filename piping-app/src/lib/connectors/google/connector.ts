import { IDataConnector } from '../interfaces'

export class GoogleConnector implements IDataConnector {
    private config: any;
    private credentials: any;

    constructor(config: any, credentials: any) {
        this.config = config;
        this.credentials = credentials;
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        return {
            success: false,
            message: 'Conector Google no implementado aún (Fase 2.2)'
        };
    }

    async getSpools(filters?: Record<string, any>): Promise<any[]> {
        throw new Error('Método no implementado: Google Sheets Connector');
    }

    async getMateriales(): Promise<any[]> {
        throw new Error('Método no implementado: Google Sheets Connector');
    }
}
