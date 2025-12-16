
import { Metadata } from 'next'
import AppNavbar from '@/components/layout/AppNavbar'
import AdminRolesClient from '@/components/admin/AdminRolesClient'

export const metadata: Metadata = {
    title: 'Gestión de Roles | LukeAPP',
    description: 'Administración de roles y permisos del sistema',
}

// AppNavbar removed (inherited from layout)
export default function AdminRolesPage() {
    return (
        <div className="min-h-screen bg-black/40 backdrop-blur-xl">
            {/* AppNavbar inherited */}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Gestión de Roles y Permisos</h1>
                    <p className="text-gray-400 mt-1">Configura qué acciones puede realizar cada rol en el sistema.</p>
                </div>

                <AdminRolesClient />
            </main>
        </div>
    )
}
