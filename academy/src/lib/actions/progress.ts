'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { MODULE_SECTIONS } from '@/types/academy'

export async function markSectionComplete(moduleSlug: string, sectionTitle: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { error } = await supabase
    .from('academy_section_progress')
    .upsert({ user_id: user.id, module_slug: moduleSlug, section_title: sectionTitle })

  if (error) return { error: error.message }

  // Vérifier si le module est complètement terminé → tenter de décerner une certification
  await checkAndAwardCertifications(user.id)

  revalidatePath(`/modules/${moduleSlug}`)
  revalidatePath('/profil')
  return { success: true }
}

export async function unmarkSectionComplete(moduleSlug: string, sectionTitle: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  await supabase
    .from('academy_section_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('module_slug', moduleSlug)
    .eq('section_title', sectionTitle)

  revalidatePath(`/modules/${moduleSlug}`)
  revalidatePath('/profil')
  return { success: true }
}

export async function getModuleProgress(moduleSlug: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('academy_section_progress')
    .select('section_title')
    .eq('user_id', user.id)
    .eq('module_slug', moduleSlug)

  return data?.map(r => r.section_title) ?? []
}

export async function getAllProgress(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data } = await supabase
    .from('academy_section_progress')
    .select('module_slug, section_title')
    .eq('user_id', user.id)

  const result: Record<string, number> = {}

  for (const [slug, sections] of Object.entries(MODULE_SECTIONS)) {
    const completed = data?.filter(r => r.module_slug === slug).length ?? 0
    result[slug] = Math.round((completed / sections.length) * 100)
  }

  return result
}

// ── Interne : déclenché après chaque completion ───────────────────────────────

async function checkAndAwardCertifications(userId: string) {
  const supabase = await createClient()

  const { data: progressData } = await supabase
    .from('academy_section_progress')
    .select('module_slug, section_title')
    .eq('user_id', userId)

  // Calculer les modules complétés à 100%
  const completedModules = Object.entries(MODULE_SECTIONS)
    .filter(([slug, sections]) => {
      const done = progressData?.filter(r => r.module_slug === slug).length ?? 0
      return done >= sections.length
    })
    .map(([slug]) => slug)

  // Règles de certification
  const rules: Array<{ level: string; required: string[] }> = [
    { level: 'user',   required: ['fondations-mdm'] },
    { level: 'metier', required: ['planification-mrp2', 'stocks-qualite'] },
    { level: 'cbscp',  required: ['fondations-mdm', 'planification-mrp2', 'stocks-qualite', 'haccp'] },
  ]

  for (const rule of rules) {
    const earned = rule.required.every(m => completedModules.includes(m))
    if (earned) {
      await supabase
        .from('academy_certifications')
        .upsert({ user_id: userId, level: rule.level })
    }
  }
}
