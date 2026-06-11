import type { TypeCommande } from './types'

export interface BcPrintHeader {
  numero:     string
  type:       TypeCommande
  date:       string
  fournisseur: string
  contrat:    string | null
  currency:   string
  orgName?:   string
}

export interface BcPrintItem {
  article:         string
  quantite:        number
  unite:           string
  puHT:            number
  livraisonPrevue: string
}

export function printBcDoc(header: BcPrintHeader, items: BcPrintItem[]): void {
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) return
  win.document.write(buildBcHtml(header, items))
  win.document.close()
}

function fmtNum(n: number): string {
  return n.toLocaleString('fr-FR')
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function buildBcHtml(header: BcPrintHeader, items: BcPrintItem[]): string {
  const isBC       = header.type === 'BC'
  const docTitle   = isBC ? 'BON DE COMMANDE' : "BON D'ACHAT"
  const accent     = isBC ? '#1d4ed8' : '#b45309'
  const accentLight = isBC ? '#eff6ff' : '#fffbeb'
  const accentBadge = isBC ? 'Fournisseur Formel · BC' : "Fournisseur Informel · BA"

  const totalHT = items.reduce((sum, i) => sum + i.quantite * i.puHT, 0)

  const firstDelivery = items[0]?.livraisonPrevue ?? ''

  const rows = items.map((item, idx) => `
    <tr>
      <td class="pos">${String(idx + 1).padStart(2, '0')}</td>
      <td class="designation">${item.article}</td>
      <td class="qty">${fmtNum(item.quantite)}</td>
      <td class="unit">${item.unite || '—'}</td>
      <td class="price">${fmtNum(item.puHT)}</td>
      <td class="amount">${fmtNum(item.quantite * item.puHT)}</td>
      <td class="delivery">${fmtDate(item.livraisonPrevue)}</td>
    </tr>
  `).join('')

  const conditions = isBC
    ? `• Ce bon de commande est soumis à nos conditions générales d'achat.<br>
       • Veuillez mentionner le numéro <strong>${header.numero}</strong> sur tous vos documents.<br>
       • Un bon de livraison signé est obligatoire à chaque livraison.<br>
       • Tout écart de quantité supérieur à 2&nbsp;% sera signalé par écrit.`
    : `• Ce bon d'achat confirme notre intention d'achat au comptant.<br>
       • Livraison uniquement sur rendez-vous préalable.<br>
       • Paiement à la livraison contre remise du bon de livraison.<br>
       • La marchandise sera contrôlée à la réception.`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} ${header.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; background: white; }

    @page { size: A4; margin: 15mm 15mm 18mm; }
    @media print { body { margin: 0; } .no-print { display: none; } }

    .page { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }

    /* ── En-tête ── */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6mm;
      border-bottom: 2.5px solid ${accent};
      margin-bottom: 6mm;
    }
    .brand-name  { font-size: 22pt; font-weight: 800; color: ${accent}; letter-spacing: -0.5px; }
    .brand-sub   { font-size: 8pt; color: #777; margin-top: 2px; }
    .doc-meta    { text-align: right; }
    .doc-type    { font-size: 15pt; font-weight: 700; color: ${accent}; text-transform: uppercase; letter-spacing: 1px; }
    .doc-number  { font-family: 'Courier New', monospace; font-size: 11pt; font-weight: 600; margin-top: 3px; }
    .doc-date    { font-size: 9pt; color: #666; margin-top: 2px; }

    /* ── Parties ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
      margin-bottom: 6mm;
    }
    .party-box   { border: 1px solid #e5e7eb; border-radius: 4px; padding: 4mm; }
    .party-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 2mm; }
    .party-name  { font-size: 11pt; font-weight: 700; }
    .party-detail{ font-size: 9pt; color: #555; margin-top: 2mm; line-height: 1.6; }
    .badge {
      display: inline-block;
      background: ${accentLight};
      color: ${accent};
      border: 1px solid ${accent}55;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 1px 6px;
      margin-top: 2mm;
    }

    /* ── Tableau lignes ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 9.5pt; }
    thead tr { background: ${accent}; color: white; }
    thead th {
      padding: 2.5mm 3mm;
      text-align: left;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }

    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody td { padding: 2.5mm 3mm; vertical-align: middle; }

    .pos         { font-family: 'Courier New', monospace; font-size: 8pt; color: #999; width: 8mm; }
    .designation { }
    .qty         { text-align: right; font-family: 'Courier New', monospace; width: 18mm; }
    .unit        { text-align: center; color: #666; font-size: 8.5pt; width: 14mm; }
    .price       { text-align: right; font-family: 'Courier New', monospace; width: 26mm; }
    .amount      { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; width: 28mm; }
    .delivery    { text-align: center; font-family: 'Courier New', monospace; font-size: 8.5pt; color: #555; width: 22mm; }

    /* ── Total ── */
    .total-block { display: flex; justify-content: flex-end; margin-bottom: 7mm; }
    .total-table { width: 72mm; border-collapse: collapse; }
    .total-table td { padding: 1.5mm 3mm; font-size: 10pt; }
    .total-label { color: #555; }
    .total-value { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; color: ${accent}; font-size: 12pt; }
    .total-row   { border-top: 2px solid ${accent}; background: ${accentLight}; }

    /* ── Footer ── */
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
      padding-top: 5mm;
      border-top: 1px solid #e5e7eb;
    }
    .conditions-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 2mm; }
    .conditions-body  { font-size: 8.5pt; color: #555; line-height: 1.7; }
    .sig-box          { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3mm 4mm; }
    .sig-title        { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 2mm; }
    .sig-line         { border-bottom: 1px solid #ccc; margin-top: 14mm; margin-bottom: 1.5mm; }
    .sig-label        { font-size: 8pt; color: #888; text-align: center; }

    /* ── Bouton aperçu (non imprimé) ── */
    .print-btn {
      display: block;
      margin: 6mm auto 2mm;
      padding: 2.5mm 8mm;
      background: ${accent};
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 10pt;
      cursor: pointer;
    }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand-name">${header.orgName || '—'}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${docTitle}</div>
      <div class="doc-number">${header.numero}</div>
      <div class="doc-date">Date : ${fmtDate(header.date)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Acheteur</div>
      <div class="party-name">${header.orgName || '—'}</div>
    </div>
    <div class="party-box">
      <div class="party-label">Fournisseur</div>
      <div class="party-name">${header.fournisseur}</div>
      <div class="party-detail">
        Devise : <strong>${header.currency}</strong>
        ${header.contrat ? `<br>Contrat cadre : <strong>${header.contrat}</strong>` : ''}
        ${firstDelivery ? `<br>Livraison souhaitée : <strong>${fmtDate(firstDelivery)}</strong>` : ''}
      </div>
      <span class="badge">${accentBadge}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Désignation</th>
        <th class="right">Quantité</th>
        <th class="center">Unité</th>
        <th class="right">PU HT (${header.currency})</th>
        <th class="right">Montant HT</th>
        <th class="center">Livraison prévue</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="total-block">
    <table class="total-table">
      <tr class="total-row">
        <td class="total-label">TOTAL HT</td>
        <td class="total-value">${fmtNum(totalHT)}&nbsp;${header.currency}</td>
      </tr>
    </table>
  </div>

  <div class="footer-grid">
    <div>
      <div class="conditions-title">Conditions</div>
      <div class="conditions-body">${conditions}</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Visa &amp; Cachet</div>
      <div class="sig-line"></div>
      <div class="sig-label">Pour ${header.orgName || '—'} — Responsable achats</div>
    </div>
  </div>

</div>

<button class="print-btn no-print" onclick="window.print()">🖨 Imprimer</button>

<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 350);
  });
<\/script>
</body>
</html>`
}
