import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { uploadEngineeringDetails } from '@/services/engineering-details';

export async function POST(request: Request) {
    try {
        let supabase = await createClient();

        // Debug: Verificar cookies
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        console.log('[upload-details] Cookies recibidas:', allCookies.map(c => c.name));

        // Intentar obtener token del header Authorization
        const authHeader = request.headers.get('Authorization');
        let user = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            console.log('[upload-details] Token recibido en header, longitud:', token.length);

            try {
                // Crear cliente autenticado con el token
                const supabaseWithToken = createSupabaseJsClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    {
                        global: {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    }
                );

                // Autenticar con el token proporcionado
                const { data, error } = await supabaseWithToken.auth.getUser();

                if (error) {
                    console.error('[upload-details] Error al validar token:', error.message);
                } else {
                    user = data.user;
                    console.log('[upload-details] Usuario autenticado con token:', user?.id);
                    // Usar este cliente para las operaciones subsiguientes
                    supabase = supabaseWithToken as any;
                }
            } catch (e: any) {
                console.error('[upload-details] Excepción al validar token:', e.message);
            }
        }

        // Si no hay token en header, intentar con cookies (fallback)
        if (!user) {
            console.log('[upload-details] No hay token en header, intentando con cookies...');

            try {
                const { data, error } = await supabase.auth.getUser();
                user = data.user;
                console.log('[upload-details] getUser result:', { hasUser: !!user, error: error?.message });
            } catch (e: any) {
                console.error('[upload-details] getUser exception:', e.message);
            }

            // Fallback: intentar con getSession si getUser falla
            if (!user) {
                console.log('[upload-details] Intentando fallback con getSession...');
                try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    user = sessionData.session?.user || null;
                    console.log('[upload-details] getSession result:', { hasUser: !!user });
                } catch (e: any) {
                    console.error('[upload-details] getSession exception:', e.message);
                }
            }
        }

        if (!user) {
            console.error('[upload-details] No se pudo autenticar.');
            return NextResponse.json(
                { success: false, message: 'No autorizado' },
                { status: 401 }
            );
        }

        console.log('[upload-details] Usuario autenticado:', user.id);

        const body = await request.json();
        // Trim whitespace from incoming fields (prevent hidden spaces)
        const isoNumber = typeof body.iso_number === 'string' ? body.iso_number.trim() : '';
        const revisionCode = typeof body.revision_code === 'string' ? body.revision_code.trim() : '';
        const proyectoId = typeof body.proyecto_id === 'string' ? body.proyecto_id.trim() : '';
        const details = body.details;

        console.log('[upload-details] Body recibido (trimmed):', {
            isoNumber,
            revisionCode,
            proyectoId
        });

        if (!isoNumber || !revisionCode || !proyectoId || !details) {
            return NextResponse.json(
                { success: false, message: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }

        const result = await uploadEngineeringDetails(
            isoNumber,
            revisionCode,
            proyectoId,
            details,
            supabase, // Pasar el cliente autenticado
            user.id
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Error en API upload-details:', error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Error interno del servidor'
            },
            { status: 500 }
        );
    }
}
