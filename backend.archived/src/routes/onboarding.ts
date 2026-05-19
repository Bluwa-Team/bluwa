import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

router.post('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non autorisé.' })
    return
  }

  const jwt = authHeader.split(' ')[1]

  // Récupérer l'utilisateur depuis le JWT
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
  if (userError || !user) {
    res.status(401).json({ error: 'Session invalide.' })
    return
  }

  const { orgName, factoryName, factoryLocation } = req.body

  if (!orgName || !factoryName) {
    res.status(400).json({ error: 'Nom de l\'organisation et de l\'usine requis.' })
    return
  }

  const slug = generateSlug(orgName)

  // 1. Créer l'organisation
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: orgName, slug })
    .select()
    .single()

  if (orgError) {
    const message = orgError.code === '23505'
      ? 'Ce nom d\'organisation est déjà pris.'
      : orgError.message
    res.status(400).json({ error: message })
    return
  }

  // 2. Créer la factory
  const { data: factory, error: factoryError } = await supabaseAdmin
    .from('factories')
    .insert({
      organization_id: org.id,
      name: factoryName,
      location: factoryLocation || null,
    })
    .select()
    .single()

  if (factoryError) {
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    res.status(400).json({ error: factoryError.message })
    return
  }

  // 3. Créer le profil org_admin
  const fullName = user.user_metadata?.full_name || user.email || ''
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      organization_id: org.id,
      factory_id: null,
      role: 'org_admin',
      full_name: fullName,
    })

  if (profileError) {
    await supabaseAdmin.from('factories').delete().eq('id', factory.id)
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    res.status(400).json({ error: profileError.message })
    return
  }

  res.status(201).json({ success: true, slug: org.slug })
})

export default router
