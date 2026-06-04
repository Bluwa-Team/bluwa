'use client'

import { useState, useMemo } from 'react'
import {
  FileText, Plus, Search, X, ExternalLink,
  Archive, RotateCcw, AlertTriangle, Clock, CheckCircle2,
  Loader2, Link2,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type DocumentQualite, type TypeDocument, type StatutDocument,
  MOCK_DOCUMENTS_QUALITE, TYPE_DOC_LABELS, TYPE_DOC_COLORS,
  STATUT_DOC_COLORS, generateCode, revisionUrgente, revisionDepassee,
} from '../_components/ged-types'

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]
const TYPE_OPTIONS: TypeDocument[] = ['Procédure', 'Instruction', 'Formulaire', 'Enregistrement']

const EMPTY_FORM = {
  titre:        '',
  type:         'Procédure' as TypeDocument,
  description:  '',
  lienExterne:  '',
  dateRevision: '',
  version:      '1.0',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, bgClass, iconBg, iconColor }: {
  label: string; value: number
  icon: React.ElementType; bgClass: string; iconBg: string; iconColor: string
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
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function RevisionBadge({ dateRevision }: { dateRevision: string }) {
  const depassee = revisionDepassee(dateRevision)
  const urgente  = revisionUrgente(dateRevision)
  const diff     = Math.ceil((new Date(dateRevision).getTime() - Date.now()) / 86_400_000)

  if (depassee) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="size-2.5" /> Dépassée
    </span>
  )
  if (urgente) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <Clock className="size-2.5" /> {diff}j
    </span>
  )
  return <span className="text-xs text-muted-foreground font-mono">{dateRevision}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GEDQualitePage() {
  const [docs,   setDocs]         = useState<DocumentQualite[]>(MOCK_DOCUMENTS_QUALITE)
  const [search, setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeDocument | 'Tous'>('Tous')
  const [statutFilter, setStatutFilter] = useState<StatutDocument | 'Tous'>('Actif')
  const [createOpen, setCreateOpen] = useState(false)
  const [form,     setForm]       = useState(EMPTY_FORM)
  const [creating, setCreating]   = useState(false)

  const stats = useMemo(() => ({
    total:   docs.filter(d => d.statut === 'Actif').length,
    urgents: docs.filter(d => d.statut === 'Actif' && (revisionUrgente(d.dateRevision) || revisionDepassee(d.dateRevision))).length,
    archives:docs.filter(d => d.statut === 'Archivé').length,
  }), [docs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (typeFilter   !== 'Tous' && d.type   !== typeFilter)   return false
      if (statutFilter !== 'Tous' && d.statut !== statutFilter) return false
      if (q) return d.titre.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      return true
    })
  }, [docs, typeFilter, statutFilter, search])

  function handleArchive(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, statut: 'Archivé' as StatutDocument, updatedAt: TODAY } : d))
  }
  function handleRestore(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, statut: 'Actif' as StatutDocument, updatedAt: TODAY } : d))
  }

  async function handleCreate() {
    if (!form.titre.trim() || !form.lienExterne.trim()) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 500))
    const newDoc: DocumentQualite = {
      id:           `d${Date.now()}`,
      code:         generateCode(form.type, docs),
      titre:        form.titre.trim(),
      type:         form.type,
      statut:       'Actif',
      version:      form.version.trim() || '1.0',
      lienExterne:  form.lienExterne.trim(),
      description:  form.description.trim(),
      dateRevision: form.dateRevision || TODAY,
      createdAt:    TODAY,
      updatedAt:    TODAY,
    }
    setDocs(prev => [newDoc, ...prev])
    setCreating(false)
    setCreateOpen(false)
    setForm(EMPTY_FORM)
  }

  const isCreateValid = form.titre.trim().length > 0 && form.lienExterne.trim().length > 0

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <FileText className="size-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Documents Qualité</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Procédures, Instructions & Formulaires — liens vers Google Drive ou Dropbox
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="size-4" />
          Référencer un document
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-5 py-4">
        <Link2 className="size-4 text-violet-600 shrink-0 mt-0.5" />
        <div className="text-xs text-violet-800 space-y-0.5">
          <p className="font-semibold">Stockage externe — zéro duplication</p>
          <p className="text-violet-600">
            Les fichiers restent dans votre Google Drive ou Dropbox.
            Bluwa référence les liens et vous alerte sur les dates de révision.
            Cliquez sur <strong>Ouvrir</strong> pour accéder au document.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Documents actifs"    value={stats.total}    icon={CheckCircle2}  bgClass="bg-emerald-50" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard label="Révisions urgentes"  value={stats.urgents}  icon={AlertTriangle} bgClass="bg-amber-50"   iconBg="bg-amber-100"   iconColor="text-amber-600" />
        <StatCard label="Archivés"            value={stats.archives} icon={Archive}       bgClass="bg-slate-50"   iconBg="bg-slate-100"   iconColor="text-slate-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Titre, code, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5 flex-wrap">
          {(['Tous', ...TYPE_OPTIONS] as Array<TypeDocument | 'Tous'>).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${typeFilter === t ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'Tous' ? 'Tous types' : t}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {(['Tous', 'Actif', 'Archivé'] as Array<StatutDocument | 'Tous'>).map(s => (
            <button key={s} onClick={() => setStatutFilter(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${statutFilter === s ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card py-12 text-center">
            <FileText className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun document ne correspond aux filtres.</p>
          </div>
        ) : filtered.map(doc => {
          const urgent   = revisionUrgente(doc.dateRevision)
          const depassee = revisionDepassee(doc.dateRevision)
          return (
            <div key={doc.id} className={`rounded-xl border bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/10 transition-colors ${depassee ? 'border-red-200 bg-red-50/30' : urgent ? 'border-amber-200 bg-amber-50/30' : ''}`}>

              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="size-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_DOC_COLORS[doc.type]}`}>
                    {TYPE_DOC_LABELS[doc.type]}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{doc.code}</span>
                  <span className="text-xs text-muted-foreground">v{doc.version}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUT_DOC_COLORS[doc.statut]}`}>
                    {doc.statut}
                  </span>
                </div>
                <p className="font-semibold text-sm truncate">{doc.titre}</p>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                )}
              </div>

              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-[10px] text-muted-foreground mb-1">Prochaine révision</p>
                <RevisionBadge dateRevision={doc.dateRevision} />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={doc.lienExterne}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Ouvrir
                </a>
                {doc.statut === 'Actif' ? (
                  <button onClick={() => handleArchive(doc.id)} title="Archiver"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <Archive className="size-3.5" />
                  </button>
                ) : (
                  <button onClick={() => handleRestore(doc.id)} title="Restaurer"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal création */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v && !creating) { setCreateOpen(false); setForm(EMPTY_FORM) } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="w-[min(520px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Link2 className="size-[18px] text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Référencer un document</p>
                    <p className="text-xs text-muted-foreground">Ajoutez le lien vers votre document externe</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM) }} disabled={creating}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">

                <Field label="Type de document" required>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPE_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${form.type === t ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'}`}>
                        <FileText className="size-4 shrink-0" />
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Titre" required>
                  <Input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                    placeholder="ex : Procédure de contrôle réception MP" autoFocus />
                </Field>

                <Field label="Lien Google Drive / Dropbox / OneDrive" required>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input value={form.lienExterne} onChange={e => setForm(p => ({ ...p, lienExterne: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/..." className="pl-10" />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Version">
                    <Input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="ex : 1.0" />
                  </Field>
                  <Field label="Prochaine révision">
                    <Input type="date" value={form.dateRevision} onChange={e => setForm(p => ({ ...p, dateRevision: e.target.value }))} />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Objet et périmètre du document…" rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
                <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM) }} disabled={creating}>Annuler</Button>
                <Button onClick={handleCreate} disabled={!isCreateValid || creating} className="gap-1.5">
                  {creating
                    ? <><Loader2 className="size-4 animate-spin" />Enregistrement…</>
                    : <><Plus className="size-4" />Référencer</>}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
