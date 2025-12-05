'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { getMyProyecto } from '@/services/proyectos'
import { createInvitacion, generarLinkInvitacion } from '@/services/invitaciones'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { ProyectoWithEmpresa } from '@/types'

function InvitarUsuarioContent() {
    const router = useRouter()
    const [proyecto, setProyecto] = useState<ProyectoWithEmpresa | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [invitacionLink, setInvitacionLink] = useState('')

    const [formData, setFormData] = useState({
        email: '',
        rol: 'SOLO LECTURA',
    })

    useEffect(() => {
        async function loadData() {
            const currentUser = await getCurrentUser()
            if (!currentUser) {
                router.push('/login')
                return
            }

            const proyectoData = await getMyProyecto()
            if (proyectoData) {
                setProyecto(proyectoData)
            }

            setLoading(false)
        }

        loadData()
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')
        setSuccess(false)

        if (!proyecto?.id) {
            setError('No se pudo obtener el proyecto')
            setSubmitting(false)
            return
        }

        const result = await createInvitacion({
            proyecto_id: proyecto.id,
            email: formData.email,
            rol: formData.rol,
        })

        if (result.success && result.data) {
            setSuccess(true)
            const link = generarLinkInvitacion(result.data.token)
            setInvitacionLink(link)

            // Limpiar formulario
            setFormData({
                email: '',
                rol: 'SOLO LECTURA',
            })
        } else {
            setError(result.message)
        }

        setSubmitting(false)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(invitacionLink)
        alert('¡Link copiado al portapapeles!')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
            <div className="max-w-3xl mx-auto py-12">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/admin/proyecto')}
                            className="text-purple-200 hover:text-white mb-4 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver
                        </button>
                        <h1 className="text-4xl font-bold text-white mb-2">Invitar Usuario</h1>
                        <p className="text-purple-200">Genera un link de invitación para agregar un nuevo miembro al proyecto</p>
                    </div>

                    {/* Proyecto Info */}
                    {proyecto && (
                        <div className="mb-6 bg-blue-500/20 border border-blue-400/50 text-blue-200 px-4 py-3 rounded-xl">
                            <p className="text-sm">
                                <strong>Proyecto:</strong> {proyecto.nombre} ({proyecto.codigo})
                            </p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && invitacionLink && (
                        <div className="mb-6 bg-green-500/20 border border-green-400/50 rounded-xl p-6">
                            <h3 className="text-green-200 font-semibold mb-3">✅ ¡Invitación creada exitosamente!</h3>
                            <p className="text-green-200 text-sm mb-3">Comparte este link con el usuario:</p>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    readOnly
                                    value={invitacionLink}
                                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
                                    title="Copiar al portapapeles"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Hola, te invito a unirte al proyecto ${proyecto?.nombre} en LukeAPP.\n\nRegístrate aquí:\n${invitacionLink}\n\nSaludos!`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-colors font-medium"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    WhatsApp
                                </a>
                                <a
                                    href={`mailto:?subject=${encodeURIComponent(`Invitación a LukeAPP - Proyecto ${proyecto?.nombre}`)}&body=${encodeURIComponent(`Hola,\n\nTe han invitado a unirte al proyecto ${proyecto?.nombre} en LukeAPP.\n\nPuedes registrarte y aceptar la invitación haciendo clic en el siguiente enlace:\n${invitacionLink}\n\nSaludos,\nEl equipo de LukeAPP`)}`}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                </a>
                            </div>

                            <p className="text-green-200 text-xs mt-4 text-center">
                                💡 Este link no expira y solo puede ser usado una vez
                            </p>
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-purple-100">
                                Email del Usuario *
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                placeholder="usuario@email.com"
                            />
                            <p className="text-xs text-purple-300">El usuario recibirá un link de invitación para registrarse</p>
                        </div>

                        {/* Rol */}
                        <div className="space-y-2">
                            <label htmlFor="rol" className="block text-sm font-medium text-purple-100">
                                Rol Asignado *
                            </label>
                            <select
                                id="rol"
                                value={formData.rol}
                                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            >
                                <optgroup label="Supervisión" className="bg-gray-900">
                                    <option value="GERENCIA / JEFE DE PROYECTO" className="bg-gray-900">Gerencia / Jefe de Proyecto</option>
                                    <option value="P&C (PLANIFICACIÓN)" className="bg-gray-900">P&C (Planificación)</option>
                                </optgroup>
                                <optgroup label="Cliente" className="bg-gray-900">
                                    <option value="CLIENTE / ITO" className="bg-gray-900">Cliente / ITO</option>
                                </optgroup>
                                <optgroup label="Ingeniería" className="bg-gray-900">
                                    <option value="OFICINA TECNICA" className="bg-gray-900">Oficina Técnica</option>
                                    <option value="CONTROL DOCUMENT" className="bg-gray-900">Control Document</option>
                                </optgroup>
                                <optgroup label="Producción" className="bg-gray-900">
                                    <option value="TALLER / PREFABRICACIÓN" className="bg-gray-900">Taller / Prefabricación</option>
                                    <option value="LOGISTICA" className="bg-gray-900">Logística</option>
                                    <option value="EXPEDITOR" className="bg-gray-900">Expeditor</option>
                                </optgroup>
                                <optgroup label="Campo" className="bg-gray-900">
                                    <option value="SUPERVISOR TERRENO" className="bg-gray-900">Supervisor Terreno</option>
                                    <option value="CALIDAD / QA" className="bg-gray-900">Calidad / QA</option>
                                </optgroup>
                                <optgroup label="Gestión de Datos" className="bg-gray-900">
                                    <option value="SECRETARIO PIPING" className="bg-gray-900">Secretario Piping</option>
                                    <option value="SECRETARIO PRECOM" className="bg-gray-900">Secretario Precom</option>
                                </optgroup>
                                <optgroup label="Acceso General" className="bg-gray-900">
                                    <option value="SOLO LECTURA" className="bg-gray-900">Solo Lectura</option>
                                </optgroup>
                            </select>
                            <p className="text-xs text-purple-300">El usuario tendrá este rol al aceptar la invitación</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Generando invitación...
                                </span>
                            ) : (
                                '📧 Generar Link de Invitación'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function InvitarUsuarioPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireProject requireAdmin>
            <InvitarUsuarioContent />
        </ProtectedRoute>
    )
}
