'use server'

export type ContactResult =
  | { success: true }
  | { success: false; error: string }

export async function sendContact(formData: FormData): Promise<ContactResult> {
  const name = formData.get('name')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const company = formData.get('company')?.toString().trim() ?? ''
  const message = formData.get('message')?.toString().trim() ?? ''

  if (!name || !email || !message) {
    return { success: false, error: 'Veuillez remplir tous les champs obligatoires.' }
  }

  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL
  const resendKey = process.env.RESEND_API_KEY

  if (!sheetUrl && !resendKey) {
    console.log('[Contact] Nouveau lead (aucun service configuré)', { name, email, company, message })
    return { success: true }
  }

  try {
    // ── 1. Google Sheet ──────────────────────────────────────────────────────
    if (sheetUrl) {
      const url = new URL(sheetUrl)
      url.searchParams.set('name', name)
      url.searchParams.set('email', email)
      url.searchParams.set('company', company)
      url.searchParams.set('message', message)
      const sheetRes = await fetch(url.toString(), { method: 'GET' })
      if (!sheetRes.ok) {
        console.error('[Contact] Google Sheet error', sheetRes.status)
      }
    }

    // ── 2. Email via Resend (optionnel) ──────────────────────────────────────
    if (resendKey) {
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Bluwa Contact <noreply@bluwa.io>',
          to: ['john@bluwa.io'],
          reply_to: email,
          subject: `[Bluwa] Nouveau lead — ${name} (${company || 'sans entreprise'})`,
          html: `
            <p><strong>Nom :</strong> ${name}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Entreprise :</strong> ${company || '—'}</p>
            <hr />
            <p>${message.replace(/\n/g, '<br />')}</p>
          `,
        }),
      })
      if (!mailRes.ok) {
        console.error('[Contact] Resend error', mailRes.status)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[Contact] Error', err)
    return { success: false, error: 'Erreur réseau. Veuillez réessayer.' }
  }
}
