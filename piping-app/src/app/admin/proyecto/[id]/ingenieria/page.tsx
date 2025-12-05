'use client'

import { use } from 'react'
import EngineeringManager from '@/components/engineering/EngineeringManager'

export default function IngenieriaPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params Promise using React.use()
    const unwrappedParams = use(params)
    const projectId = unwrappedParams.id

    if (!projectId) {
        return (
            <div className="p-6 max-w-6xl mx-auto text-white">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400">Cargando proyecto...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-6xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6">Ingeniería - Control Documental</h1>
            <EngineeringManager projectId={projectId} />
        </div>
    )
}
