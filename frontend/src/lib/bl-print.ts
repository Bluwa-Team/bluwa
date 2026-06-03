import type { BonLivraison, BonLivraisonItem } from '@/app/[locale]/(dashboard)/logistique/_components/types'

export function printBl(bl: BonLivraison, items: BonLivraisonItem[]): void {
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) return
  win.document.write(buildBlHtml(bl, items))
  win.document.close()
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtNum(n: number): string {
  return n.toLocaleString('fr-FR')
}

function buildBlHtml(bl: BonLivraison, items: BonLivraisonItem[]): string {
  const totalLivree = items.reduce((s, i) => s + i.quantiteLivree, 0)
  const unite0      = items[0]?.unite ?? ''

  const rows = items.map((item) => `
    <tr>
      <td class="pos">${String(item.itemPosition).padStart(2, '0')}</td>
      <td class="designation">${item.article}</td>
      <td class="right">${fmtNum(item.quantiteCommandee)}</td>
      <td class="right livree">${fmtNum(item.quantiteLivree)}</td>
      <td class="center">${item.unite}</td>
      <td class="lot">${item.lot ?? '—'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>BL ${bl.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; }

    @page { size: A4; margin: 15mm 15mm 18mm; }
    @media print { body { margin: 0; } .no-print { display: none; } }

    .page { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }

    /* ── En-tête ── */
    .doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 6mm; border-bottom: 2.5px solid #0f766e; margin-bottom: 6mm;
    }
    .brand-name { font-size: 22pt; font-weight: 800; color: #0f766e; letter-spacing: -0.5px; }
    .brand-sub  { font-size: 8pt; color: #777; margin-top: 2px; }
    .doc-meta   { text-align: right; }
    .doc-type   { font-size: 15pt; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; }
    .doc-number { font-family: 'Courier New', monospace; font-size: 11pt; font-weight: 600; margin-top: 3px; }
    .doc-date   { font-size: 9pt; color: #666; margin-top: 2px; }

    /* ── Parties ── */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 5mm; }
    .party-box   { border: 1px solid #e5e7eb; border-radius: 4px; padding: 4mm; }
    .party-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 2mm; }
    .party-name  { font-size: 11pt; font-weight: 700; }
    .party-detail{ font-size: 9pt; color: #555; margin-top: 2mm; line-height: 1.6; }

    /* ── Transport ── */
    .transport-bar {
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;
      padding: 3mm 4mm; margin-bottom: 5mm;
      display: flex; gap: 8mm; flex-wrap: wrap; font-size: 9pt;
    }
    .t-item { display: flex; flex-direction: column; gap: 0.5mm; }
    .t-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a; }
    .t-val   { font-family: 'Courier New', monospace; font-weight: 600; }

    /* ── Tableau ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 9.5pt; }
    thead tr { background: #0f766e; color: white; }
    thead th {
      padding: 2.5mm 3mm; text-align: left;
      font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
    }
    thead th.right  { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody td { padding: 2.5mm 3mm; vertical-align: middle; }

    .pos         { font-family: 'Courier New', monospace; font-size: 8pt; color: #999; width: 8mm; }
    .designation { }
    .right       { text-align: right; font-family: 'Courier New', monospace; width: 22mm; }
    .livree      { font-weight: 700; color: #0f766e; }
    .center      { text-align: center; color: #666; font-size: 8.5pt; width: 14mm; }
    .lot         { font-family: 'Courier New', monospace; font-size: 8pt; color: #555; width: 28mm; }

    /* ── Totaux ── */
    .totaux {
      display: flex; justify-content: flex-end; margin-bottom: 6mm;
    }
    .totaux-table { width: 72mm; border-collapse: collapse; }
    .totaux-table td { padding: 1.5mm 3mm; font-size: 10pt; }
    .totaux-label { color: #555; }
    .totaux-value { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; color: #0f766e; font-size: 11pt; }
    .totaux-row   { border-top: 2px solid #0f766e; background: #f0fdf4; }

    /* ── Notes ── */
    .notes-block {
      border: 1px solid #e5e7eb; border-radius: 4px; padding: 3mm 4mm;
      font-size: 8.5pt; color: #555; line-height: 1.6; margin-bottom: 6mm;
    }
    .notes-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 1.5mm; }

    /* ── Signatures ── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
    .sig-box  { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3mm 4mm; }
    .sig-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 2mm; }
    .sig-line  { border-bottom: 1px solid #ccc; margin-top: 16mm; margin-bottom: 1.5mm; }
    .sig-label { font-size: 8pt; color: #888; text-align: center; }

    .print-btn {
      display: block; margin: 6mm auto 2mm; padding: 2.5mm 8mm;
      background: #0f766e; color: white; border: none; border-radius: 4px;
      font-size: 10pt; cursor: pointer;
    }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand-name">Bluwa</div>
      <div class="brand-sub">Production agro-alimentaire · Afrique de l'Ouest</div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">Bon de Livraison</div>
      <div class="doc-number">${bl.numero}</div>
      <div class="doc-date">Date livraison : ${fmtDate(bl.date)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Expéditeur</div>
      <div class="party-name">Bluwa</div>
      <div class="party-detail">Production agro-alimentaire<br>Afrique de l'Ouest</div>
    </div>
    <div class="party-box">
      <div class="party-label">Destinataire</div>
      <div class="party-name">${bl.client}</div>
      <div class="party-detail">
        ${bl.adresseLivraison ? bl.adresseLivraison : 'Adresse non renseignée'}
        ${bl.commandeNum ? `<br>Commande réf. : <strong>${bl.commandeNum}</strong>` : ''}
      </div>
    </div>
  </div>

  <div class="transport-bar">
    <div class="t-item">
      <span class="t-label">N° BL</span>
      <span class="t-val">${bl.numero}</span>
    </div>
    <div class="t-item">
      <span class="t-label">Transporteur</span>
      <span class="t-val">${bl.transporteur ?? '—'}</span>
    </div>
    ${bl.refSuivi ? `
    <div class="t-item">
      <span class="t-label">Réf. suivi</span>
      <span class="t-val">${bl.refSuivi}</span>
    </div>` : ''}
    <div class="t-item">
      <span class="t-label">Statut</span>
      <span class="t-val">${bl.statut}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Article</th>
        <th class="right">Qté commandée</th>
        <th class="right">Qté livrée</th>
        <th class="center">Unité</th>
        <th>N° Lot</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#999;padding:4mm">Aucune ligne article</td></tr>'}
    </tbody>
  </table>

  <div class="totaux">
    <table class="totaux-table">
      <tr class="totaux-row">
        <td class="totaux-label">Total livré</td>
        <td class="totaux-value">${fmtNum(totalLivree)}&nbsp;${unite0}</td>
      </tr>
    </table>
  </div>

  ${bl.notes ? `
  <div class="notes-block">
    <div class="notes-title">Notes / Instructions</div>
    ${bl.notes}
  </div>` : ''}

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-title">Expédié par — Bluwa</div>
      <div class="sig-line"></div>
      <div class="sig-label">Nom &amp; Signature · Chauffeur / Logisticien</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Reçu par — ${bl.client}</div>
      <div class="sig-line"></div>
      <div class="sig-label">Nom &amp; Signature · Cachet client</div>
    </div>
  </div>

</div>
<button class="print-btn no-print" onclick="window.print()">🖨 Imprimer</button>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 300);
  });
<\/script>
</body>
</html>`
}
