'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Pencil, Plus, X, Check } from 'lucide-react'
import { Factory, UserSiteAccess } from '@/types/merchant'

const ROLES = ['owner', 'admin', 'manager', 'operator'] as const
type Role = typeof ROLES[number]

interface User {
  id: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

interface Props {
  initialUsers: User[]
  factories: Factory[]
  orgId: string
  siteAccess?: UserSiteAccess[]
}

function initAccess(users: User[], siteAccess: UserSiteAccess[]): Record<string, string[]> {
  const acc: Record<string, string[]> = {}
  for (const u of users) {
    acc[u.id] = siteAccess.filter((a) => a.user_id === u.id).map((a) => a.factory_id)
  }
  return acc
}

export function UsersPanel({ initialUsers, factories, orgId, siteAccess = [] }: Props) {
  const [users, setUsers]     = useState<User[]>(initialUsers)
  const [access, setAccess]   = useState<Record<string, string[]>>(() => initAccess(initialUsers, siteAccess))
  const [editing, setEditing] = useState<string | null>(null)   // userId en cours d'édition
  const [showAdd, setShowAdd] = useState(false)

  // État du formulaire d'édition inline
  const [editRole, setEditRole]   = useState<Role>('operator')
  const [editSites, setEditSites] = useState<string[]>([])

  // État du formulaire d'ajout
  const [newName,  setNewName]  = useState('')
  const [newRole,  setNewRole]  = useState<Role>('operator')
  const [newSites, setNewSites] = useState<string[]>([])

  const activeSites = factories.filter((f) => f.is_active)

  function startEdit(u: User) {
    setEditing(u.id)
    setEditRole(u.role as Role)
    setEditSites(access[u.id] ?? [])
  }

  function cancelEdit() { setEditing(null) }

  function saveEdit(userId: string) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: editRole } : u))
    setAccess((prev) => ({ ...prev, [userId]: editSites }))
    setEditing(null)
  }

  function toggleSite(siteId: string, current: string[], set: (v: string[]) => void) {
    set(current.includes(siteId) ? current.filter((s) => s !== siteId) : [...current, siteId])
  }

  function addUser() {
    if (!newName.trim()) return
    const id = `u-${Date.now()}`
    setUsers((prev) => [...prev, { id, full_name: newName.trim(), role: newRole, is_active: true, created_at: new Date().toISOString() }])
    setAccess((prev) => ({ ...prev, [id]: newSites }))
    setNewName('')
    setNewRole('operator')
    setNewSites([])
    setShowAdd(false)
  }

  function toggleActive(userId: string) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !u.is_active } : u))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Utilisateurs ({users.length})</h2>
        <button
          onClick={() => { setShowAdd(true); setEditing(null) }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div className="px-4 py-4 border-b border-gray-100 bg-blue-50 space-y-3">
          <p className="text-xs font-medium text-blue-700">Nouvel utilisateur</p>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom complet"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Rôle</p>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {activeSites.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Accès sites</p>
              <div className="flex flex-wrap gap-1.5">
                {activeSites.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleSite(f.id, newSites, setNewSites)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${
                      newSites.includes(f.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {f.code}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={addUser}
              disabled={!newName.trim()}
              className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
            >
              Ajouter l&apos;utilisateur
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Aucun utilisateur</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {users.map((u) => {
            const siteIds = access[u.id] ?? []
            const accessible = factories.filter((f) => siteIds.includes(f.id))
            const allActive = activeSites.every((f) => siteIds.includes(f.id)) && activeSites.length > 0
            const isEditing = editing === u.id

            return (
              <div key={u.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Ligne principale */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{u.full_name}</p>
                      {!isEditing && (
                        <span className="text-xs text-gray-400 capitalize">{u.role}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => toggleActive(u.id)}
                          className="text-xs transition-colors"
                          title={u.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                              <XCircle className="w-3.5 h-3.5" /> Inactif
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(u.id)}
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Enregistrer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode édition */}
                {isEditing ? (
                  <div className="mt-3 ml-9 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rôle</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map((r) => (
                          <button
                            key={r}
                            onClick={() => setEditRole(r)}
                            className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${
                              editRole === r
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    {activeSites.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Accès sites</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeSites.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => toggleSite(f.id, editSites, setEditSites)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${
                                editSites.includes(f.id)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              {f.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Affichage accès sites */
                  <div className="mt-1.5 ml-9 flex flex-wrap gap-1">
                    {allActive ? (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                        Tous les sites
                      </span>
                    ) : accessible.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Aucun accès site</span>
                    ) : (
                      accessible.map((f) => (
                        <span key={f.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                          {f.code}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
