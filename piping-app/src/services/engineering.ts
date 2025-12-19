import { supabase } from '@/lib/supabase'
import type { Isometrico, IsometricoRevision, Spool, Joint, Material } from '@/types/engineering'
import { calculateDiff, saveImpacts } from './impact-analysis'

// --- ESTADÍSTICAS Y METADATA ---

export async function getProjectStats(projectId: string) {
    try {
        // 1. Total de Isométricos
        const { count: total, error: errTotal } = await supabase
            .from('isometrics')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', projectId)

        if (errTotal) throw errTotal

        // 2. Revisiones Vigentes
        // Especificamos la FK explícitamente: !isometric_id
        const { count: vigentesExact, error: errVigExact } = await supabase
            .from('isometric_revisions')
            .select('id, isometric:isometrics!isometric_id!inner(proyecto_id)', { count: 'exact', head: true })
            .eq('estado', 'VIGENTE')
            .eq('isometric.proyecto_id', projectId)

        if (errVigExact) throw errVigExact

        // 3. Pendientes de Spooling
        const { count: pendientes, error: errPend } = await supabase
            .from('isometric_revisions')
            .select('id, isometric:isometrics!isometric_id!inner(proyecto_id)', { count: 'exact', head: true })
            .eq('estado', 'VIGENTE')
            .eq('spooling_status', 'PENDIENTE')
            .eq('isometric.proyecto_id', projectId)

        if (errPend) throw errPend

        // 4. Revisiones Eliminadas
        const { count: eliminadas, error: errElim } = await supabase
            .from('isometric_revisions')
            .select('id, isometric:isometrics!isometric_id!inner(proyecto_id)', { count: 'exact', head: true })
            .eq('estado', 'ELIMINADA')
            .eq('isometric.proyecto_id', projectId)

        if (errElim) throw errElim

        return {
            total: total || 0,
            vigentes: vigentesExact || 0,
            eliminados: eliminadas || 0,
            pendientesSpooling: pendientes || 0
        }
    } catch (error) {
        console.error('[getProjectStats] Error:', JSON.stringify(error, null, 2))
        return { total: 0, vigentes: 0, eliminados: 0, pendientesSpooling: 0 }
    }
}

export async function getProjectAreas(projectId: string) {
    try {
        const { data, error } = await supabase
            .from('isometrics')
            .select('area')
            .eq('proyecto_id', projectId)
            .limit(5000)

        if (error) throw error

        const areas = Array.from(new Set(data?.map(d => d.area).filter(Boolean)))
        return areas.sort()
    } catch (error) {
        console.error('[getProjectAreas] Error:', error)
        return []
    }
}

// --- BÚSQUEDA Y LISTADO ---

export async function searchIsometrics(
    projectId: string,
    searchTerm: string = '',
    page: number = 0,
    pageSize: number = 50,
    filters: { area?: string; status?: string; showPending?: boolean } = {},
    signal?: AbortSignal
) {
    try {
        if (!projectId) {
            return { data: [], count: 0 }
        }

        const from = page * pageSize
        const to = from + pageSize - 1

        // 1. Buscar Isométricos (Solo tabla padre)
        let query = supabase
            .from('isometrics')
            .select('*', { count: 'estimated' })
            .eq('proyecto_id', projectId)

        if (signal) query = query.abortSignal(signal)

        if (searchTerm && searchTerm.trim()) {
            query = query.ilike('codigo', `%${searchTerm.trim()}%`)
        }

        if (filters.area && filters.area !== 'ALL') {
            query = query.eq('area', filters.area)
        }

        // Filtros complejos con !inner si es necesario
        if ((filters.status && filters.status !== 'ALL') || filters.showPending) {
            const statusToFilter = filters.showPending ? 'PENDIENTE' : filters.status

            // Especificamos FK explícita: !isometric_id
            query = supabase
                .from('isometrics')
                .select('*, revisions:isometric_revisions!isometric_id!inner(*, files:revision_files(*))', { count: 'exact' })
                .eq('proyecto_id', projectId)
                .eq('revisions.estado', 'VIGENTE')
                .eq('revisions.spooling_status', statusToFilter)

            if (signal) query = query.abortSignal(signal)

            if (searchTerm && searchTerm.trim()) query = query.ilike('codigo', `%${searchTerm.trim()}%`)
            if (filters.area && filters.area !== 'ALL') query = query.eq('area', filters.area)
        }

        console.log('[searchIsometrics] Executing query with:', { projectId, searchTerm, page, pageSize, filters })

        const { data: isometrics, error: isoError, count } = await query
            .order('codigo', { ascending: true })
            .range(from, to)

        if (isoError) {
            // Check if it's an abort error (Supabase wraps it)
            const isAbort = isoError.message?.includes('AbortError') ||
                JSON.stringify(isoError).includes('AbortError')

            if (!isAbort) {
                console.error('[searchIsometrics] Query error:', isoError)
            }
            throw isoError
        }
        if (!isometrics || isometrics.length === 0) return { data: [], count: 0 }

        // 2. Cargar revisiones si no vinieron (caso query simple)
        let processedData = [...isometrics]
        const needsRevisions = !isometrics[0].revisions

        if (needsRevisions) {
            const isoIds = isometrics.map(i => i.id)
            let revisionsQuery = supabase
                .from('isometric_revisions')
                .select('*, files:revision_files(*)')
                .in('isometric_id', isoIds)

            if (signal) revisionsQuery = revisionsQuery.abortSignal(signal)

            const { data: revisions, error: revError } = await revisionsQuery


            if (revError) throw revError

            const revMap = new Map<string, any[]>()
            revisions?.forEach(r => {
                const list = revMap.get(r.isometric_id) || []
                list.push(r)
                revMap.set(r.isometric_id, list)
            })

            processedData = isometrics.map(iso => ({
                ...iso,
                revisions: revMap.get(iso.id) || []
            }))
        }

        // Ordenar revisiones
        processedData.forEach((iso: any) => {
            if (Array.isArray(iso.revisions)) {
                iso.revisions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }
        })

        return { data: processedData, count: count || 0 }

    } catch (err: any) {
        // Brute force check for AbortError in various formats
        const isAbort =
            err.name === 'AbortError' ||
            err.message?.includes('AbortError') ||
            (typeof err === 'object' && JSON.stringify(err).includes('AbortError'))

        if (isAbort) {
            // Request cancelled, suppress error logging
            console.debug('[searchIsometrics] Request aborted')
            throw err
        }
        console.error('[searchIsometrics] Error:', JSON.stringify(err, null, 2))
        throw err
    }
}

/**
 * Obtiene solo los códigos de isométricos para autocompletado (ligero)
 */
export async function getIsometricCodes(projectId: string) {
    try {
        if (!projectId) return []

        // Traer todos los códigos (límite alto, ej: 5000)
        // Solo ID y Código, sin joins pesados
        const { data, error } = await supabase
            .from('isometrics')
            .select('id, codigo')
            .eq('proyecto_id', projectId)
            .order('codigo', { ascending: true })
            .limit(5000)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('[getIsometricCodes] Error:', error)
        return []
    }
}

/**
 * @deprecated Use getProjectStats instead
 */
export async function getIsometricsCount(projectId: string) {
    const stats = await getProjectStats(projectId)
    return {
        total: stats.total,
        vigentes: stats.vigentes,
        rev0Pending: 0,
        revGt0Pending: 0
    }
}

/**
 * @deprecated Use searchIsometrics instead
 */
export async function getIsometrics(projectId: string) {
    const res = await searchIsometrics(projectId, '', 0, 1000)
    return res.data
}

// --- CRUD BÁSICO ---

export async function createIsometric(projectId: string, codigo: string, metadata: Partial<Isometrico> = {}) {
    const { data: existing } = await supabase
        .from('isometrics')
        .select('id')
        .eq('proyecto_id', projectId)
        .eq('codigo', codigo)
        .single()

    if (existing) return existing

    const { data, error } = await supabase
        .from('isometrics')
        .insert({
            proyecto_id: projectId,
            codigo,
            ...metadata
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function createRevision(isometricId: string, codigo: string, status: 'PENDIENTE' | 'VIGENTE' = 'PENDIENTE') {
    const { data, error } = await supabase
        .from('isometric_revisions')
        .insert({
            isometric_id: isometricId,
            codigo,
            estado: status,
            fecha_emision: new Date().toISOString()
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function getRevisionDetails(revisionId: string) {
    const { data, error } = await supabase
        .from('isometric_revisions')
        .select(`
            *,
            isometric:isometrics(*),
            spools(*),
            joints(*),
            materials(*)
        `)
        .eq('id', revisionId)
        .single()

    if (error) throw error
    return data
}

export async function getLatestRevision(isometricId: string) {
    const { data, error } = await supabase
        .from('isometric_revisions')
        .select(`
            *,
            spools(*),
            joints(*)
        `)
        .eq('isometric_id', isometricId)
        .eq('estado', 'VIGENTE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
}

// --- BULK UPLOAD HELPERS ---

export async function uploadSpools(revisionId: string, spools: Partial<Spool>[]) {
    const spoolsToInsert = spools.map(s => ({ ...s, revision_id: revisionId }))
    const { data, error } = await supabase.from('spools').insert(spoolsToInsert).select()
    if (error) throw error
    return data
}

export async function uploadJoints(revisionId: string, joints: Partial<Joint>[]) {
    const jointsToInsert = joints.map(j => ({ ...j, revision_id: revisionId }))
    const { data, error } = await supabase.from('joints').insert(jointsToInsert).select()
    if (error) throw error
    return data
}

export async function uploadMaterials(revisionId: string, materials: Partial<Material>[]) {
    const materialsToInsert = materials.map(m => ({ ...m, revision_id: revisionId }))
    const { data, error } = await supabase.from('materials').insert(materialsToInsert).select()
    if (error) throw error
    return data
}

// --- ORCHESTRATOR: IMPORT SPOOLGEN DATA ---

interface SpoolGenData {
    isometricCode: string;
    revisionCode: string;
    bolted_joints: any[];
    spools_welds: any[];
    material_take_off: any[];
}

export async function processSpoolGenImport(projectId: string, importData: SpoolGenData) {
    try {
        // 1. Get Isometric
        const { data: iso } = await supabase
            .from('isometrics')
            .select('id, codigo')
            .eq('proyecto_id', projectId)
            .eq('codigo', importData.isometricCode)
            .single()

        if (!iso) {
            throw new Error(`El Isométrico ${importData.isometricCode} no existe. Debe cargarse primero en el Anuncio de Revisiones.`)
        }

        // 2. Get Current VIGENTE Revision
        const previousRev = await getLatestRevision(iso.id)

        if (!previousRev) {
            throw new Error(`El Isométrico ${importData.isometricCode} no tiene una revisión VIGENTE activa.`)
        }

        // 3. Validate Revision Code
        if (String(previousRev.codigo) !== String(importData.revisionCode)) {
            throw new Error(`La revisión del archivo SpoolGen (${importData.revisionCode}) no coincide con la revisión VIGENTE del sistema (${previousRev.codigo}).`)
        }

        const rev = previousRev
        console.log(`Using existing VIGENTE revision: ${rev.codigo} (${rev.id})`)

        // --- TRANSFORM DATA ---

        // A. Extract Unique Spools from MTO
        const uniqueSpoolsMap = new Map<string, Partial<Spool>>()

        importData.material_take_off.forEach(item => {
            if (item.spool_number && !uniqueSpoolsMap.has(item.spool_number)) {
                uniqueSpoolsMap.set(item.spool_number, {
                    nombre: item.spool_number,
                    sheet: item.sheet,
                    piping_class: item.piping_class,
                    fab_location: item.fab,
                    requiere_pwht: false,
                    requiere_pintura: false
                })
            }
        })

        const spoolsList = Array.from(uniqueSpoolsMap.values())

        // B. Prepare Joints (Welds + Bolted)
        const jointsList: Partial<Joint>[] = []

        // Welds
        importData.spools_welds.forEach(w => {
            jointsList.push({
                tag: w.weld_number,
                joint_category: 'WELD',
                tipo: w.weld_type,
                diametro_pulg: parseFloat(w.nps?.replace('"', '') || '0'),
                cedula: w.sch,
                thickness: parseFloat(w.thickness || '0'),
                material: w.material,
                categoria: w.destination === 'CAMPO' ? 'FIELD' : 'SHOP',
                sheet: w.sheet,
                spool_id: w.spool_number as any
            })
        })

        // Bolted Joints
        importData.bolted_joints.forEach(b => {
            jointsList.push({
                tag: b.flanged_joint_number,
                joint_category: 'BOLT',
                diametro_pulg: parseFloat(b.nps?.replace('"', '') || '0'),
                rating: b.rating,
                bolt_size: b.bolt_size,
                material: b.material,
                sheet: b.sheet,
                categoria: 'FIELD'
            })
        })

        // 4. Perform Impact Analysis
        if (previousRev) {
            console.log('Performing Impact Analysis...')
            const diff = calculateDiff(
                previousRev.spools,
                spoolsList,
                previousRev.joints,
                jointsList
            )
            await saveImpacts(rev.id, diff)

            // Mark previous revision as OBSOLETE
            await supabase
                .from('isometric_revisions')
                .update({ estado: 'OBSOLETA' })
                .eq('id', previousRev.id)
        }

        // 5. Upload Spools
        let createdSpoolsMap = new Map<string, string>()
        if (spoolsList.length > 0) {
            const createdSpools = await uploadSpools(rev.id, spoolsList)
            if (createdSpools) {
                createdSpools.forEach(s => createdSpoolsMap.set(s.nombre, s.id))
            }
        }

        // 6. Upload Joints
        const finalJoints = jointsList.map(j => ({
            ...j,
            spool_id: j.spool_id ? (createdSpoolsMap.get(j.spool_id as unknown as string) || undefined) : undefined
        }))

        if (finalJoints.length > 0) {
            await uploadJoints(rev.id, finalJoints)
        }

        // 7. Upload Materials
        const materialsList = importData.material_take_off.map(m => ({
            item_code: m.item_code,
            descripcion: m.item_code,
            qty: m.qty,
            qty_unit: m.qty_unit,
            piping_class: m.piping_class,
            spool_id: m.spool_number ? (createdSpoolsMap.get(m.spool_number) || undefined) : undefined
        }))

        if (materialsList.length > 0) {
            await uploadMaterials(rev.id, materialsList)
        }

        return { success: true, revisionId: rev.id, impactsDetected: !!previousRev }

    } catch (error: any) {
        console.error('Import Error:', error)
        return { success: false, message: error.message }
    }
}
