import { supabase } from '@/lib/supabase'

export async function getUserCount(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_user_count')

        if (error) {
            console.error('Error fetching user count:', error)
            return 0
        }

        return data || 0
    } catch (error) {
        console.error('Error in getUserCount:', error)
        return 0
    }
}
