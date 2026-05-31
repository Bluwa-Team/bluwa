'use server'

import { createClient } from '@/lib/supabase/server'
import { CERTS, MODULE_SECTIONS, type CertLevel } from '@/types/academy'

export async function getUserCertifications(): Promise<CertLevel[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('academy_certifications')
    .select('level')
    .eq('user_id', user.id)

  return data?.map(r => r.level as CertLevel) ?? []
}

export interface CertStatus {
  level:       CertLevel
  label:       string
  description: string
  color:       string
  earned:      boolean
  progress:    number   // 0-100
  modulesReq:  Array<{ slug: string; label: string; done: boolean }>
}

export async function getCertificationsStatus(): Promise<CertStatus[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return CERTS.map(c => ({
    ...c, earned: false, progress: 0,
    modulesReq: c.modules.map(m => ({ slug: m, label: m, done: false })),
  }))

  const [{ data: certData }, { data: progressData }] = await Promise.all([
    supabase.from('academy_certifications').select('level').eq('user_id', user.id),
    supabase.from('academy_section_progress').select('module_slug, section_title').eq('user_id', user.id),
  ])

  const earnedLevels = new Set(certData?.map(r => r.level) ?? [])

  return CERTS.map(cert => {
    const modulesReq = cert.modules.map(slug => {
      const total  = MODULE_SECTIONS[slug]?.length ?? 0
      const done   = progressData?.filter(r => r.module_slug === slug).length ?? 0
      return { slug, label: slug, done: done >= total && total > 0 }
    })

    const completedCount = modulesReq.filter(m => m.done).length
    const progress = Math.round((completedCount / cert.modules.length) * 100)

    return {
      level:       cert.level,
      label:       cert.label,
      description: cert.description,
      color:       cert.color,
      earned:      earnedLevels.has(cert.level),
      progress,
      modulesReq,
    }
  })
}
