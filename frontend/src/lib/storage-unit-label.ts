// Génère des étiquettes Storage Unit avec CODE128 + QR code.
// Utilisé pour la réception (lot MP/AC/CS) et la sortie de production (lot PF).

export type StorageUnitSource = 'RECEPTION' | 'PRODUCTION'

export interface StorageUnitLabelData {
  lotNumber:   string
  articleName: string
  articleSku:  string
  quantity:    number
  unit:        string
  expiryDate:  string
  sourceType:  StorageUnitSource
  sourceRef:   string
  sourceDate:  string
  supplier?:   string
  orgName?:    string
}

// ── Formats de planche ────────────────────────────────────────────────────────

export interface LabelFormat {
  code:      string   // '0812'
  dims:      string   // '99.1 × 67.8 mm'
  widthMm:   number
  heightMm:  number
  perSheet:  number
  cols:      number
  rows:      number
}

export const LABEL_FORMATS: LabelFormat[] = [
  { code: '0119', dims: '199.6 × 289.1 mm', widthMm: 199.6, heightMm: 289.1, perSheet: 1,  cols: 1, rows: 1 },
  { code: '0218', dims: '199.6 × 143.5 mm', widthMm: 199.6, heightMm: 143.5, perSheet: 2,  cols: 1, rows: 2 },
  { code: '0416', dims: '100 × 139 mm',     widthMm: 100,   heightMm: 139,   perSheet: 4,  cols: 2, rows: 2 },
  { code: '0812', dims: '99.1 × 67.8 mm',   widthMm: 99.1,  heightMm: 67.8,  perSheet: 8,  cols: 2, rows: 4 },
  { code: '1413', dims: '99.1 × 38.1 mm',   widthMm: 99.1,  heightMm: 38.1,  perSheet: 14, cols: 2, rows: 7 },
  { code: '1611', dims: '100 × 34 mm',      widthMm: 100,   heightMm: 34,    perSheet: 16, cols: 2, rows: 8 },
  { code: '2113', dims: '63.5 × 38.2 mm',   widthMm: 63.5,  heightMm: 38.2,  perSheet: 21, cols: 3, rows: 7 },
  { code: '6517', dims: '64 × 34 mm',       widthMm: 64,    heightMm: 34,    perSheet: 24, cols: 3, rows: 8 },
]

export const DEFAULT_FORMAT = LABEL_FORMATS[3] // 0812

// ── Point d'entrée ────────────────────────────────────────────────────────────

export function printStorageLabels(
  data:            StorageUnitLabelData,
  nbContenants:    number,
  qtyPerContenant: number,
  format:          LabelFormat = DEFAULT_FORMAT,
): void {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return
  win.document.write(buildHtml(data, nbContenants, qtyPerContenant, format))
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
  return (new Date(iso).getTime() - Date.now()) / 86400000 < 30
}

// Niveau de contenu selon la hauteur de l'étiquette
type Tier = 'lg' | 'md' | 'sm'
function getTier(heightMm: number): Tier {
  if (heightMm >= 100) return 'lg'
  if (heightMm >= 45)  return 'md'
  return 'sm'
}

// ── Générateur HTML ───────────────────────────────────────────────────────────

function buildHtml(
  data:            StorageUnitLabelData,
  nbContenants:    number,
  qtyPerContenant: number,
  fmt:             LabelFormat,
): string {
  const tier      = getTier(fmt.heightMm)
  const isRec     = data.sourceType === 'RECEPTION'
  const badgeBg   = isRec ? '#1d4ed8' : '#059669'
  const badgeText = isRec ? 'RÉCEPTION' : 'PRODUCTION PF'
  const dlcUrgent = isDlcUrgent(data.expiryDate)

  // Marges pour centrer la grille sur A4 (210 × 297 mm)
  const a4W = 210, a4H = 297
  const sideMargin = Math.max(2, (a4W - fmt.cols * fmt.widthMm)  / 2)
  const topMargin  = Math.max(2, (a4H - fmt.rows * fmt.heightMm) / 2)

  // Taille barcode selon tier
  const bcHeight    = tier === 'sm' ? 16 : tier === 'lg' ? 32 : 26
  const bcFontSize  = tier === 'sm' ? 0  : 8
  const bcShowText  = tier !== 'sm'
  const qrSizeMm    = tier === 'lg' ? 18 : 12

  // ── Labels HTML ────────────────────────────────────────────────────────────

  const labelsHtml = Array.from({ length: nbContenants }, (_, i) => {
    const num = i + 1
    return `
<div class="label">
  <div class="row-top">
    <div class="brand">${data.orgName ?? '—'}</div>
    <span class="badge" style="background:${badgeBg}">${badgeText}</span>
    ${tier !== 'sm' ? `<div class="qr" id="qr-${num}"></div>` : ''}
  </div>
  <div class="lot-number">${data.lotNumber}</div>
  <div class="article-name">${data.articleName}</div>
  ${tier !== 'sm' ? `<div class="article-sku">${data.articleSku}</div>` : ''}
  ${tier !== 'sm' ? '<div class="sep"></div>' : ''}
  <div class="info-row">
    <span class="info-block">
      <span class="info-label">Qté</span>
      <span class="info-val">${qtyPerContenant}&nbsp;${data.unit}</span>
    </span>
    ${data.expiryDate ? `
    <span class="info-block ${dlcUrgent ? 'dlc-urgent' : ''}">
      <span class="info-label">DLC/DLUO</span>
      <span class="info-val">${fmtDate(data.expiryDate)}</span>
    </span>` : ''}
    <span class="info-block">
      <span class="info-label">N°</span>
      <span class="info-val">${num}/${nbContenants}</span>
    </span>
  </div>
  ${tier !== 'sm' ? `<div class="source-row">↳ ${data.sourceRef} · ${data.supplier ? data.supplier + ' · ' : ''}${fmtDate(data.sourceDate)}</div>` : ''}
  <svg class="barcode" id="bc-${num}"></svg>
</div>`
  }).join('\n')

  // ── JS inits ───────────────────────────────────────────────────────────────

  const qrInits = tier !== 'sm'
    ? Array.from({ length: nbContenants }, (_, i) => {
        const n = i + 1
        return `try{var q${n}=qrcode(0,'M');q${n}.addData('${data.lotNumber}');q${n}.make();document.getElementById('qr-${n}').innerHTML=q${n}.createSvgTag(${tier === 'lg' ? 2.2 : 1.6},0);}catch(e){}`
      }).join('\n')
    : ''

  const bcInits = Array.from({ length: nbContenants }, (_, i) => {
    const n = i + 1
    return `try{JsBarcode('#bc-${n}','${data.lotNumber}',{format:'CODE128',displayValue:${bcShowText},fontSize:${bcFontSize},height:${bcHeight},margin:0,textMargin:1,lineColor:'#111'});}catch(e){}`
  }).join('\n')

  // ── CSS ────────────────────────────────────────────────────────────────────

  const fs = {
    brand:   tier === 'sm' ? '6.5pt' : tier === 'lg' ? '13pt' : '10pt',
    badge:   tier === 'sm' ? '4.5pt' : '6pt',
    lot:     tier === 'sm' ? '8pt'   : tier === 'lg' ? '16pt' : '12pt',
    article: tier === 'sm' ? '5.5pt' : tier === 'lg' ? '11pt' : '8pt',
    sku:     tier === 'lg' ? '8pt'   : '7pt',
    infoLbl: tier === 'sm' ? '4.5pt' : '5.5pt',
    infoVal: tier === 'sm' ? '7pt'   : tier === 'lg' ? '10pt' : '8pt',
    source:  tier === 'lg' ? '7.5pt' : '6pt',
  }
  const pad = tier === 'sm' ? '1.5mm 2mm' : tier === 'lg' ? '4mm 5mm 3mm' : '3.5mm 4.5mm 3mm'
  const gap = tier === 'sm' ? '0.6mm' : '1.2mm'
  const bcH = tier === 'sm' ? '6mm' : tier === 'lg' ? '14mm' : '10mm'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Étiquettes ${fmt.code} — ${data.lotNumber}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
${tier !== 'sm' ? '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"><\/script>' : ''}
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,sans-serif;background:#f0f0f0;
  padding:${topMargin.toFixed(1)}mm ${sideMargin.toFixed(1)}mm 0;}

@page{size:A4;margin:0;}
@media print{
  body{background:white;padding:${topMargin.toFixed(1)}mm ${sideMargin.toFixed(1)}mm 0;}
  .no-print{display:none;}
}

.sheet{
  display:grid;
  grid-template-columns:repeat(${fmt.cols},${fmt.widthMm}mm);
  grid-auto-rows:${fmt.heightMm}mm;
}

.label{
  width:${fmt.widthMm}mm;
  height:${fmt.heightMm}mm;
  padding:${pad};
  border:1px dashed #ccc;
  display:flex;flex-direction:column;gap:${gap};
  background:white;overflow:hidden;
  break-inside:avoid;page-break-inside:avoid;
}

.row-top{display:flex;align-items:center;justify-content:space-between;gap:1.5mm;}
.brand{font-size:${fs.brand};font-weight:800;color:#111;flex:1;white-space:nowrap;overflow:hidden;}
.badge{font-size:${fs.badge};font-weight:700;text-transform:uppercase;letter-spacing:.4px;
  color:white;border-radius:2px;padding:1px 3px;flex-shrink:0;}
.qr{width:${qrSizeMm}mm;height:${qrSizeMm}mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.qr svg{width:${qrSizeMm}mm !important;height:${qrSizeMm}mm !important;}

.lot-number{font-family:'Courier New',monospace;font-size:${fs.lot};
  font-weight:800;color:#111;line-height:1;white-space:nowrap;overflow:hidden;}
.article-name{font-size:${fs.article};font-weight:600;color:#222;
  line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.article-sku{font-family:'Courier New',monospace;font-size:${fs.sku};color:#888;}
.sep{border-top:.5px solid #ddd;margin:.3mm 0;}

.info-row{display:flex;gap:2mm;}
.info-block{display:flex;flex-direction:column;gap:.3mm;flex:1;}
.info-label{font-size:${fs.infoLbl};text-transform:uppercase;letter-spacing:.4px;color:#999;font-weight:600;}
.info-val{font-family:'Courier New',monospace;font-size:${fs.infoVal};font-weight:700;color:#111;}
.dlc-urgent .info-val{color:#cc0000;}

.source-row{font-size:${fs.source};color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.barcode{display:block;width:100%;height:${bcH};margin-top:auto;}

.print-btn{display:block;margin:5mm auto;padding:2mm 8mm;
  background:#111;color:white;border:none;border-radius:3px;font-size:10pt;cursor:pointer;}
</style>
</head>
<body>
<div class="sheet">
${labelsHtml}
</div>
<button class="print-btn no-print" onclick="window.print()">
  🖨 Imprimer — ${fmt.code} · ${nbContenants} étiquette${nbContenants > 1 ? 's' : ''}
</button>
<script>
window.addEventListener('load',function(){
${qrInits}
${bcInits}
setTimeout(function(){window.print();},500);
});
<\/script>
</body>
</html>`
}
