/**
 * Génère un numéro de lot selon le format standard Bluwa :
 *   {TYPE}-{AAAAMMJJ}-{NNNN}
 *
 * Exemples :
 *   MP-20260604-0031   (Matière Première)
 *   PF-20260604-0001   (Produit Fini)
 *   AC-20260604-0018   (Article Consommable)
 *   PSF-20260604-0005  (Produit Semi-Fini)
 */
export function generateBatchNumber(articleType: string, date: Date, seq: number): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `${articleType}-${dateStr}-${String(seq).padStart(4, '0')}`
}
