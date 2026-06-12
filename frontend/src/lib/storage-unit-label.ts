// Génère des étiquettes Storage Unit 100×72mm avec CODE128 + QR code.
// Utilisé pour la réception (lot MP/AC/CS) et la sortie de production (lot PF).

export type StorageUnitSource = 'RECEPTION' | 'PRODUCTION'

export interface StorageUnitLabelData {
  lotNumber:   string         // identifiant du lot — valeur encodée dans barcode + QR
  articleName: string         // désignation article
  articleSku:  string         // code article (monospace)
  quantity:    number
  unit:        string
  expiryDate:  string         // ISO date DLC/DLUO
  sourceType:  StorageUnitSource
  sourceRef:   string         // N° REC-YYYY-NNN ou N° OF-YYYY-NNN
  sourceDate:  string         // ISO date réception ou production
  supplier?:   string         // fournisseur (réception uniquement)
  orgName?:    string         // nom de l'organisation — remplace "Bluwa" sur le template
}

export function printStorageLabels(
  data:            StorageUnitLabelData,
  nbContenants:    number,
  qtyPerContenant: number,
): void {
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(buildHtml(data, nbContenants, qtyPerContenant))
  win.document.close()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function isDlcUrgent(iso: string): boolean {
  if (!iso) return false
  const diff = (new Date(iso).getTime() - Date.now()) / 86400000
  return diff < 30
}

// ── Générateur HTML ───────────────────────────────────────────────────────────

function buildHtml(
  data:            StorageUnitLabelData,
  nbContenants:    number,
  qtyPerContenant: number,
): string {
  const isRec     = data.sourceType === 'RECEPTION'
  const badgeText = isRec ? 'RÉCEPTION' : 'PRODUCTION PF'
  const badgeBg   = isRec ? '#1d4ed8' : '#059669'
  const dlcUrgent = isDlcUrgent(data.expiryDate)

  const labelHtml = Array.from({ length: nbContenants }, (_, i) => {
    const num = i + 1
    return `
<div class="label">
  <div class="row-top">
    <div class="brand">${data.orgName || '—'}</div>
    <span class="badge" style="background:${badgeBg}">${badgeText}</span>
    <div class="qr" id="qr-${num}"></div>
  </div>

  <div class="lot-number">${data.lotNumber}</div>
  <div class="article-name">${data.articleName}</div>
  <div class="article-sku">${data.articleSku}</div>

  <div class="separator"></div>

  <div class="info-row">
    <span class="info-qty">
      <span class="info-label">Qté / cont.</span>
      <span class="info-val">${qtyPerContenant}&nbsp;${data.unit}</span>
    </span>
    <span class="info-dlc ${dlcUrgent ? 'dlc-urgent' : ''}">
      <span class="info-label">DLC/DLUO</span>
      <span class="info-val">${fmtDate(data.expiryDate)}</span>
    </span>
    <span class="info-cont">
      <span class="info-label">Cont.</span>
      <span class="info-val">${num}/${nbContenants}</span>
    </span>
  </div>

  <div class="source-row">
    ↳ ${data.sourceRef} · ${data.supplier ? data.supplier + ' · ' : ''}${fmtDate(data.sourceDate)}
  </div>

  <svg class="barcode" id="bc-${num}"></svg>
</div>`
  }).join('\n')

  const qrInits = Array.from({ length: nbContenants }, (_, i) => {
    const num = i + 1
    return `
      try {
        var qr${num} = qrcode(0, 'M');
        qr${num}.addData('${data.lotNumber}');
        qr${num}.make();
        document.getElementById('qr-${num}').innerHTML = qr${num}.createSvgTag(1.8, 0);
      } catch(e) {}`
  }).join('\n')

  const bcInits = Array.from({ length: nbContenants }, (_, i) => {
    const num = i + 1
    return `
      try {
        JsBarcode('#bc-${num}', '${data.lotNumber}', {
          format: 'CODE128',
          displayValue: true,
          fontSize: 8,
          height: 28,
          margin: 0,
          textMargin: 1,
          lineColor: '#111',
        });
      } catch(e) {}`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Étiquettes — ${data.lotNumber}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; background: #f0f0f0; }

    @page { size: 100mm 72mm; margin: 0; }
    @media print {
      body { background: white; margin: 0; }
      .label { margin: 0 !important; border: none !important; page-break-after: always; }
      .label:last-child { page-break-after: avoid; }
      .no-print { display: none; }
    }

    /* ── Étiquette ── */
    .label {
      width: 100mm;
      height: 72mm;
      padding: 3.5mm 4.5mm 3mm;
      border: 1.5px dashed #aaa;
      margin: 5mm auto;
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      background: white;
      overflow: hidden;
    }

    /* ── Ligne du haut ── */
    .row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2mm;
    }
    .brand {
      font-size: 12pt;
      font-weight: 800;
      color: #111;
      letter-spacing: -0.3px;
      flex: 1;
    }
    .badge {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: white;
      border-radius: 2px;
      padding: 1px 4px;
      flex-shrink: 0;
    }
    .qr {
      width: 13mm;
      height: 13mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr svg { width: 13mm !important; height: 13mm !important; }

    /* ── Numéro de lot ── */
    .lot-number {
      font-family: 'Courier New', monospace;
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #111;
      line-height: 1;
    }

    /* ── Article ── */
    .article-name {
      font-size: 9.5pt;
      font-weight: 600;
      color: #222;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .article-sku {
      font-family: 'Courier New', monospace;
      font-size: 7.5pt;
      color: #888;
      line-height: 1;
    }

    /* ── Séparateur ── */
    .separator {
      border-top: 0.5px solid #ddd;
      margin: 0.5mm 0;
    }

    /* ── Infos (qté / DLC / contenant) ── */
    .info-row {
      display: flex;
      gap: 2mm;
    }
    .info-qty, .info-dlc, .info-cont {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .info-qty  { flex: 1.2; }
    .info-dlc  { flex: 1.5; }
    .info-cont { flex: 0.8; }
    .info-label {
      font-size: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #999;
      font-weight: 600;
    }
    .info-val {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      font-weight: 700;
      color: #111;
    }
    .dlc-urgent .info-val {
      color: #cc0000;
    }

    /* ── Source ── */
    .source-row {
      font-size: 7pt;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
    }

    /* ── Barcode ── */
    .barcode {
      display: block;
      width: 100%;
      height: 11mm;
      margin-top: auto;
    }

    /* ── Bouton aperçu ── */
    .print-btn {
      display: block;
      margin: 5mm auto;
      padding: 2mm 8mm;
      background: #111;
      color: white;
      border: none;
      border-radius: 3px;
      font-size: 10pt;
      cursor: pointer;
    }
  </style>
</head>
<body>

${labelHtml}

<button class="print-btn no-print" onclick="window.print()">🖨 Imprimer (${nbContenants} étiquette${nbContenants > 1 ? 's' : ''})</button>

<script>
  window.addEventListener('load', function () {
    ${qrInits}
    ${bcInits}
    setTimeout(function () { window.print(); }, 500);
  });
<\/script>
</body>
</html>`
}
