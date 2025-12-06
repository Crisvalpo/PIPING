'use client'

import { use, useEffect } from 'react'
import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function CuadrillasPage({ params }: PageProps) {
    const { id: proyectoId } = use(params)

    // Redirect to the new manage page
    useEffect(() => {
        redirect(`/proyectos/${proyectoId}/cuadrillas/manage`)
    }, [proyectoId])

    return null
}
