const {
  Document, Packer, Paragraph, TextRun, ImageRun,
  HeadingLevel, AlignmentType, PageBreak, BorderStyle,
  Header, Footer, PageNumber, ShadingType,
  LevelFormat, TabStopType,
} = require('docx');
const fs = require('fs');
const path = require('path');

const SS   = '/Users/johnokoye/Documents/bluwa/docs/screenshots';
const PUB  = '/Users/johnokoye/Documents/bluwa/frontend/public';
const OUT  = '/Users/johnokoye/Documents/bluwa/docs/Bluwa_Guide_Demarrage.docx';

// ── Palette ──────────────────────────────────────────────────────────────────
const BLUE  = '1B4BFF';   // matches reference doc
const DGRAY = '555555';
const BLACK = '1A1A1A';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sp = (before, after) => ({ before, after });

function imgRun(filename, w, h) {
  const filepath = fs.existsSync(path.join(SS, filename))
    ? path.join(SS, filename)
    : path.join(PUB, filename);
  return new ImageRun({
    type: filename.endsWith('.png') ? 'png' : 'jpg',
    data: fs.readFileSync(filepath),
    transformation: { width: w, height: h },
    altText: { title: filename, description: filename, name: filename },
  });
}

// Aspect ratios by source
const RATIO_SHOT     = 892 / 1372;   // image-*.jpg (1372×892)
const RATIO_CAPTURE  = 1595 / 2940;  // signup.png / login.png (2940×1595)

const IMG_W = 570; // content width px (~5.9 inches at 96dpi)

function imgParagraph(filename) {
  const ratio = (filename === 'signup.png' || filename === 'login.png')
    ? RATIO_CAPTURE : RATIO_SHOT;
  const h = Math.round(IMG_W * ratio);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: sp(120, 60),
    children: [imgRun(filename, IMG_W, h)],
    border: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 2 },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 2 },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 2 },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 2 },
    },
  });
}

function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: sp(360, 120),
    children: [new TextRun({ text, bold: true, size: 36, color: BLACK, font: 'Arial' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 6 } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: sp(280, 80),
    children: [new TextRun({ text, bold: true, size: 26, color: BLUE, font: 'Arial' })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: sp(0, 120),
    children: [new TextRun({ text, size: 22, color: DGRAY, font: 'Arial', ...opts })],
  });
}

function note(text) {
  return new Paragraph({
    spacing: sp(80, 160),
    shading: { fill: 'EEF4FF', type: ShadingType.CLEAR },
    indent: { left: 280, right: 280 },
    children: [
      new TextRun({ text: 'ℹ️  ', size: 20, font: 'Arial' }),
      new TextRun({ text, size: 20, color: '1B4FD8', font: 'Arial', italics: true }),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: sp(60, 200),
    children: [new TextRun({ text, size: 18, color: '999999', italics: true, font: 'Arial' })],
  });
}

function step(num, total) {
  return new Paragraph({
    spacing: sp(320, 100),
    children: [
      new TextRun({ text: `Étape ${num} sur ${total}`, size: 18, color: BLUE, bold: true, font: 'Arial' }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: sp(0, 80),
    children: [new TextRun({ text, size: 22, color: DGRAY, font: 'Arial' })],
  });
}

// ── Logo data ─────────────────────────────────────────────────────────────────
const LOGO_ICON = fs.readFileSync(path.join(PUB, 'logo_icon.png'));
const LOGO_TEXT = fs.readFileSync(path.join(PUB, 'bluwa_text.png'));

// ── Document ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: DGRAY } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: BLACK },
        paragraph: { spacing: sp(360, 120), outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: sp(280, 80), outlineLevel: 1 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },

    // ── Header — logo + titre + n° de page (comme doc de référence) ───────────
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
            tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
            children: [
              new ImageRun({
                type: 'png',
                data: LOGO_ICON,
                transformation: { width: 20, height: 24 },
                altText: { title: 'Bluwa', description: 'Logo Bluwa', name: 'Logo' },
              }),
              new TextRun({ text: '  Bluwa ERP', bold: true, size: 18, color: BLUE, font: 'Arial' }),
              new TextRun({ text: '\t', size: 18, color: DGRAY, font: 'Arial' }),
              new TextRun({ text: 'Guide de démarrage', size: 17, color: DGRAY, font: 'Arial' }),
            ],
          }),
        ],
      }),
    },

    // ── Footer — www.bluwa.io + numéro de page ────────────────────────────────
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 4 } },
            tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
            children: [
              new TextRun({ text: 'www.bluwa.io', size: 17, color: DGRAY, font: 'Arial' }),
              new TextRun({ text: '  —  john@bluwa.io', size: 17, color: '999999', font: 'Arial' }),
              new TextRun({ text: '\tPage ', size: 17, color: DGRAY, font: 'Arial' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 17, color: DGRAY, font: 'Arial' }),
              new TextRun({ text: ' / ', size: 17, color: DGRAY, font: 'Arial' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: DGRAY, font: 'Arial' }),
            ],
          }),
        ],
      }),
    },

    children: [

      // ── COUVERTURE ──────────────────────────────────────────────────────────
      new Paragraph({ spacing: sp(2000, 0), children: [] }),

      // Logo Bluwa centré
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(0, 320),
        children: [
          new ImageRun({
            type: 'png',
            data: LOGO_TEXT,
            transformation: { width: 180, height: 48 },
            altText: { title: 'Bluwa ERP', description: 'Logo Bluwa ERP', name: 'Bluwa' },
          }),
        ],
      }),

      // Trait bleu
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(0, 240),
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 0 } },
        children: [],
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(200, 80),
        children: [new TextRun({ text: 'Guide de démarrage', size: 52, bold: true, color: BLACK, font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(0, 600),
        children: [new TextRun({ text: 'Flux d’arrivée d’un client', size: 28, color: DGRAY, italics: true, font: 'Arial' })],
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(0, 60),
        children: [new TextRun({ text: 'Version 1.0', size: 20, color: '999999', font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: sp(0, 0),
        children: [new TextRun({ text: 'Juin 2026', size: 20, color: '999999', font: 'Arial' })],
      }),

      pageBreak(),

      // ── INTRODUCTION ────────────────────────────────────────────────────────
      h1('Introduction'),
      body('Ce guide accompagne vos équipes lors de la première connexion à Bluwa ERP. Il couvre l’intégralité du flux d’arrivée, de la création de compte jusqu’au tableau de bord.'),
      body('Durée estimée : 5 à 10 minutes.'),
      new Paragraph({ spacing: sp(160, 80), children: [new TextRun({ text: 'Prérequis', bold: true, size: 22, color: BLACK, font: 'Arial' })] }),
      bullet('Un ordinateur avec un navigateur moderne (Chrome, Safari, Firefox…)'),
      bullet('Une adresse email valide ou un compte Google'),
      bullet('Les informations de votre usine (nom, ville, pays)'),
      new Paragraph({ spacing: sp(0, 80), children: [] }),
      note('Ce document est mis à jour après chaque évolution de l’application. Version actuelle disponible auprès de votre interlocuteur Bluwa.'),

      pageBreak(),

      // ── ÉTAPE 1 — INSCRIPTION ──────────────────────────────────────────────
      step(1, 5),
      h1('Créer un compte'),
      body('Rendez-vous sur « app.bluwa.com » dans votre navigateur. Vous arrivez sur la page de création de compte.'),
      h2('Option A — Via Google (recommandé)'),
      bullet('Cliquez sur « Continuer avec Google »'),
      bullet('Sélectionnez votre compte Google professionnel'),
      bullet('Autorisez l’accès si demandé'),
      h2('Option B — Via email'),
      bullet('Saisissez votre nom complet'),
      bullet('Entrez votre adresse email professionnelle'),
      bullet('Choisissez un mot de passe d’au moins 8 caractères'),
      bullet('Cliquez sur « Créer mon compte »'),
      new Paragraph({ spacing: sp(160, 60), children: [] }),
      imgParagraph('signup.png'),
      caption('Fig. 1 — Page de création de compte'),
      note('Si vous avez déjà un compte, cliquez sur « Se connecter » en bas de la page.'),

      pageBreak(),

      // ── ÉTAPE 2 — CONNEXION ────────────────────────────────────────────────
      step(2, 5),
      h1('Se connecter'),
      body('Si vous possédez déjà un compte, allez directement sur la page de connexion.'),
      bullet('Entrez votre adresse email et votre mot de passe'),
      bullet('Ou cliquez sur « Continuer avec Google »'),
      bullet('Cliquez sur « Se connecter »'),
      new Paragraph({ spacing: sp(160, 60), children: [] }),
      imgParagraph('login.png'),
      caption('Fig. 2 — Page de connexion'),
      note('En cas d’oubli de mot de passe, contactez votre administrateur Bluwa.'),

      pageBreak(),

      // ── ÉTAPE 3 — ONBOARDING ORG ────────────────────────────────────────────
      step(3, 5),
      h1('Configurer votre organisation'),
      body('Après la première connexion, vous arrivez automatiquement sur l’assistant de configuration en 2 étapes.'),
      body('L’étape 1 concerne votre organisation (le groupe ou l’entreprise mère).'),
      new Paragraph({ spacing: sp(120, 80), children: [new TextRun({ text: 'Comment remplir ce champ :', bold: true, size: 22, color: BLACK, font: 'Arial' })] }),
      bullet('Saisissez le nom officiel de votre entreprise ou groupe'),
      bullet('Exemple : « Chom Factory », « Africube »'),
      bullet('Ce nom apparaîtra sur vos documents et rapports'),
      bullet('Cliquez sur « Continuer »'),
      new Paragraph({ spacing: sp(160, 60), children: [] }),
      imgParagraph('image-1780755826039.jpg'),
      caption('Fig. 3 — Étape 1 : Nom de l’organisation'),

      pageBreak(),

      // ── ÉTAPE 4 — ONBOARDING USINE ──────────────────────────────────────────
      step(4, 5),
      h1('Configurer votre première usine'),
      body('L’étape 2 configure votre site de production principal. Vous pourrez en ajouter d’autres depuis les paramètres.'),
      new Paragraph({ spacing: sp(120, 80), children: [new TextRun({ text: 'Champs à remplir :', bold: true, size: 22, color: BLACK, font: 'Arial' })] }),
      bullet('Nom de l’usine : le nom du site de production (ex : « Usine Lomé »)'),
      bullet('Pays : sélectionnez votre pays dans la liste déroulante'),
      bullet('Ville (optionnel) : la ville où se trouve l’usine'),
      bullet('Cliquez sur « Créer mon espace »'),
      new Paragraph({ spacing: sp(160, 60), children: [] }),
      imgParagraph('image-1780755880122.jpg'),
      caption('Fig. 4 — Étape 2 : Usine, Pays et Ville'),
      note('La page peut prendre quelques secondes. Si elle reste bloquée sur « Création… », actualisez la page (F5) — votre espace a été créé.'),

      pageBreak(),

      // ── ÉTAPE 5 — DASHBOARD ────────────────────────────────────────────────
      step(5, 5),
      h1('Tableau de bord'),
      body('Vous arrivez sur le tableau de bord Bluwa ERP. C’est votre point d’entrée principal à chaque connexion.'),
      h2('Ce que vous voyez'),
      bullet('Indicateurs clés : lots actifs, valeur du stock, taux de rendement, non-conformités'),
      bullet('Alertes prioritaires (ruptures, DLC, réceptions en attente)'),
      h2('Navigation'),
      body('La barre latérale gauche donne accès à tous les modules :'),
      bullet('Données de référence : Articles, Clients, Fournisseurs'),
      bullet('Ventes & Logistique : Commandes, Facturation, Bons de livraison'),
      bullet('Production : Ordres de fabrication, Lots, Qualité'),
      bullet('Achats & Stocks : Approvisionnement, Réception, Stocks'),
      new Paragraph({ spacing: sp(160, 60), children: [] }),
      imgParagraph('image-1780755895995.jpg'),
      caption('Fig. 5 — Tableau de bord'),
      note('Les données affichées au premier lancement sont des exemples. Elles seront remplacées par vos propres données au fur et à mesure de l’utilisation.'),

      pageBreak(),

      // ── PROCHAINES ÉTAPES ───────────────────────────────────────────────────
      h1('Prochaines étapes'),
      body('Maintenant que votre espace est créé, voici les actions recommandées dans l’ordre :'),
      new Paragraph({ spacing: sp(160, 80), children: [] }),
      bullet('Paramétrer vos articles et unités de mesure (menu « Articles »)'),
      bullet('Ajouter vos fournisseurs (menu « Fournisseurs »)'),
      bullet('Enregistrer votre première réception de matières premières'),
      bullet('Lancer votre premier ordre de fabrication'),
      new Paragraph({ spacing: sp(280, 0), children: [] }),
      note('Pour toute question, contactez votre interlocuteur Bluwa. Un guide détaillé par module sera disponible prochainement.'),

      // Colophon final
      new Paragraph({ spacing: sp(600, 0), children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 8 } },
        spacing: sp(120, 0),
        children: [new TextRun({ text: 'bluwa.vercel.app  ·  Version 1.0  ·  Juin 2026', size: 18, color: '999999', font: 'Arial' })],
      }),
    ],
  }],
});

// ── Génération + correction ordre des bordures ─────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUT, buffer);

  const AdmZip = require('adm-zip');
  const zip = new AdmZip(OUT);
  const entry = zip.getEntry('word/document.xml');
  let xml = entry.getData().toString('utf8');
  // OOXML schema requires w:pBdr children in order: top, left, bottom, right
  const ORDER = ['top', 'left', 'bottom', 'right', 'between', 'bar'];
  xml = xml.replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/g, (block) => {
    const parts = {};
    for (const b of ORDER) {
      const m = block.match(new RegExp(`<w:${b}\\b[^>]*/>`));
      if (m) parts[b] = m[0];
    }
    return '<w:pBdr>' + ORDER.filter(b => parts[b]).map(b => parts[b]).join('') + '</w:pBdr>';
  });
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
  zip.writeZip(OUT);
  console.log('Generated:', OUT);
}).catch(err => { console.error(err); process.exit(1); });
