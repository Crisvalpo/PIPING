import { supabase } from '@/lib/supabase'
import type { Impacto } from '@/types/impacts'

export async function getImpactsByRevision(revisionId: string) {
    const { data, error } = await supabase
        .from('isometric_impacts')
        .select('*')
        .eq('revision_id', revisionId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data as Impacto[]
}

export async function approveImpact(impactId: string, comments?: string) {
    const { error } = await supabase
        .from('isometric_impacts')
        .update({
            status: 'APROBADO',
            comments: comments,
            updated_at: new Date().toISOString()
        })
        .eq('id', impactId)

    if (error) throw error
}

export async function rejectImpact(impactId: string, comments?: string) {
    const { error } = await supabase
        .from('isometric_impacts')
        .update({
            status: 'RECHAZADO',
            comments: comments,
            updated_at: new Date().toISOString()
        })
        .eq('id', impactId)

    if (error) throw error
}
