'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUp, signOut } from '@/services/auth'
import { validateToken, markInvitacionAsUsed, type Invitacion } from '@/services/invitaciones'
import Link from 'next/link'

function RegistroForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')


    const [invitacion, setInvitacion] = useState<Invitacion | null>(null)
    const [validandoToken, setValidandoToken] = useState(!!token)
    const [tokenInvalido, setTokenInvalido] = useState(false)

    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        telefono: '',
        password: '',
        confirmPassword: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Validar token de invitación al cargar y limpiar sesión previa
    useEffect(() => {
        async function init() {
            // Asegurar que no haya sesión activa al intentar registrarse
            await signOut()

            if (!token) {
                setValidandoToken(false)
                return
            }

            const resultado = await validateToken(token)

            if (resultado.success && resultado.data) {
                setInvitacion(resultado.data)
                // Pre-llenar el email si viene en la invitación
                setFormData(prev => ({
                    ...prev,
                    correo: resultado.data!.email
                }))
            } else {
                setTokenInvalido(true)
            }

            setValidandoToken(false)
        }

        init()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validar contraseñas
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            setLoading(false)
            return
        }

        // Agregar +56 automáticamente al teléfono
        const telefonoConPrefijo = `+56${formData.telefono.replace(/^\+56/, '')}`

        // Determinar el rol según si hay invitación o no
        const rol = invitacion ? invitacion.rol : 'USUARIO' // Default usuario si no hay invitación

        const response = await signUp({
            nombre: formData.nombre,
            correo: formData.correo,
            telefono: telefonoConPrefijo,
            rol: rol,
            password: formData.password,
            // Campos multi-tenant
            empresa_id: invitacion?.empresa_id || null,
            proyecto_id: invitacion?.proyecto_id || null, // Si la invitación tiene proyecto específico
            es_admin_proyecto: false,
            estado_usuario: invitacion ? 'ACTIVO' : 'PENDIENTE',
            invitado_por: null, // Podríamos guardar quién invitó si lo tuviéramos en la invitación
            token_invitacion: token || null,
        })

        if (response.success) {
            // Si hay invitación, marcarla como usada
            if (token && response.user?.id) {
                await markInvitacionAsUsed(token, response.user.id)
            }

            // Redirigir según el estado
            if (invitacion) {
                // Con invitación → Ir directo al dashboard
                router.push('/dashboard')
            } else {
                // Sin invitación → Ir a onboarding (ahora solo para unirse a empresas)
                window.location.href = '/onboarding'
            }
        } else {
            // Mensaje amigable para correo duplicado
            if (response.message.includes('duplicate key') || response.message.includes('users_correo_key')) {
                setError('Este correo ya está registrado. Por favor, inicia sesión.')
            } else {
                setError(response.message)
            }
        }

        setLoading(false)
    }

    // Mostrar loading mientras valida el token
    if (validandoToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Validando invitación...</p>
                </div>
            </div>
        )
    }

    // Mostrar error si el token es inválido
    if (tokenInvalido) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
                <div className="w-full max-w-md">
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                        <div className="inline-block p-4 bg-red-500/20 rounded-2xl mb-4">
                            <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Invitación Inválida</h1>
                        <p className="text-purple-200 mb-6">
                            El link de invitación no es válido o ya ha sido utilizado.
                        </p>
                        <Link
                            href="/registro"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                        >
                            Registrarse sin invitación
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
            <div className="w-full max-w-2xl">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 hover:scale-[1.01]">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
                            <svg
                                className="w-12 h-12 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            {invitacion ? 'Aceptar Invitación' : 'Crear Cuenta'}
                        </h1>
                        <p className="text-purple-200">
                            {invitacion
                                ? `Has sido invitado a unirte a ${invitacion.empresa?.nombre}`
                                : 'Únete a nosotros hoy'
                            }
                        </p>
                    </div>

                    {/* Info de invitación */}
                    {invitacion && (
                        <div className="mb-6 bg-green-500/20 border border-green-400/50 text-green-200 px-4 py-3 rounded-xl">
                            <p className="text-sm font-medium mb-2">✅ Invitación Válida</p>
                            <div className="text-sm space-y-1">
                                <p><strong>Empresa:</strong> {invitacion.empresa?.nombre}</p>
                                <p><strong>Rol asignado:</strong> {invitacion.rol}</p>
                            </div>
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Nombre completo */}
                        <div className="space-y-2">
                            <label htmlFor="nombre" className="block text-sm font-medium text-purple-100">
                                Nombre Completo
                            </label>
                            <input
                                id="nombre"
                                type="text"
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                placeholder="Juan Pérez"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="correo" className="block text-sm font-medium text-purple-100">
                                Correo Electrónico
                            </label>
                            <input
                                id="correo"
                                type="email"
                                required
                                value={formData.correo}
                                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                disabled={!!invitacion}
                                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="tu@email.com"
                            />
                            {invitacion && (
                                <p className="text-xs text-purple-300">Email pre-asignado por la invitación</p>
                            )}
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-2">
                            <label htmlFor="telefono" className="block text-sm font-medium text-purple-100">
                                Teléfono (Chile)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-purple-300 font-medium">+56</span>
                                </div>
                                <input
                                    id="telefono"
                                    type="tel"
                                    required
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    className="block w-full pl-14 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    placeholder="9 1234 5678"
                                    pattern="[0-9]{9}"
                                    title="Ingrese 9 dígitos sin espacios"
                                />
                            </div>
                            <p className="text-xs text-purple-300 mt-1">Ingrese solo los 9 dígitos sin el +56</p>
                        </div>

                        {/* Passwords en grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Password */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-purple-100">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-100">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Información sobre el rol */}
                        {!invitacion && (
                            <div className="bg-blue-500/20 border border-blue-400/50 text-blue-200 px-4 py-3 rounded-xl">
                                <p className="text-sm">
                                    ℹ️ Tu cuenta será creada con estado <strong>PENDIENTE</strong>. Deberás completar información sobre tu empresa y proyecto, y esperar la aprobación de un administrador.
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6"
                        >
                            {loading ? (
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
                                    Registrando...
                                </span>
                            ) : (
                                invitacion ? 'Aceptar Invitación y Crear Cuenta' : 'Crear Cuenta'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-purple-200">
                            ¿Ya tienes cuenta?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-pink-400 hover:text-pink-300 transition-colors duration-200"
                            >
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RegistroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        }>
            <RegistroForm />
        </Suspense>
    )
}

