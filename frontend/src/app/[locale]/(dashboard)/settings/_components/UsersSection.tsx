'use client'

import { useState, useTransition } from 'react'
import { UserPlus, KeyRound, ShieldCheck, UserX, UserCheck, ChevronDown } from 'lucide-react'
import {
  updateUserRole, toggleUserActive, inviteUser, sendPasswordReset,
  type OrgUser, type UserRole,
} from '@/lib/actions/users'

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'owner',    label: 'Propriétaire', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { value: 'admin',    label: 'Admin',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'         },
  { value: 'manager',  label: 'Manager',       color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'         },
  { value: 'operator', label: 'Opérateur',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'     },
  { value: 'viewer',   label: 'Lecteur',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'        },
]

const roleInfo = (r: UserRole) => ROLES.find(x => x.value === r) ?? ROLES[4]

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

// ── Composant ligne utilisateur ───────────────────────────────────────────────
function UserRow({
  user, currentUserId, canManage,
}: {
  user: OrgUser
  currentUserId: string
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [roleOpen, setRoleOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const isSelf = user.id === currentUserId
  const ri = roleInfo(user.role)

  function flash(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleRoleChange(role: UserRole) {
    setRoleOpen(false)
    startTransition(async () => {
      const res = await updateUserRole(user.id, role)
      if (res?.error) flash(res.error)
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const res = await toggleUserActive(user.id, !user.is_active)
      if (res?.error) flash(res.error)
    })
  }

  function handleResetPwd() {
    startTransition(async () => {
      const res = await sendPasswordReset(user.email)
      flash(res?.error ? res.error : 'Email de réinitialisation envoyé.')
    })
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
        {initials(user.full_name, user.email)}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.full_name ?? user.email}
          {isSelf && <span className="ml-1.5 text-[11px] text-muted-foreground">(vous)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {feedback && <p className="text-[11px] text-blue-500 mt-0.5">{feedback}</p>}
      </div>

      {/* Badge rôle + dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => canManage && !isSelf && setRoleOpen(!roleOpen)}
          disabled={!canManage || isSelf || pending}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ri.color} ${canManage && !isSelf ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        >
          {ri.label}
          {canManage && !isSelf && <ChevronDown className="size-3" />}
        </button>

        {roleOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
            <div className="absolute right-0 top-8 z-20 w-40 bg-card border rounded-xl shadow-lg overflow-hidden">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRoleChange(r.value)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${user.role === r.value ? 'font-semibold' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${r.color.split(' ')[0]}`} />
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {canManage && !isSelf && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleResetPwd}
            disabled={pending}
            title="Réinitialiser le mot de passe"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <KeyRound className="size-3.5" />
          </button>
          <button
            onClick={handleToggleActive}
            disabled={pending}
            title={user.is_active ? 'Désactiver' : 'Réactiver'}
            className={`p-1.5 rounded-lg transition-colors ${user.is_active ? 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
          >
            {user.is_active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulaire d'invitation ───────────────────────────────────────────────────
function InviteForm({ onDone }: { onDone: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<UserRole>('operator')
  const [pending, startTransition] = useTransition()
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await inviteUser(email, role)
      if (res?.error) { setError(res.error); return }
      setSuccess(true)
      setTimeout(onDone, 1500)
    })
  }

  if (success) return (
    <p className="text-sm text-emerald-600 py-2">✓ Invitation envoyée à {email}</p>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="collegue@entreprise.com"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Rôle</label>
        <select
          value={role} onChange={e => setRole(e.target.value as UserRole)}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 border rounded-lg py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={pending} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
          {pending ? 'Envoi…' : 'Inviter'}
        </button>
      </div>
    </form>
  )
}

// ── Section principale ────────────────────────────────────────────────────────
export function UsersSection({
  users, currentUserId, currentUserRole,
}: {
  users:           OrgUser[]
  currentUserId:   string
  currentUserRole: UserRole
}) {
  const [showInvite, setShowInvite] = useState(false)
  const canManage = ['owner', 'admin'].includes(currentUserRole)

  const active   = users.filter(u => u.is_active)
  const inactive = users.filter(u => !u.is_active)

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
            <ShieldCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="font-semibold text-sm">Utilisateurs</h2>
          <span className="text-xs text-muted-foreground">{active.length} actif{active.length > 1 ? 's' : ''}</span>
        </div>
        {canManage && !showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <UserPlus className="size-3.5" /> Inviter
          </button>
        )}
      </div>

      {/* Formulaire invitation */}
      {showInvite && <InviteForm onDone={() => setShowInvite(false)} />}

      {/* Liste actifs */}
      <div className="space-y-1 divide-y divide-border">
        {active.map(u => (
          <UserRow key={u.id} user={u} currentUserId={currentUserId} canManage={canManage} />
        ))}
      </div>

      {/* Liste inactifs */}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
            <ChevronDown className="size-3 group-open:rotate-180 transition-transform" />
            {inactive.length} utilisateur{inactive.length > 1 ? 's' : ''} désactivé{inactive.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1 divide-y divide-border">
            {inactive.map(u => (
              <UserRow key={u.id} user={u} currentUserId={currentUserId} canManage={canManage} />
            ))}
          </div>
        </details>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground italic">
          Seuls les propriétaires et admins peuvent gérer les utilisateurs.
        </p>
      )}
    </section>
  )
}
