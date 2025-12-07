'use client'

// Custom layout for Daily Report - Full width, similar to Cuadrillas
import { usePathname } from 'next/navigation'

export default function DailyReportLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // This layout is just a wrapper, the full width logic is handled in AppLayout 
    // via path detection or we can enforce it here if we bypassed AppLayout.
    // However, AppLayout is top-level.
    // Since we added logic to AppLayout to detect '/cuadrillas/manage', we should also add 
    // '/reporte-diario' to that check in AppLayout.tsx!

    return (
        <div className="w-full h-full">
            {children}
        </div>
    )
}
