'use server'

import { Resend } from 'resend'

export async function sendContactEmail(data: {
  nom:     string
  email:   string
  objet:   string
  message: string
}): Promise<{ success: boolean; fallback?: boolean; error?: string }> {

  // Sans clé Resend → signaler le fallback (ContactForm utilisera mailto:)
  if (!process.env.RESEND_API_KEY) {
    return { success: true, fallback: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from:    'Bluwa Academy <noreply@bluwa.io>',
      to:      'academy@bluwa.io',
      replyTo: data.email,
      subject: `[Bluwa Academy] ${data.objet} — ${data.nom}`,
      text:    `Nom : ${data.nom}\nEmail : ${data.email}\nObjet : ${data.objet}\n\n${data.message}`,
    })
    return { success: true }
  } catch {
    return { success: false, error: "Erreur lors de l'envoi." }
  }
}
