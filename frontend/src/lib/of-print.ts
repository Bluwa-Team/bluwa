import type { OrdreFabrication } from '@/app/[locale]/(dashboard)/production/_components/types'

export function printOf(of: OrdreFabrication): void {
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) return
  win.document.write(buildOfHtml(of))
  win.document.close()
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function buildOfHtml(of: OrdreFabrication): string {
  const pct     = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0
  const barFill = Math.min(pct, 100)
  const restant = Math.max(0, of.qty - of.realise)

  // 5 lignes de déclaration vides pour remplissage terrain
  const declRows = Array.from({ length: 5 }, (_, i) => `
    <tr class="decl-row">
      <td class="decl-cell">${i + 1}</td>
      <td class="decl-cell"></td>
      <td class="decl-cell"></td>
      <td class="decl-cell"></td>
      <td class="decl-cell"></td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>OF ${of.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; }

    @page { size: A4; margin: 15mm 15mm 18mm; }
    @media print { body { margin: 0; } .no-print { display: none; } }

    .page { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }

    /* ── En-tête ── */
    .doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 6mm; border-bottom: 2.5px solid #7c3aed; margin-bottom: 6mm;
    }
    .brand-name { font-size: 22pt; font-weight: 800; color: #7c3aed; letter-spacing: -0.5px; }
    .brand-sub  { font-size: 8pt; color: #777; margin-top: 2px; }
    .doc-meta   { text-align: right; }
    .doc-type   { font-size: 15pt; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
    .doc-number { font-family: 'Courier New', monospace; font-size: 13pt; font-weight: 800; margin-top: 3px; }
    .doc-date   { font-size: 9pt; color: #666; margin-top: 2px; }

    /* ── Bloc produit ── */
    .product-block {
      background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 6px;
      padding: 5mm; margin-bottom: 5mm;
    }
    .product-name  { font-size: 14pt; font-weight: 800; color: #4c1d95; }
    .product-sku   { font-family: 'Courier New', monospace; font-size: 9pt; color: #7c3aed; margin-top: 1.5mm; }
    .product-qty   {
      margin-top: 3mm; font-size: 11pt; font-weight: 700;
      display: flex; align-items: baseline; gap: 2mm;
    }
    .qty-val  { font-family: 'Courier New', monospace; font-size: 18pt; color: #4c1d95; }
    .qty-unit { font-size: 10pt; color: #7c3aed; }

    /* ── Grille infos ── */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; margin-bottom: 5mm;
    }
    .info-box   { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3mm 4mm; }
    .info-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 1.5mm; }
    .info-val   { font-size: 10pt; font-weight: 600; color: #111; }
    .info-val.mono { font-family: 'Courier New', monospace; }

    /* ── Avancement ── */
    .progress-block { margin-bottom: 5mm; }
    .progress-title { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 2mm; }
    .progress-bar-bg {
      height: 6mm; background: #e9d5ff; border-radius: 3mm; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; background: #7c3aed; border-radius: 3mm;
      width: ${barFill}%;
    }
    .progress-legend {
      display: flex; justify-content: space-between; margin-top: 1.5mm;
      font-size: 8.5pt; font-family: 'Courier New', monospace;
    }
    .prog-done    { color: #7c3aed; font-weight: 700; }
    .prog-pct     { font-weight: 700; }
    .prog-restant { color: #dc2626; }

    /* ── Section terrain ── */
    .section-title {
      font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
      color: #fff; background: #7c3aed; padding: 1.5mm 3mm; border-radius: 3px;
      margin-bottom: 2.5mm; display: inline-block;
    }

    /* ── Table déclarations ── */
    .decl-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 9.5pt; }
    .decl-table thead tr { background: #7c3aed; color: white; }
    .decl-table thead th {
      padding: 2mm 3mm; text-align: left;
      font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .decl-row td { border: 1px solid #e5e7eb; padding: 0; height: 8mm; }
    .decl-cell { padding: 1mm 2mm; }

    /* ── Clôture lot ── */
    .cloture-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 5mm;
    }
    .cloture-box { border: 1.5px dashed #c4b5fd; border-radius: 4px; padding: 3mm 4mm; }
    .cloture-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #7c3aed; margin-bottom: 1.5mm; }
    .cloture-line  { border-bottom: 1px solid #ccc; margin-top: 8mm; }

    /* ── Signature ── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
    .sig-box  { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3mm 4mm; }
    .sig-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 2mm; }
    .sig-line  { border-bottom: 1px solid #ccc; margin-top: 14mm; margin-bottom: 1.5mm; }
    .sig-label { font-size: 8pt; color: #888; text-align: center; }

    .print-btn {
      display: block; margin: 6mm auto 2mm; padding: 2.5mm 8mm;
      background: #7c3aed; color: white; border: none; border-radius: 4px;
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
      <div class="doc-type">Ordre de Fabrication</div>
      <div class="doc-number">${of.numero}</div>
      <div class="doc-date">Date besoin : ${fmtDate(of.dateBesoin)}</div>
    </div>
  </div>

  <div class="product-block">
    <div class="product-name">${of.produitFini}</div>
    <div class="product-sku">SKU : ${of.sku}</div>
    <div class="product-qty">
      <span class="qty-val">${of.qty}</span>
      <span class="qty-unit">${of.unite} à produire</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Ligne</div>
      <div class="info-val mono">${of.ligne}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Début planifié</div>
      <div class="info-val">${fmtDate(of.debutPlanif)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Opérateur prép.</div>
      <div class="info-val">${of.operateurPrep ?? '—'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Picking</div>
      <div class="info-val" style="color:${of.picking === 'Valide' ? '#16a34a' : '#d97706'}">
        ${of.picking === 'Valide' ? '✓ Validé' : '⚠ À valider'}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Statut</div>
      <div class="info-val">${of.statut}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Lot PF</div>
      <div class="info-val mono">${of.lotPF ?? 'À générer'}</div>
    </div>
  </div>

  <div class="progress-block">
    <div class="progress-title">Avancement production</div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill"></div>
    </div>
    <div class="progress-legend">
      <span class="prog-done">Réalisé : ${of.realise} ${of.unite}</span>
      <span class="prog-pct">${pct}%</span>
      <span class="prog-restant">Restant : ${restant} ${of.unite}</span>
    </div>
  </div>

  <div class="section-title">Déclarations de production (terrain)</div>
  <table class="decl-table">
    <thead>
      <tr>
        <th style="width:8mm">N°</th>
        <th>Heure</th>
        <th>Qté déclarée (${of.unite})</th>
        <th>Opérateur</th>
        <th>Visa</th>
      </tr>
    </thead>
    <tbody>${declRows}</tbody>
  </table>

  <div class="cloture-grid">
    <div class="cloture-box">
      <div class="cloture-label">N° Lot PF généré</div>
      <div class="cloture-line"></div>
    </div>
    <div class="cloture-box">
      <div class="cloture-label">DLC / DLUO</div>
      <div class="cloture-line"></div>
    </div>
  </div>

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-title">Visa Chef d'équipe</div>
      <div class="sig-line"></div>
      <div class="sig-label">Nom &amp; Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Visa Responsable qualité</div>
      <div class="sig-line"></div>
      <div class="sig-label">Nom &amp; Signature</div>
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
