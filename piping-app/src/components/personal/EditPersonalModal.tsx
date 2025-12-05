'use client'

import { useState } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'

interface EditPersonalModalProps {
    worker: {
        rut: string
        nombre: string
        email?: string
        telefono?: string
        rol?: string
    }
    allPersonal: any[]
    onClose: () => void
    onSuccess: () => void
}

export default function EditPersonalModal({ worker, allPersonal, onClose, onSuccess }: EditPersonalModalProps) {
    const [formData, setFormData] = useState({
        nombre: worker.nombre,
        email: worker.email || '',
        telefono: worker.telefono || '+56',
        cargo: worker.rol || ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Extraer cargos únicos de todo el personal
    const cargosUnicos = Array.from(new Set(allPersonal.map(p => p.rol).filter(Boolean))).sort()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validar teléfono: debe ser +56 seguido de 9 dígitos
        const phoneRegex = /^\+56\d{9}$/
        if (formData.telefono && formData.telefono.trim() !== '' && formData.telefono !== '+56') {
            if (!phoneRegex.test(formData.telefono)) {
                setError('El teléfono debe tener el formato +56 seguido de 9 dígitos (ej: +56912345678)')
                setLoading(false)
                return
            }
        }

        try {
            // Asegurar que el RUT esté correctamente codificado
            const encodedRut = encodeURIComponent(worker.rut)
            console.log('Editing worker:', {
                rut: worker.rut,
                encodedRut,
                url: `/api/personal/${encodedRut}`,
                formData
            })

            const res = await fetch(`/api/personal/${encodedRut}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            console.log('Response:', { status: res.status, data })

            if (res.ok && data.success) {
                onSuccess()
                onClose()
            } else {
                setError(data.error || `Error al actualizar (${res.status})`)
            }
        } catch (err: any) {
            console.error('Error updating worker:', err)
            setError('Error de conexión: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white">Editar Trabajador</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="relative p-6 space-y-4">
                    {/* RUT (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                            RUT
                        </label>
                        <input
                            type="text"
                            value={worker.rut}
                            disabled
                            className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-white/40 mt-1">
                            ⚠️ El RUT no puede ser modificado. Si está incorrecto, elimina el registro y vuelve a importar.
                        </p>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                            Nombre Completo <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            required
                        />
                    </div>

                    {/* Cargo/Rol */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                            Cargo/Rol
                        </label>
                        <input
                            type="text"
                            list="cargo-options"
                            value={formData.cargo}
                            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                            placeholder="Ej: Soldador, Maestro, Inspector..."
                        />
                        <datalist id="cargo-options">
                            {cargosUnicos.map(cargo => (
                                <option key={cargo} value={cargo} />
                            ))}
                        </datalist>
                        <p className="text-xs text-white/40 mt-1">
                            💡 Puedes escribir cualquier cargo. Las sugerencias son de cargos ya registrados.
                        </p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                            placeholder="ejemplo@correo.com"
                        />
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                            placeholder="+56912345678"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
