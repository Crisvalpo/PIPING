
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();

    // Consultar vista principal
    const { data: viewData, error: viewError } = await supabase
        .from('cuadrillas_full')
        .select('*');

    // Consultar tabla de asignaciones directa
    const { data: soldadores, error: soldError } = await supabase
        .from('soldadores_asignaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    // Consultar tabla cuadrillas directa (para ver capataces)
    const { data: cuadrillas, error: cuadError } = await supabase
        .from('cuadrillas')
        .select('id, nombre, codigo, capataz_rut, supervisor_rut')
        .limit(20);

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Debug DB Check</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #f0f0f0; }
          .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h2 { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-top: 0; color: #333; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; }
          .error { color: red; font-weight: bold; }
          .null { color: #999; italic; }
        </style>
      </head>
      <body>
        <h1>🔍 Database Debug Check</h1>
        
        <div class="section">
          <h2>1. Vista 'cuadrillas_full' (Lo que ve el Frontend)</h2>
          ${viewError ? `<div class="error">Error: ${JSON.stringify(viewError)}</div>` : ''}
          <table>
            <thead>
              <tr><th>ID Cuadrilla</th><th>Nombre/Código</th><th>Capataz RUT</th><th>Soldadores (JSON)</th><th>Maestros (JSON)</th></tr>
            </thead>
            <tbody>
              ${viewData?.map(row => `
                <tr>
                  <td>${row.id}</td>
                  <td>${row.nombre || row.codigo}</td>
                  <td>${row.capataz_rut || '<span class="null">NULL</span>'}</td>
                  <td>${JSON.stringify(row.soldadores)?.substring(0, 100)}...</td>
                  <td>${JSON.stringify(row.maestros)?.substring(0, 100)}...</td>
                </tr>
              `).join('') || '<tr><td colspan="5">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>2. Tabla 'cuadrillas' (Datos Crudos)</h2>
          ${cuadError ? `<div class="error">Error: ${JSON.stringify(cuadError)}</div>` : ''}
          <table>
             <thead><tr><th>ID</th><th>Nombre</th><th>Código</th><th>Capataz RUT (Directo)</th><th>Supervisor RUT (Directo)</th></tr></thead>
             <tbody>
               ${cuadrillas?.map(c => `
                 <tr>
                   <td>${c.id}</td>
                   <td>${c.nombre}</td>
                   <td>${c.codigo}</td>
                   <td><strong>${c.capataz_rut || '<span class="null">NULL</span>'}</strong></td>
                   <td>${c.supervisor_rut || '<span class="null">NULL</span>'}</td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>

        <div class="section">
           <h2>3. Tabla 'soldadores_asignaciones' (Últimos 20)</h2>
           ${soldError ? `<div class="error">Error: ${JSON.stringify(soldError)}</div>` : ''}
           <table>
             <thead><tr><th>ID</th><th>RUT Soldador</th><th>Cuadrilla ID</th><th>Fecha</th><th>Hora Fin</th></tr></thead>
             <tbody>
               ${soldadores?.map(s => `
                 <tr>
                   <td>${s.id}</td>
                   <td>${s.soldador_rut}</td>
                   <td>${s.cuadrilla_id}</td>
                   <td>${s.fecha}</td>
                   <td>${s.hora_fin || '<span style="color:green">ACTIVO</span>'}</td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
        </div>
      </body>
    </html>
    `;

    return new NextResponse(html, { headers: { 'content-type': 'text/html' } });
}
