const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export interface FeatureRequest {
  title: string
  description: string
  category: 'feature' | 'bug' | 'improvement'
}

export async function submitFeatureRequest(req: FeatureRequest): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // No backend configured — log locally and resolve (MVP mode)
    console.log('[FeatureRequest] No Supabase configured. Request:', req)
    await new Promise(r => setTimeout(r, 600))
    return
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/feature_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      title: req.title,
      description: req.description,
      category: req.category,
      created_at: new Date().toISOString(),
      platform: 'mobile',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to submit: ${res.status} ${text}`)
  }
}
