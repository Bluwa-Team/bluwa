import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body

  if (!fullName || !email || !password) {
    res.status(400).json({ error: 'Tous les champs sont requis.' })
    return
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) {
    const message = error.message.includes('already')
      ? 'Cet email est déjà utilisé.'
      : error.message
    res.status(400).json({ error: message })
    return
  }

  res.status(201).json({ success: true, userId: data.user.id })
})

export default router
