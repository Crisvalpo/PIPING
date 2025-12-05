'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getUserCount } from '@/services/stats'
import Logo from '@/components/Logo'

export default function Home() {
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      const total = await getUserCount()
      setCount(total)
    }
    fetchCount()
  }, [])

  // Animación del contador
  useEffect(() => {
    if (count === 0) return

    const duration = 2000 // 2 segundos
    const steps = 60
    const increment = count / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= count) {
        setDisplayCount(count)
        clearInterval(timer)
      } else {
        setDisplayCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [count])

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://png.pngtree.com/background/20250124/original/pngtree-oil-gas-pipeline-background-images-picture-image_15885396.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-black/80 backdrop-blur-sm"></div>
      </div>

      <div className="w-full max-w-6xl mx-auto text-center relative z-10">
        {/* Hero Section */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 md:p-12 mb-12 relative overflow-hidden animate-fade-in">

          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl mb-6 shadow-lg transform hover:scale-105 transition-transform duration-300">
            <Logo className="text-white" size={80} />
          </div>

          <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight break-words drop-shadow-lg">
            Bienvenido a <br className="md:hidden" />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">LukeAPP</span>
          </h1>

          <p className="text-lg md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto px-2 font-light leading-relaxed">
            Tu plataforma de gestión moderna y segura. Comienza tu viaje hoy y descubre todas las posibilidades para tu industria.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/registro"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-purple-600/50 transform hover:scale-105 transition-all duration-200"
            >
              Crear Cuenta
            </Link>

            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transform hover:scale-105 transition-all duration-200 backdrop-blur-md"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Experience Section */}
        <div className="mb-16 animate-fade-in-up delay-100">
          <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-md">Experiencia Comprobada</h2>
          <p className="text-xl text-purple-200 mb-10 max-w-3xl mx-auto">
            Contamos con amplia experiencia en trabajos mineros y refinería, brindando soluciones robustas para entornos exigentes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mining Card */}
            <div className="group relative overflow-hidden rounded-2xl shadow-2xl border border-white/10 h-64 md:h-80">
              <div
                className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
                style={{ backgroundImage: 'url("https://www.reporteminero.cl/files/691e0ea5e49e9_1200x719.jpg")' }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 p-6 text-left">
                <div className="inline-block p-2 bg-orange-500/20 rounded-lg mb-2 backdrop-blur-md border border-orange-500/30">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Minería</h3>
                <p className="text-gray-300 text-sm">Gestión integral para faenas mineras</p>
              </div>
            </div>

            {/* Refinery Card */}
            <div className="group relative overflow-hidden rounded-2xl shadow-2xl border border-white/10 h-64 md:h-80">
              <div
                className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
                style={{ backgroundImage: 'url("https://ceyfra.com/wp-content/uploads/2018/01/piping-2-1.jpg")' }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 p-6 text-left">
                <div className="inline-block p-2 bg-blue-500/20 rounded-lg mb-2 backdrop-blur-md border border-blue-500/30">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Refinería</h3>
                <p className="text-gray-300 text-sm">Soluciones especializadas para plantas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección Para Empresas */}
        <div className="mb-12 animate-fade-in-up delay-200">
          <div className="backdrop-blur-xl bg-gradient-to-r from-gray-900/60 to-slate-900/60 rounded-2xl border border-yellow-500/30 p-8 max-w-3xl mx-auto transform hover:scale-[1.02] transition-all duration-300 shadow-2xl shadow-yellow-900/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/30">
                    Empresas
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¿Buscas implementar LukeAPP?</h3>
                <p className="text-gray-300 text-sm">
                  Gestiona proyectos de gran escala con nuestra solución empresarial. <br className="hidden md:block" />
                  Solicita una demo personalizada para tu organización.
                </p>
              </div>
              <a
                href="mailto:ventas@lukeapp.com?subject=Solicitud%20de%20Demo%20Corporativa&body=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20LukeAPP%20para%20mi%20empresa."
                className="whitespace-nowrap px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contactar Ventas
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up delay-300">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105 hover:bg-white/15">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl inline-block mb-4 shadow-lg shadow-green-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Seguro</h3>
            <p className="text-purple-200 text-sm">Tus datos están protegidos con la mejor tecnología de encriptación</p>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105 hover:bg-white/15">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl inline-block mb-4 shadow-lg shadow-blue-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Rápido</h3>
            <p className="text-purple-200 text-sm">Experiencia fluida y optimizada para máxima velocidad</p>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105 hover:bg-white/15">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl inline-block mb-4 shadow-lg shadow-purple-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fácil</h3>
            <p className="text-purple-200 text-sm">Interfaz intuitiva diseñada para tu comodidad</p>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105 hover:bg-white/15">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl inline-block mb-4 shadow-lg shadow-orange-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Comunidad</h3>
            <div className="text-purple-200">
              <span className="text-3xl font-bold text-white tabular-nums block mb-1">{displayCount.toLocaleString()}</span>
              <span className="text-sm">Usuarios Registrados</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-purple-300 text-sm">
          <p>🚀 Construido con Next.js y Supabase</p>
        </div>
      </div>
    </div>
  )
}
