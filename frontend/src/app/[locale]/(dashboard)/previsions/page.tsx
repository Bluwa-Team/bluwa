'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus,
  Calendar,
  Layers,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface ArticlePrevision {
  article_id:      string
  article_code:    string
  article_name:    string
  article_type:    string
  organization_id: string
  factory_id:      string | null
  week_code:       string | null
  quantity:        number
}

interface Factory {
  id:   string
  name: string
}

function generateNextWeeks(): string[] {
  const weeks: string[] = []
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const pastDays = (now.getTime() - startOfYear.getTime()) / 86_400_000
  const currentWeek = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)
  for (let i = 0; i < 6; i++) {
    const w = currentWeek + i
    weeks.push(`${year}-W${w < 10 ? '0' + w : w}`)
  }
  return weeks
}

export default function PrevisionsPage() {
  const supabase = createClient()

  const [loading,           setLoading]           = useState(true)
  const [saving,            setSaving]            = useState<string | null>(null)
  const [factories,         setFactories]         = useState<Factory[]>([])
  const [selectedFactoryId, setSelectedFactoryId] = useState('')
  const [currentOrgId,      setCurrentOrgId]      = useState('')
  const [currentUserId,     setCurrentUserId]     = useState('')
  const [articles,          setArticles]          = useState<any[]>([])
  const [gridData,          setGridData]          = useState<Record<string, number>>({})
  const [weeks,             setWeeks]             = useState<string[]>([])

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        const generatedWeeks = generateNextWeeks()
        setWeeks(generatedWeeks)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        if (!profile) return
        const orgId = profile.organization_id
        setCurrentOrgId(orgId)

        const { data: factoriesData } = await supabase
          .from('factories')
          .select('id, name')
          .eq('organization_id', orgId)

        if (factoriesData?.length) {
          setFactories(factoriesData)
          setSelectedFactoryId(factoriesData[0].id)
          await loadGrid(orgId, factoriesData[0].id)
        }
      } catch (err) {
        console.error('Erreur initialisation prévisions :', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function loadGrid(orgId: string, factoryId: string) {
    const [articlesRes, gridRes] = await Promise.all([
      supabase
        .from('articles')
        .select('id, code, designation, type')
        .eq('organization_id', orgId)
        .in('type', ['PF', 'PSF'])
        .eq('statut', 'Actif')
        .order('code'),
      supabase
        .from('view_previsions_onboarding')
        .select('article_id, factory_id, week_code, quantity')
        .eq('organization_id', orgId),
    ])

    if (gridRes.error) console.error(gridRes.error)

    setArticles(articlesRes.data ?? [])

    const grid: Record<string, number> = {}
    gridRes.data?.forEach((row: ArticlePrevision) => {
      if (row.factory_id === factoryId && row.week_code) {
        grid[`${row.article_id}_${row.week_code}`] = Number(row.quantity)
      }
    })
    setGridData(grid)
  }

  async function handleFactoryChange(factoryId: string) {
    setSelectedFactoryId(factoryId)
    setLoading(true)
    await loadGrid(currentOrgId, factoryId)
    setLoading(false)
  }

  function handleCellChange(articleId: string, weekCode: string, value: string) {
    setGridData(prev => ({
      ...prev,
      [`${articleId}_${weekCode}`]: value === '' ? 0 : parseFloat(value),
    }))
  }

  async function handleSaveCell(articleId: string, weekCode: string) {
    const qty     = gridData[`${articleId}_${weekCode}`] ?? 0
    const cellKey = `${articleId}_${weekCode}`
    setSaving(cellKey)

    const { error } = await supabase
      .from('sales_forecasts')
      .upsert(
        {
          organization_id:     currentOrgId,
          factory_id:          selectedFactoryId,
          article_id:          articleId,
          week_code:           weekCode,
          quantity_forecasted: qty,
          updated_by:          currentUserId,
          updated_at:          new Date().toISOString(),
        },
        { onConflict: 'factory_id,article_id,week_code' },
      )

    if (error) console.error('Erreur sauvegarde prévision :', error)
    setTimeout(() => setSaving(null), 400)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Chargement des paramètres de planification…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Prévisions de la demande</h1>
          <p className="text-sm text-slate-500 mt-1">
            Saisissez les quantités prévisionnelles par produit et par semaine.
            Ces données alimentent le Supply Planning et le MRP.
          </p>
        </div>

        {factories.length > 0 && (
          <div className="flex items-center gap-2 bg-white border shadow-sm rounded-lg p-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedFactoryId}
              onChange={e => handleFactoryChange(e.target.value)}
              className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
            >
              {factories.map(f => (
                <option key={f.id} value={f.id}>Site : {f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* BANDEAU D'AIDE */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
        <p>
          <span className="font-semibold text-slate-800">Saisie simplifiée :</span>{' '}
          Modifiez une quantité et appuyez sur{' '}
          <kbd className="bg-white border px-1.5 py-0.5 rounded shadow-sm text-[10px] font-mono font-bold">Entrée</kbd>{' '}
          ou changez de case pour enregistrer automatiquement. Les cellules vides équivalent à 0.
        </p>
      </div>

      {articles.length === 0 ? (

        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl bg-white p-16 text-center shadow-sm">
          <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 mb-4">
            <Layers className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Aucun produit fini ou semi-fini actif</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
            Votre catalogue ne contient aucun article configuré avec le type{' '}
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-700">PF</span> ou{' '}
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-700">PSF</span>.
          </p>
          <button
            onClick={() => (window.location.href = '/fr/articles')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Créer un article (PF/PSF)
          </button>
        </div>

      ) : (

        /* GRILLE */
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[120px]">Code</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[220px]">Désignation</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-24 text-center">Type</th>
                  {weeks.map(w => (
                    <th key={w} className="p-4 text-xs font-bold uppercase tracking-wider text-slate-600 text-center border-l border-slate-100 bg-blue-50/30">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-3 w-3 text-blue-500" />
                        {w}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {articles.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-sm font-mono font-semibold text-slate-700">{product.code}</td>
                    <td className="p-4 text-sm font-medium text-slate-900">{product.designation}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                        product.type === 'PF'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {product.type}
                      </span>
                    </td>
                    {weeks.map(w => {
                      const cellKey     = `${product.id}_${w}`
                      const value       = gridData[cellKey] !== undefined ? gridData[cellKey] : ''
                      const isSaving    = saving === cellKey
                      return (
                        <td key={w} className="p-2 border-l border-slate-100 text-center min-w-[120px]">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              value={value}
                              placeholder="0"
                              min="0"
                              onChange={e => handleCellChange(product.id, w, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCell(product.id, w) }}
                              onBlur={() => handleSaveCell(product.id, w)}
                              className={`w-full text-center font-semibold text-sm bg-slate-50/50 hover:bg-white focus:bg-white border rounded-md py-2 px-3 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 ${
                                value && Number(value) > 0 ? 'text-blue-700 font-bold bg-blue-50/10' : ''
                              }`}
                            />
                            {isSaving && (
                              <div className="absolute right-2 text-green-500 animate-pulse">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="bg-slate-50 border-t p-4 flex justify-between items-center text-xs text-slate-500">
            <div>
              Total : <span className="font-semibold text-slate-700">{articles.length}</span> produit(s) prêt(s) pour le calcul des besoins.
            </div>
            <div className="flex items-center gap-1 text-blue-600 font-medium">
              <Sparkles className="h-3 w-3" /> Connecté au moteur de planification MRP Bluwa
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
