import { NextResponse } from 'next/server'
import { DataConnectorFactory } from '@/lib/connectors/factory'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    try {
        // 1. Obtener el conector a través del Factory
        const connector = await DataConnectorFactory.getConnector(projectId)

        // 2. Probar conexión
        const connectionTest = await connector.testConnection()

        // 3. Si es exitosa, intentar traer datos de prueba
        let data = null
        if (connectionTest.success) {
            data = await connector.getSpools()
        }

        return NextResponse.json({
            connectorType: connector.constructor.name,
            connection: connectionTest,
            dataPreview: data
        })

    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
