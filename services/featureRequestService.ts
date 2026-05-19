import { supabase } from '../lib/supabase'

export interface FeatureRequest {
  title: string
  description: string
  category: 'feature' | 'bug' | 'improvement'
}

export async function submitFeatureRequest(req: FeatureRequest): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sign in to submit a feature request')

  const { error } = await supabase.from('feature_requests').insert({
    user_id: session.user.id,
    title: req.title,
    description: req.description,
    category: req.category,
  })
  if (error) throw error
}
