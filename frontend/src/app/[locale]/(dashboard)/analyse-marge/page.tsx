export const runtime = 'edge'

import { getTranslations } from 'next-intl/server'

export default async function AnalyseMargesPage() {
  const t = await getTranslations('analyseMarges')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex items-center justify-center h-64 border rounded-lg border-dashed text-muted-foreground">
        {t('underConstruction')}
      </div>
    </div>
  )
}
