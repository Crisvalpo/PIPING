import { supabase } from '@/lib/supabase'
import type { AnnouncementRow, AnnouncementExcelRow, RevisionFile } from '@/types/engineering'

/**
 * Convierte fechas de Excel a ISO string de manera segura
 */
function safeExcelDateToISO(excelDate: any): string | null {
    if (!excelDate) return null

    // Si es 0 o vacío, retornar null
    if (excelDate === 0 || excelDate === '' || excelDate === null || excelDate === undefined) {
        return null
    }

    try {
        let date: Date | null = null

        // Si ya es una fecha válida en formato string
        if (typeof excelDate === 'string') {
            // Verificar si es una fecha en formato ISO o similar
            if (excelDate.includes('-') || excelDate.includes('/')) {
                date = new Date(excelDate)
            } else {
                // Si es un string numérico, intentar parsearlo
                const numValue = parseFloat(excelDate)
                if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
                    excelDate = numValue
                }
            }
        }

        // Si es un número serial de Excel (días desde 1900-01-01)
        if (typeof excelDate === 'number') {
            // Validar que el número esté en un rango razonable
            if (excelDate < 1 || excelDate > 100000) {
                console.warn('Excel date out of valid range:', excelDate)
                return null
            }

            // Excel serial date: días desde 1899-12-30
            // IMPORTANTE: Sumamos 0.5 días (12 horas) para caer al mediodía
            // Esto evita problemas de timezone donde la fecha puede restar horas y quedar en el día anterior
            const excelEpoch = new Date(1899, 11, 30)
            date = new Date(excelEpoch.getTime() + (excelDate + 0.5) * 24 * 60 * 60 * 1000)
        }

        if (date) {
            // Validar que la fecha resultante sea razonable
            if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
                console.warn('Converted date out of valid range:', date)
                return null
            }
            return date.toISOString()
        }

        return null
    } catch (error) {
        console.warn('Error converting date:', excelDate, error)
        return null
    }
}

/**
 * Convierte fechas de Excel a formato DATE de PostgreSQL (YYYY-MM-DD)
 */
function safeExcelDateToSQL(excelDate: any): string | null {
    const isoString = safeExcelDateToISO(excelDate)
    if (!isoString) return null

    // Extraer solo la parte de fecha (YYYY-MM-DD)
    return isoString.split('T')[0]
}

/**
 * Normaliza las columnas del Excel del cliente al modelo de datos
 */
export function normalizeAnnouncementRow(excelRow: AnnouncementExcelRow): AnnouncementRow {
    return {
        iso_number: String(excelRow['N°ISOMÉTRICO'] || ''),
        line_number: String(excelRow['N° LÍNEA'] || ''),
        revision_number: String(excelRow['REV. ISO'] || '0'),
        line_type: String(excelRow['TIPO LÍNEA'] || ''),
        area: String(excelRow['ÁREA'] || ''),
        sub_area: String(excelRow['SUB-ÁREA'] || ''),

        client_file_code: String(excelRow['ARCHIVO'] || ''),
        client_revision_code: String(excelRow['REV. ARCHIVO'] || ''),

        transmittal_code: String(excelRow['TML'] || ''),
        // transmittal_number eliminado
        transmittal_date: excelRow['FECHA'] ? String(excelRow['FECHA']) : undefined,

        // has_pdf y has_idf eliminados

        spooling_status: String(excelRow['ESTADO SPOOLING'] || ''),
        spooling_date: excelRow['FECHA SPOOLING'] ? String(excelRow['FECHA SPOOLING']) : undefined,
        spooling_sent_date: excelRow['FECHA DE ENVIO'] ? String(excelRow['FECHA DE ENVIO']) : undefined,

        total_joints_count: excelRow['TOTAL'] ? Number(excelRow['TOTAL']) : undefined,
        executed_joints_count: excelRow['EJECUTADO'] ? Number(excelRow['EJECUTADO']) : undefined,
        pending_joints_count: excelRow['FALTANTES'] ? Number(excelRow['FALTANTES']) : undefined,

        // comment eliminado
    }
}

/**
 * Procesa el anuncio de revisiones del cliente (Optimizado para Bulk Insert)
 */
export async function processRevisionAnnouncement(projectId: string, excelRows: AnnouncementExcelRow[], userId?: string) {
    // Validar projectId
    if (!projectId) {
        throw new Error('projectId es requerido para procesar el anuncio')
    }

    let currentUserId = userId
    if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        currentUserId = user?.id
    }

    console.log('Processing announcement for project:', projectId, 'User:', currentUserId)

    const results = {
        processed: 0,
        errors: 0,
        details: [] as string[]
    }

    // 1. Normalizar las filas
    const rows = excelRows.map(normalizeAnnouncementRow).filter(r => r.iso_number)

    if (rows.length === 0) {
        results.details.push('No se encontraron filas válidas con N°ISOMÉTRICO')
        return results
    }

    console.log(`Normalized ${rows.length} rows`)

    // 2. Agrupar por isométrico (para lógica de negocio)
    const isoGroups = new Map<string, AnnouncementRow[]>()
    rows.forEach(row => {
        const list = isoGroups.get(row.iso_number) || []
        list.push(row)
        isoGroups.set(row.iso_number, list)
    })

    try {
        // 3. FETCH OPTIMIZADO: Obtener solo los isométricos que vienen en el Excel
        // Esto evita problemas de paginación (límite de 1000 filas) y mejora el rendimiento
        const excelCodes = Array.from(isoGroups.keys())
        console.log(`[DEBUG] Checking existence for ${excelCodes.length} codes...`)

        const { data: existingIsos, error: isoError } = await supabase
            .from('isometrics')
            .select('id, codigo')
            .eq('proyecto_id', projectId)
            .in('codigo', excelCodes)

        if (isoError) throw isoError

        console.log(`[DEBUG] Found ${existingIsos?.length || 0} matching isometrics in DB`)

        // Mapa: Codigo -> ID
        const isoMap = new Map<string, string>()
        existingIsos?.forEach(i => {
            console.log(`[DEBUG] Existing: "${i.codigo}" -> ${i.id}`)
            isoMap.set(i.codigo, i.id)
        })

        console.log('[DEBUG] Excel codes:', Array.from(isoGroups.keys()))

        // 4. Identificar Isométricos NUEVOS
        const newIsosToInsert: any[] = []
        const newIsosCodes = new Set<string>()

        for (const [isoCode, isoRows] of isoGroups) {
            const exists = isoMap.has(isoCode)
            console.log(`[DEBUG] "${isoCode}": ${exists ? 'EXISTS' : 'NEW'}`)

            if (!isoMap.has(isoCode)) {
                const firstRow = isoRows[0]
                newIsosToInsert.push({
                    proyecto_id: projectId,
                    codigo: isoCode,
                    line_number: firstRow.line_number || null,
                    area: firstRow.area || null,
                    sub_area: firstRow.sub_area || null,
                    line_type: firstRow.line_type || null
                })
                newIsosCodes.add(isoCode)
            }
        }

        // 5. BULK INSERT Isométricos Nuevos
        if (newIsosToInsert.length > 0) {
            console.log(`Inserting ${newIsosToInsert.length} new isometrics...`)
            const { data: insertedIsos, error: insertIsoError } = await supabase
                .from('isometrics')
                .insert(newIsosToInsert)
                .select('id, codigo')

            if (insertIsoError) throw insertIsoError

            // Actualizar mapa con los nuevos IDs
            insertedIsos?.forEach(i => isoMap.set(i.codigo, i.id))
        }

        // 6. BULK FETCH: Obtener todas las revisiones existentes
        // Estrategia: Chunked Fetch usando los IDs de isométricos que ya tenemos
        // Evita errores de URL larga y de relaciones ambiguas (Join isometrics vs isometric_revisions)

        const allIsoIds = Array.from(isoMap.values())
        let existingRevisions: any[] = []

        // Lotes de 200 IDs para no saturar la URL
        const fetchChunks = chunkArray(allIsoIds, 200)

        for (const chunk of fetchChunks) {
            const { data, error } = await supabase
                .from('isometric_revisions')
                .select('id, codigo, isometric_id, estado, created_at')
                .in('isometric_id', chunk)

            if (error) throw error
            if (data) existingRevisions = [...existingRevisions, ...data]
        }

        // Mapa: IsometricID_RevisionCode -> RevisionID
        const revMap = new Set<string>()
        existingRevisions.forEach((r: any) => revMap.add(`${r.isometric_id}_${r.codigo}`))

        // 7. Preparar Revisiones NUEVAS
        const revisionsToInsert: any[] = []
        const affectedIsoIds = new Set<string>() // IDs de isométricos que reciben nueva revisión

        for (const [isoCode, isoRows] of isoGroups) {
            const isoId = isoMap.get(isoCode)
            if (!isoId) continue // No debería pasar

            for (const row of isoRows) {
                const uniqueKey = `${isoId}_${row.revision_number}`

                // Verificar duplicados en DB y en el lote actual
                if (revMap.has(uniqueKey)) {
                    results.errors++
                    results.details.push(`⚠️ OMITIDO: ${isoCode} Rev ${row.revision_number} ya existe.`)
                    continue
                }

                // Verificar duplicados dentro del mismo Excel (si el usuario puso 2 veces la misma fila)
                // Lo manejamos añadiendo al Set temporalmente
                revMap.add(uniqueKey)

                // has_pdf y has_idf eliminados

                revisionsToInsert.push({
                    isometric_id: isoId,
                    codigo: row.revision_number,
                    // revision_number eliminado (usar codigo)
                    fecha_emision: safeExcelDateToSQL(row.transmittal_date) || new Date().toISOString().split('T')[0],

                    client_file_code: row.client_file_code || null,
                    client_revision_code: row.client_revision_code || null,
                    transmittal_code: row.transmittal_code || null,
                    // transmittal_number eliminado
                    transmittal_date: safeExcelDateToSQL(row.transmittal_date),

                    spooling_status: row.spooling_status || 'PENDIENTE',
                    spooling_date: safeExcelDateToSQL(row.spooling_date),
                    spooling_sent_date: safeExcelDateToSQL(row.spooling_sent_date),

                    total_joints_count: row.total_joints_count || 0,
                    executed_joints_count: row.executed_joints_count || 0,
                    pending_joints_count: row.pending_joints_count || 0,

                    // comment eliminado
                    estado: 'VIGENTE', // Asumimos vigente por defecto, luego recalculamos

                    created_by: currentUserId || null
                })

                affectedIsoIds.add(isoId)
            }
        }

        // 8. BULK INSERT Revisiones Nuevas
        if (revisionsToInsert.length > 0) {
            console.log(`Inserting ${revisionsToInsert.length} new revisions...`)

            // Insertar en lotes de 100 para evitar payload too large
            const batchSize = 100
            for (let i = 0; i < revisionsToInsert.length; i += batchSize) {
                const batch = revisionsToInsert.slice(i, i + batchSize)
                const { error: insertRevError } = await supabase
                    .from('isometric_revisions')
                    .insert(batch)

                if (insertRevError) {
                    console.error('Error inserting batch:', insertRevError)
                    results.errors += batch.length
                    results.details.push(`❌ Error insertando lote de revisiones: ${insertRevError.message}`)
                } else {
                    results.processed += batch.length
                }
            }
        }

        // 9. Recalcular VIGENTE solo para los isométricos afectados
        // Esto es necesario porque acabamos de insertar nuevas revisiones que podrían ser (o no) las vigentes
        console.log(`[DEBUG] affectedIsoIds.size: ${affectedIsoIds.size}`)
        console.log(`[DEBUG] affectedIsoIds:`, Array.from(affectedIsoIds))

        if (affectedIsoIds.size > 0) {
            console.log(`Recalculating VIGENTE for ${affectedIsoIds.size} isometrics...`)

            // Traer TODAS las revisiones de los afectados (incluyendo las nuevas)
            // Chunked fetch para evitar URL larga
            const affectedIsoIdsArray = Array.from(affectedIsoIds)
            const affectedChunks = chunkArray(affectedIsoIdsArray, 200)
            let allAffectedRevs: any[] = []

            for (const chunk of affectedChunks) {
                const { data, error } = await supabase
                    .from('isometric_revisions')
                    .select('id, codigo, isometric_id, estado, created_at')
                    .in('isometric_id', chunk)

                if (error) {
                    console.error('Error fetching affected revisions:', error)
                    continue
                }
                if (data) allAffectedRevs = [...allAffectedRevs, ...data]
            }

            if (allAffectedRevs.length > 0) {
                // Agrupar por ID de isométrico
                const revsByIso = new Map<string, any[]>()
                allAffectedRevs.forEach(r => {
                    const list = revsByIso.get(r.isometric_id) || []
                    list.push(r)
                    revsByIso.set(r.isometric_id, list)
                })

                const updatesIsometrics: any[] = []
                const updatesRevisions: any[] = []

                for (const [isoId, revs] of revsByIso) {
                    // Ordenar por código de revisión (0 < 1 < 2... para números, A < B < C para letras)
                    // Números (construcción) tienen prioridad sobre letras (preliminar)
                    const sortedRevs = revs.sort((a, b) => {
                        const codeA = String(a.codigo).toUpperCase().trim()
                        const codeB = String(b.codigo).toUpperCase().trim()

                        const isNumA = /^\d+$/.test(codeA)
                        const isNumB = /^\d+$/.test(codeB)

                        // Ambos números: orden numérico (0 < 1 < 2)
                        if (isNumA && isNumB) {
                            return parseInt(codeA) - parseInt(codeB)
                        }

                        // Uno número, otro letra: Números > Letras (construcción > preliminar)
                        if (isNumA && !isNumB) return 1 // A va después
                        if (!isNumA && isNumB) return -1 // B va después

                        // Ambos letras: orden alfabético (A < B < C)
                        if (codeA !== codeB) {
                            return codeA.localeCompare(codeB)
                        }

                        // Desempate por fecha de creación (más reciente al final)
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    })

                    const latestRev = sortedRevs[sortedRevs.length - 1]

                    console.log(`[${isoId}] Revisions: ${sortedRevs.map(r => r.codigo).join(', ')} -> Latest: ${latestRev.codigo}`)

                    // Preparar update de Isométrico
                    updatesIsometrics.push({
                        id: isoId,
                        current_revision_id: latestRev.id
                    })

                    // Preparar updates de Revisiones
                    for (const rev of revs) {
                        let shouldBe: string

                        if (rev.id === latestRev.id) {
                            // Es la revisión más reciente
                            // Si ya estaba ELIMINADA, se mantiene así. Si no, es VIGENTE.
                            shouldBe = rev.estado === 'ELIMINADA' ? 'ELIMINADA' : 'VIGENTE'
                        } else {
                            // NO es la más reciente (hay una nueva)
                            // Pasa a OBSOLETA, incluso si estaba ELIMINADA
                            shouldBe = 'OBSOLETA'
                        }

                        // Solo actualizar si el estado cambió
                        if (rev.estado !== shouldBe) {
                            console.log(`  -> Updating ${rev.codigo}: ${rev.estado} -> ${shouldBe}`)
                            updatesRevisions.push({
                                id: rev.id,
                                estado: shouldBe
                            })
                        }
                    }
                }

                // Ejecutar Updates Masivos
                if (updatesIsometrics.length > 0) {
                    console.log(`Updating ${updatesIsometrics.length} isometrics current_revision_id...`)
                    const updateChunks = chunkArray(updatesIsometrics, 50)
                    for (const chunk of updateChunks) {
                        const results = await Promise.all(chunk.map(u =>
                            supabase.from('isometrics').update({ current_revision_id: u.current_revision_id }).eq('id', u.id)
                        ))
                        results.forEach((result, idx) => {
                            if (result.error) {
                                console.error(`❌ Error updating isometric ${chunk[idx].id}:`, result.error)
                            }
                        })
                    }
                }

                if (updatesRevisions.length > 0) {
                    console.log(`Updating ${updatesRevisions.length} revision states...`)
                    const updateChunks = chunkArray(updatesRevisions, 50)
                    for (const chunk of updateChunks) {
                        const results = await Promise.all(chunk.map(u =>
                            supabase.from('isometric_revisions').update({ estado: u.estado }).eq('id', u.id)
                        ))

                        let successCount = 0
                        let errorCount = 0
                        results.forEach((result, idx) => {
                            if (result.error) {
                                console.error(`❌ Error updating revision ${chunk[idx].id} to ${chunk[idx].estado}:`, result.error)
                                errorCount++
                            } else {
                                successCount++
                            }
                        })
                        console.log(`✓ Batch complete: ${successCount} success, ${errorCount} errors`)
                    }
                    console.log(`✅ Finished updating ${updatesRevisions.length} revision states`)
                }
            }
        }

        results.details.push('✅ Proceso masivo completado.')

    } catch (error: any) {
        console.error('Critical error in bulk process:', error)
        results.errors++
        results.details.push(`❌ Error Crítico: ${error.message}`)
    }

    return results
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = []
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size))
    }
    return chunked
}

/**
 * Sube un archivo físico a Supabase Storage y lo registra en revision_files
 */
export async function uploadPDFToRevision(
    revisionId: string,
    file: File,
    fileType: 'pdf' | 'idf' | 'dwg' | 'other' = 'pdf',
    isPrimary: boolean = false
): Promise<{ success: boolean; message: string; file?: RevisionFile }> {
    try {
        const allowedTypes: Record<string, string[]> = {
            pdf: ['application/pdf'],
            idf: ['application/octet-stream', 'text/plain'],
            dwg: ['application/acad', 'application/x-acad', 'application/autocad_dwg', 'image/x-dwg']
        }

        if (fileType !== 'other' && !allowedTypes[fileType]?.some(type => file.type.includes(type) || file.name.toLowerCase().endsWith(`.${fileType}`))) {
            return { success: false, message: `El archivo debe ser de tipo ${fileType.toUpperCase()}` }
        }

        const timestamp = Date.now()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `revisions/${revisionId}/${fileType}/${timestamp}_${sanitizedFileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('revision-files')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading to storage:', uploadError)
            return { success: false, message: `Error al subir archivo: ${uploadError.message}` }
        }

        const { data: urlData } = await supabase.storage
            .from('revision-files')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

        if (!urlData?.signedUrl) {
            return { success: false, message: 'Error al generar URL del archivo' }
        }

        const { data: existingFiles } = await supabase
            .from('revision_files')
            .select('version_number')
            .eq('revision_id', revisionId)
            .eq('file_type', fileType)
            .order('version_number', { ascending: false })
            .limit(1)

        const nextVersion = existingFiles && existingFiles.length > 0
            ? existingFiles[0].version_number + 1
            : 1

        if (isPrimary) {
            await supabase
                .from('revision_files')
                .update({ is_primary: false })
                .eq('revision_id', revisionId)
                .eq('file_type', fileType)
        }

        const { data: { user } } = await supabase.auth.getUser()

        const { data: dbFile, error: dbError } = await supabase
            .from('revision_files')
            .insert({
                revision_id: revisionId,
                file_url: storagePath,
                file_type: fileType,
                file_name: file.name,
                version_number: nextVersion,
                is_primary: isPrimary,
                file_size_bytes: file.size,
                uploaded_by: user?.id
            })
            .select()
            .single()

        if (dbError) {
            await supabase.storage.from('revision-files').remove([storagePath])
            return { success: false, message: `Error al registrar archivo: ${dbError.message}` }
        }

        return {
            success: true,
            message: 'Archivo subido exitosamente',
            file: dbFile as RevisionFile
        }

    } catch (error: any) {
        console.error('Error en uploadPDFToRevision:', error)
        return { success: false, message: error.message || 'Error desconocido al subir archivo' }
    }
}

/**
 * Obtiene todos los archivos de una revisión con URLs firmadas
 */
export async function getRevisionFiles(revisionId: string): Promise<RevisionFile[]> {
    const { data, error } = await supabase
        .from('revision_files')
        .select('*')
        .eq('revision_id', revisionId)
        .order('file_type', { ascending: true })
        .order('version_number', { ascending: false })

    if (error) {
        console.error('Error al obtener archivos:', error)
        return []
    }

    const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
            const { data: urlData } = await supabase.storage
                .from('revision-files')
                .createSignedUrl(file.file_url, 60 * 60 * 24)

            return {
                ...file,
                signed_url: urlData?.signedUrl || null
            }
        })
    )

    return filesWithUrls as RevisionFile[]
}

/**
 * Genera una URL firmada para un archivo específico
 */
export async function getFileUrl(fileId: string): Promise<string | null> {
    try {
        const { data: file } = await supabase
            .from('revision_files')
            .select('file_url')
            .eq('id', fileId)
            .single()

        if (!file) return null

        const { data: urlData } = await supabase.storage
            .from('revision-files')
            .createSignedUrl(file.file_url, 60 * 60) // 1 hora

        return urlData?.signedUrl || null
    } catch (error) {
        console.error('Error generating file URL:', error)
        return null
    }
}

/**
 * Marca una revisión como ELIMINADA (Soft Delete)
 */
export async function softDeleteRevision(revisionId: string): Promise<boolean> {
    try {
        // 1. Obtener estado actual de spooling
        const { data: rev, error: fetchError } = await supabase
            .from('isometric_revisions')
            .select('spooling_status')
            .eq('id', revisionId)
            .single()

        if (fetchError) throw fetchError

        // 2. Determinar nuevo estado de spooling
        let newSpoolingStatus = rev.spooling_status
        if (!rev.spooling_status || rev.spooling_status === 'PENDIENTE') {
            newSpoolingStatus = 'N/A'
        } else {
            // Si ya tenía avance (SPOOLEADO, ENVIADO, etc.), marcamos como SPOOLEADO - ELIMINADA
            newSpoolingStatus = 'SPOOLEADO - ELIMINADA'
        }

        // 3. Actualizar estado y spooling_status
        const { error } = await supabase
            .from('isometric_revisions')
            .update({
                estado: 'ELIMINADA',
                spooling_status: newSpoolingStatus
            })
            .eq('id', revisionId)

        if (error) {
            console.error('Error deleting revision:', JSON.stringify(error, null, 2))
            return false
        }
        return true
    } catch (error) {
        console.error('Error in softDeleteRevision:', error)
        return false
    }
}
