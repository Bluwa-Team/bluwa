'use client'

import { useState } from 'react'
import { Plus, Printer, FileText, TrendingUp, ShoppingCart } from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BonAchat, TYPE_FOURN_COLORS, MOCK_BONS_ACHAT } from './_components/types'

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export default function AchatsPage() {
  const locale = useLocale()
  const [bons] = useState<BonAchat[]>(MOCK_BONS_ACHAT)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Achats</h1>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs font-medium">
              v0.1 MVP
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Bons d&apos;achat · Contrats cadres fournisseurs · Historique &amp; tendances de prix
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nouveau Bon d&apos;Achat
        </Button>
      </div>

      <Tabs defaultValue="bons">
        <TabsList>
          <TabsTrigger value="bons" className="gap-1.5">
            <ShoppingCart className="size-3.5" />
            Bons d&apos;achat
          </TabsTrigger>
          <TabsTrigger value="contrats" className="gap-1.5">
            <FileText className="size-3.5" />
            Contrats cadres
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-1.5">
            <TrendingUp className="size-3.5" />
            Historique des prix
          </TabsTrigger>
        </TabsList>

        {/* Bons d'achat */}
        <TabsContent value="bons" className="mt-4">
          {bons.length === 0 ? (
            <EmptyTab label="Aucun bon d'achat" />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-xs tracking-wide">N° Bon</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide">Date</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide">Fournisseur</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide">Article</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide text-right">Qté</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide text-right">Prix unit.</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide text-right">Total</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide">Type</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide">Lot créé</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide text-center">BA</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wide text-center">Étiquettes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bons.map((bon) => (
                    <TableRow key={bon.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-sm font-medium">{bon.numero}</TableCell>
                      <TableCell className="font-mono text-sm">{bon.date}</TableCell>
                      <TableCell className="text-sm">
                        {bon.fournisseur}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({bon.typeFournisseur === 'Formel' ? 'F' : 'I'})
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{bon.article}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(bon.quantite, locale)} {bon.unite}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(bon.prixUnitaire, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatNumber(bon.total, locale)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_FOURN_COLORS[bon.typeFournisseur]}`}>
                          {bon.typeFournisseur}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {bon.lotCree ?? <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <Printer className="size-3" />
                          BA
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Printer className="size-3" />
                          Imprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Contrats cadres */}
        <TabsContent value="contrats" className="mt-4">
          <EmptyTab label="Aucun contrat cadre" />
        </TabsContent>

        {/* Historique des prix */}
        <TabsContent value="historique" className="mt-4">
          <EmptyTab label="Aucun historique de prix" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
