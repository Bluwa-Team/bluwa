'use client'

import { useState, useMemo } from 'react'
import {
  FileText, Plus, Search, X, Check, AlertTriangle,
  Clock, Archive, BookOpen, CheckCircle2, Loader2,
  ChevronRight, User, RotateCcw, FilePen, ShieldCheck,
  PenLine, Send, ThumbsDown,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DragDrop } from '../_components/drag-drop'
import {
  type DocumentQualite, type StatutDocument, type TypeDocument,
  MOCK_DOCUMENTS_QUALITE, EQUIPE_QUALITE,
  STATUT_DOC_LABELS, STATUT_DOC_COLORS, TYPE_DOC_COLORS,
  nextMajorVersion, generateCode,
} from '../_components/ged-types'

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = '2026-05-26'

const STATUT_FILTER_OPTIONS: Array<StatutDocument | 'Tous'> = [
  'Tous', 'Brouillon', 'EnVerification', 'EnApprobation', 'Publie', 'Archive',
]

const TYPE_OPTIONS: TypeDocument[] = ['Procédure', 'Instruction', 'Formulaire']

const EMPTY_CREATE = {
  titre: '',
  type: 'Procédure' as TypeDocument,
  description: '',
  verificateur: 'Régis Mbaye',
  approbateur: 'Serge Koné',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, bgClass, iconBg, iconColor }: {
  label: string
  value: number
  icon: React.ElementType
  bgClass: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${bgClass}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function BadgeStatut({ statut }: { statut: StatutDocument }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_DOC_COLORS[statut]}`}>
      {STATUT_DOC_LABELS[statut]}
    </span>
  )
}

function BadgeType({ type }: { type: TypeDocument }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_DOC_COLORS[type]}`}>
      {type}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GEDQualitePage() {
  const [docs, setDocs] = useState<DocumentQualite[]>(MOCK_DOCUMENTS_QUALITE)
  const [currentUser, setCurrentUser] = useState('Serge Koné')
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutDocument | 'Tous'>('Tous')
  const [typeFilter, setTypeFilter] = useState<TypeDocument | 'Tous'>('Tous')

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)

  // Action loading
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // ── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:          docs.length,
    publies:        docs.filter((d) => d.statut === 'Publie').length,
    enRevision:     docs.filter((d) => d.statut === 'EnVerification' || d.statut === 'EnApprobation').length,
    brouillons:     docs.filter((d) => d.statut === 'Brouillon').length,
  }), [docs])

  /** Documents nécessitant une action de l'utilisateur courant */
  const mesActions = useMemo(() => {
    const actions: Array<{ doc: DocumentQualite; role: 'verificateur' | 'approbateur' | 'redacteur' }> = []
    docs.forEach((doc) => {
      if (doc.statut === 'EnVerification' && doc.verificateur === currentUser)
        actions.push({ doc, role: 'verificateur' })
      else if (doc.statut === 'EnApprobation' && doc.approbateur === currentUser)
        actions.push({ doc, role: 'approbateur' })
      else if (doc.statut === 'Brouillon' && doc.redacteur === currentUser)
        actions.push({ doc, role: 'redacteur' })
    })
    return actions
  }, [docs, currentUser])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter((d) => {
      if (statutFilter !== 'Tous' && d.statut !== statutFilter) return false
      if (typeFilter !== 'Tous' && d.type !== typeFilter) return false
      if (q) return (
        d.titre.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.redacteur.toLowerCase().includes(q)
      )
      return true
    })
  }, [docs, statutFilter, typeFilter, search])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function patchDoc(id: string, patch: Partial<DocumentQualite>) {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...patch, dateModification: TODAY } : d))
  }

  async function runAction(id: string, fn: () => void) {
    setLoadingAction(id)
    await new Promise((r) => setTimeout(r, 600))
    fn()
    setLoadingAction(null)
  }

  function handleSoumettre(doc: DocumentQualite) {
    runAction(doc.id, () => patchDoc(doc.id, { statut: 'EnVerification' }))
  }

  function handleValiderTechnique(doc: DocumentQualite) {
    runAction(doc.id, () => patchDoc(doc.id, { statut: 'EnApprobation' }))
  }

  function handleDemanderCorrection(doc: DocumentQualite) {
    runAction(doc.id, () => patchDoc(doc.id, { statut: 'Brouillon' }))
  }

  function handleApprouver(doc: DocumentQualite) {
    runAction(doc.id, () =>
      patchDoc(doc.id, {
        statut: 'Publie',
        version: nextMajorVersion(doc.version),
      }),
    )
  }

  function handleArchiver(doc: DocumentQualite) {
    runAction(doc.id, () => patchDoc(doc.id, { statut: 'Archive' }))
  }

  async function handleCreate() {
    if (!createForm.titre.trim()) return
    setCreating(true)
    await new Promise((r) => setTimeout(r, 700))
    const newDoc: DocumentQualite = {
      id: `d${Date.now()}`,
      code: generateCode(createForm.type, docs),
      titre: createForm.titre.trim(),
      type: createForm.type,
      version: '0.1',
      statut: 'Brouillon',
      redacteur: currentUser,
      verificateur: createForm.verificateur,
      approbateur: createForm.approbateur,
      description: createForm.description.trim(),
      dateCreation: TODAY,
      dateModification: TODAY,
    }
    setDocs((prev) => [newDoc, ...prev])
    setCreating(false)
    setCreateOpen(false)
    setCreateForm(EMPTY_CREATE)
    setCreateFile(null)
  }

  const isCreateValid = createForm.titre.trim().length > 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <FileText className="size-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">GED Qualité</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestion Électronique des Documents · Procédures, Instructions & Formulaires
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="size-4" />
          Rédiger un document
        </Button>
      </div>

      {/* ── Simulateur de rôle ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-4 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <User className="size-4 text-violet-500" />
          <span className="text-xs font-semibold text-violet-700">Vue en tant que :</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPE_QUALITE.map((m) => (
            <button
              key={m.nom}
              onClick={() => setCurrentUser(m.nom)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                currentUser === m.nom
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-card border text-muted-foreground hover:text-foreground hover:border-violet-300'
              }`}
            >
              {m.nom}
              <span className={`text-[10px] font-normal ${currentUser === m.nom ? 'text-violet-200' : 'text-muted-foreground'}`}>
                · {m.role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total documents"   value={stats.total}      icon={FileText}     bgClass="bg-slate-50"   iconBg="bg-slate-100"   iconColor="text-slate-600" />
        <StatCard label="Publiés"           value={stats.publies}    icon={CheckCircle2} bgClass="bg-emerald-50" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard label="En révision"       value={stats.enRevision} icon={Clock}        bgClass="bg-amber-50"   iconBg="bg-amber-100"   iconColor="text-amber-600" />
        <StatCard label="Brouillons"        value={stats.brouillons} icon={FilePen}      bgClass="bg-blue-50"    iconBg="bg-blue-100"    iconColor="text-blue-600" />
      </div>

      {/* ── Mes Actions ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Mes actions en attente</p>
          {mesActions.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-orange-500 text-white">
              {mesActions.length}
            </span>
          )}
        </div>

        {mesActions.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
            <Check className="size-4 text-emerald-500 shrink-0" />
            Rien à faire · tout est à jour pour <strong className="text-foreground ml-1">{currentUser}</strong>
          </div>
        ) : (
          <div className="divide-y">
            {mesActions.map(({ doc, role }) => (
              <div key={doc.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">

                {/* Infos doc */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    role === 'approbateur' ? 'bg-amber-100' : role === 'verificateur' ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    {role === 'approbateur'
                      ? <ShieldCheck className="size-4 text-amber-600" />
                      : role === 'verificateur'
                      ? <BookOpen className="size-4 text-blue-600" />
                      : <PenLine className="size-4 text-slate-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{doc.titre}</p>
                      <BadgeType type={doc.type} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{doc.code}</span>
                      <ChevronRight className="size-3 text-muted-foreground" />
                      <BadgeStatut statut={doc.statut} />
                      <span className="text-xs text-muted-foreground">· v{doc.version}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {role === 'approbateur'   && `Vérifié par ${doc.verificateur} · En attente de votre approbation`}
                      {role === 'verificateur'  && `Rédigé par ${doc.redacteur} · En attente de votre validation technique`}
                      {role === 'redacteur'     && `Brouillon · Soumettre à ${doc.verificateur} pour vérification`}
                    </p>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center gap-2 shrink-0">
                  {role === 'redacteur' && (
                    <Button
                      size="sm"
                      onClick={() => handleSoumettre(doc)}
                      disabled={loadingAction === doc.id}
                      className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loadingAction === doc.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Send className="size-3.5" />
                      }
                      Soumettre à vérification
                    </Button>
                  )}

                  {role === 'verificateur' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDemanderCorrection(doc)}
                        disabled={loadingAction === doc.id}
                        className="gap-1.5 h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        {loadingAction === doc.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <ThumbsDown className="size-3.5" />
                        }
                        Demander correction
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleValiderTechnique(doc)}
                        disabled={loadingAction === doc.id}
                        className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loadingAction === doc.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <CheckCircle2 className="size-3.5" />
                        }
                        Valider la technique
                      </Button>
                    </>
                  )}

                  {role === 'approbateur' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprouver(doc)}
                      disabled={loadingAction === doc.id}
                      className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loadingAction === doc.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <ShieldCheck className="size-3.5" />
                      }
                      Approuver &amp; Signer → v{nextMajorVersion(doc.version)}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Titre, code, rédacteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Statut filter */}
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5 flex-wrap">
          {STATUT_FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statutFilter === s
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'Tous' ? 'Tous statuts' : STATUT_DOC_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {(['Tous', ...TYPE_OPTIONS] as Array<TypeDocument | 'Tous'>).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'Tous' ? 'Tous types' : t}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tableau des documents ─────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Document</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Type</th>
              <th className="text-center px-4 py-3 text-xs font-semibold tracking-wide">Version</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Vérificateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Approbateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Modifié le</th>
              <th className="text-right px-4 py-3 text-xs font-semibold tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <FileText className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun document ne correspond aux filtres.</p>
                </td>
              </tr>
            ) : filtered.map((doc) => (
              <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">

                {/* Titre + Code */}
                <td className="px-4 py-3 max-w-[280px]">
                  <p className="font-medium text-sm truncate" title={doc.titre}>{doc.titre}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{doc.code}</p>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <BadgeType type={doc.type} />
                </td>

                {/* Version */}
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-xs font-semibold">v{doc.version}</span>
                </td>

                {/* Statut */}
                <td className="px-4 py-3">
                  <BadgeStatut statut={doc.statut} />
                </td>

                {/* Vérificateur */}
                <td className="px-4 py-3 text-sm text-muted-foreground">{doc.verificateur}</td>

                {/* Approbateur */}
                <td className="px-4 py-3 text-sm text-muted-foreground">{doc.approbateur}</td>

                {/* Date */}
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{doc.dateModification}</td>

                {/* Actions inline */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Rédacteur → Soumettre */}
                    {doc.statut === 'Brouillon' && doc.redacteur === currentUser && (
                      <button
                        onClick={() => handleSoumettre(doc)}
                        disabled={loadingAction === doc.id}
                        title="Soumettre à vérification"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-60"
                      >
                        {loadingAction === doc.id
                          ? <Loader2 className="size-3 animate-spin" />
                          : <Send className="size-3" />
                        }
                        Soumettre
                      </button>
                    )}

                    {/* Vérificateur → actions */}
                    {doc.statut === 'EnVerification' && doc.verificateur === currentUser && (
                      <>
                        <button
                          onClick={() => handleDemanderCorrection(doc)}
                          disabled={loadingAction === doc.id}
                          title="Demander correction"
                          className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-60"
                        >
                          {loadingAction === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                        </button>
                        <button
                          onClick={() => handleValiderTechnique(doc)}
                          disabled={loadingAction === doc.id}
                          title="Valider la technique"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-60"
                        >
                          {loadingAction === doc.id
                            ? <Loader2 className="size-3 animate-spin" />
                            : <CheckCircle2 className="size-3" />
                          }
                          Valider
                        </button>
                      </>
                    )}

                    {/* Approbateur → Approuver */}
                    {doc.statut === 'EnApprobation' && doc.approbateur === currentUser && (
                      <button
                        onClick={() => handleApprouver(doc)}
                        disabled={loadingAction === doc.id}
                        title={`Approuver & Signer → v${nextMajorVersion(doc.version)}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                      >
                        {loadingAction === doc.id
                          ? <Loader2 className="size-3 animate-spin" />
                          : <ShieldCheck className="size-3" />
                        }
                        Approuver
                      </button>
                    )}

                    {/* Archiver (publié uniquement) */}
                    {doc.statut === 'Publie' && (
                      <button
                        onClick={() => handleArchiver(doc)}
                        disabled={loadingAction === doc.id}
                        title="Archiver ce document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
                      >
                        {loadingAction === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                      </button>
                    )}

                    {/* Archivé ou aucune action */}
                    {(doc.statut === 'Archive' ||
                      (doc.statut === 'Brouillon' && doc.redacteur !== currentUser) ||
                      (doc.statut === 'EnVerification' && doc.verificateur !== currentUser) ||
                      (doc.statut === 'EnApprobation' && doc.approbateur !== currentUser)
                    ) && (
                      <span className="text-xs text-muted-foreground italic px-1">
                        {doc.statut === 'Archive' ? 'Archivé' : '—'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal : Créer un document ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v && !creating) { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setCreateFile(null) } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="w-[min(620px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <FilePen className="size-[18px] text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Rédiger un nouveau document</p>
                    <p className="text-xs text-muted-foreground">Démarre le cycle de validation du document qualité</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setCreateFile(null) }}
                  disabled={creating}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">

                {/* Type */}
                <Field label="Type de document" required>
                  <div className="grid grid-cols-3 gap-2.5">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setCreateForm((p) => ({ ...p, type: t }))}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-xs font-semibold transition-colors ${
                          createForm.type === t
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                        }`}
                      >
                        <FileText className={`size-4 ${createForm.type === t ? 'text-violet-600' : ''}`} />
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Titre */}
                <Field label="Titre du document" required>
                  <Input
                    value={createForm.titre}
                    onChange={(e) => setCreateForm((p) => ({ ...p, titre: e.target.value }))}
                    placeholder={`ex : ${createForm.type} de contrôle des étiquettes`}
                    autoFocus
                  />
                </Field>

                {/* Description */}
                <Field label="Description / Objet">
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brève description de l'objet et du périmètre du document…"
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </Field>

                {/* Vérificateur + Approbateur */}
                <div className="grid grid-cols-2 gap-x-4">
                  <Field label="Expert Technique (Vérificateur)" required>
                    <select
                      value={createForm.verificateur}
                      onChange={(e) => setCreateForm((p) => ({ ...p, verificateur: e.target.value }))}
                      className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {EQUIPE_QUALITE.map((m) => (
                        <option key={m.nom} value={m.nom}>{m.nom} — {m.role}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Approbateur (Signataire)" required>
                    <select
                      value={createForm.approbateur}
                      onChange={(e) => setCreateForm((p) => ({ ...p, approbateur: e.target.value }))}
                      className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {EQUIPE_QUALITE.map((m) => (
                        <option key={m.nom} value={m.nom}>{m.nom} — {m.role}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Fichier */}
                <Field label="Fichier initial (facultatif)">
                  <DragDrop
                    label="Glisser le document Word / PDF ici"
                    file={createFile}
                    onFile={setCreateFile}
                  />
                </Field>

                {/* Info workflow */}
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    Le document est créé en <strong className="text-foreground">Brouillon · v0.1</strong>.
                    Le cycle de validation suit : <span className="text-foreground font-medium">Brouillon → En vérification → En approbation → Publié</span>.
                    La version est incrémentée à <strong className="text-foreground">v1.0</strong> lors de la première approbation.
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
                <Button
                  variant="outline"
                  onClick={() => { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setCreateFile(null) }}
                  disabled={creating}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!isCreateValid || creating}
                  className="gap-1.5"
                >
                  {creating
                    ? <><Loader2 className="size-4 animate-spin" />Création…</>
                    : <><FilePen className="size-4" />Créer en brouillon</>
                  }
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
