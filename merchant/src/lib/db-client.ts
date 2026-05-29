/**
 * db-client.ts — Mutations Supabase côté navigateur (browser-side uniquement)
 * Utilise createClient depuis @/lib/supabase/client
 */
'use client'

import { createClient } from '@/lib/supabase/client'

export async function updateChecklistItem(id: string, done: boolean): Promise<void> {
  const supabase = createClient()
  await supabase.from('onboarding_checklist').update({ done }).eq('id', id)
}

export async function advancePipelineStage(id: string, newStage: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('onboarding_pipeline')
    .update({ stage: newStage, stage_entered_at: new Date().toISOString() })
    .eq('id', id)
}

export async function togglePipelineBlocked(id: string, blocked: boolean): Promise<void> {
  const supabase = createClient()
  await supabase.from('onboarding_pipeline').update({ blocked }).eq('id', id)
}

export async function addPipelineComment(pipelineId: string, author: string, content: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('onboarding_comments').insert({ pipeline_id: pipelineId, author, content })
}
