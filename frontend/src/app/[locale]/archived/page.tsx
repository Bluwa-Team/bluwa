import Image from 'next/image'
import Link from 'next/link'

export default function ArchivedPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-transparent flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <Link href="/" className="inline-block">
          <Image src="/bluwa_text.png" alt="Bluwa" width={120} height={36} className="mx-auto dark:brightness-0 dark:invert" />
        </Link>

        <div className="rounded-xl border bg-card p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8L6 7h12l-2-4z" />
            </svg>
          </div>

          <div>
            <h1 className="text-lg font-semibold">Compte archivé</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Votre organisation a été archivée et n&apos;a plus accès à Bluwa ERP.
              Contactez votre administrateur ou l&apos;équipe Bluwa pour plus d&apos;informations.
            </p>
          </div>

          <a
            href="mailto:support@bluwa.io"
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Contacter le support
          </a>
        </div>

        <p className="text-xs text-muted-foreground">support@bluwa.io</p>
      </div>
    </div>
  )
}
