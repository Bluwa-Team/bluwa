/**
 * db-client.ts — Mutations Supabase côté navigateur (browser-side uniquement)
 * Utilise createClient depuis @/lib/supabase/client
 */
'use client'

import { createClient } from '@/lib/supabase/client'

// ─── Organisations ──────────────────────────────────────────────────────────

function generateFactoryCode(siteName: string, city: string): string {
  const n = siteName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'SITE'
  const c = city.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'LOC'
  return `${n}-${c}`
}

const INSTALL_AMOUNTS: Record<string, number> = { tpe: 150000, pme: 500000, grande: 1500000 }

export async function createOrg(
  name: string,
  country: string,
  sites: { name: string; city: string; plan_id: string | null; plan_size: string }[],
): Promise<string> {
  const supabase = createClient()
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name, country_headquarters: country, status: 'trial', currency: 'XOF' })
    .select('id')
    .single()
  if (orgErr || !org) throw new Error(orgErr?.message ?? 'Erreur création organisation')

  for (const site of sites) {
    const { data: factory, error: facErr } = await supabase
      .from('factories')
      .insert({
        organization_id: org.id,
        name: site.name,
        code: generateFactoryCode(site.name, site.city),
        location_country: country,
        location_city: site.city,
        timezone: 'Africa/Abidjan',
        currency: 'XOF',
        subscription_plan_id: site.plan_id,
        subscription_status: site.plan_id ? 'ACTIVE' : null,
        is_active: true,
      })
      .select('id')
      .single()
    if (facErr || !factory) throw new Error(facErr?.message ?? 'Erreur création site')

    await supabase.from('installation_fees').insert({
      factory_id: factory.id,
      size: site.plan_size,
      amount_xof: INSTALL_AMOUNTS[site.plan_size] ?? 150000,
      currency: 'XOF',
      status: 'pending',
    })
  }

  return org.id
}

export async function updateOrgStatus(orgId: string, status: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('organizations').update({ status }).eq('id', orgId)
  if (error) throw new Error(error.message)
}

// ─── Factories / Plans ──────────────────────────────────────────────────────

export async function updateFactoryPlan(factoryId: string, planId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('factories')
    .update({ subscription_plan_id: planId, subscription_status: 'ACTIVE' })
    .eq('id', factoryId)
  if (error) throw new Error(error.message)
}

// ─── Utilisateurs ───────────────────────────────────────────────────────────

export async function createUser(
  orgId: string,
  email: string,
  firstName: string,
  lastName: string | null,
  role: string,
  siteIds: string[],
): Promise<string> {
  const supabase = createClient()
  const { data: user, error } = await supabase
    .from('users')
    .insert({ organization_id: orgId, email, first_name: firstName, last_name: lastName, role, is_active: true })
    .select('id')
    .single()
  if (error || !user) throw new Error(error?.message ?? 'Erreur création utilisateur')

  if (siteIds.length > 0) {
    await supabase.from('user_site_access').insert(
      siteIds.map((factory_id) => ({ user_id: user.id, factory_id })),
    )
  }
  return user.id
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('users').update({ role }).eq('id', userId)
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
}

export async function setUserSiteAccess(userId: string, siteIds: string[]): Promise<void> {
  const supabase = createClient()
  await supabase.from('user_site_access').delete().eq('user_id', userId)
  if (siteIds.length > 0) {
    await supabase.from('user_site_access').insert(
      siteIds.map((factory_id) => ({ user_id: userId, factory_id })),
    )
  }
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function createProspect(
  orgName: string,
  country: string | null,
  planTarget: string,
  assignedTo: string | null,
  notes: string | null,
  checklist: string[],
): Promise<void> {
  const supabase = createClient()
  const { data: pipeline, error } = await supabase
    .from('onboarding_pipeline')
    .insert({
      org_name: orgName,
      country: country || null,
      stage: 'prospect',
      plan_target: planTarget,
      assigned_to: assignedTo || null,
      notes: notes || null,
    })
    .select('id')
    .single()
  if (error || !pipeline) throw new Error(error?.message ?? 'Erreur création prospect')

  if (checklist.length > 0) {
    await supabase.from('onboarding_checklist').insert(
      checklist.map((label, i) => ({ pipeline_id: pipeline.id, label, done: false, sort_order: i })),
    )
  }
}

// ─── Support ─────────────────────────────────────────────────────────────────

export async function addTicketReply(
  ticketId: string,
  currentMessages: object[],
  author: string,
  content: string,
  isInternal: boolean,
  newStatus?: string,
): Promise<void> {
  const supabase = createClient()
  const newMsg = {
    id: crypto.randomUUID(),
    author,
    content,
    is_internal: isInternal,
    created_at: new Date().toISOString(),
  }
  const updates: Record<string, unknown> = {
    messages: [...currentMessages, newMsg],
    updated_at: new Date().toISOString(),
  }
  if (newStatus) updates.status = newStatus
  const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId)
  if (error) throw new Error(error.message)
}

// ─── Checklist / Pipeline ────────────────────────────────────────────────────

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

export async function recordInvoicePayment(
  invoiceId: string,
  payment: { method: string; reference: string; note: string; paid_at: string },
): Promise<void> {
  const supabase = createClient()
  await supabase.from('invoices').update({
    status:             'paid',
    paid_at:            payment.paid_at,
    payment_method:     payment.method,
    payment_reference:  payment.reference || null,
    payment_note:       payment.note || null,
  }).eq('id', invoiceId)
}
