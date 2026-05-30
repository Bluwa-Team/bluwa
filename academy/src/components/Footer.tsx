import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-600">
        <div>
          <div className="flex items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Bluwa" className="h-7 w-auto" />
            <span className="text-xs font-semibold text-slate-400 border-l border-slate-200 pl-2">Academy</span>
          </div>
          <p>Formations agroalimentaires pour l'Afrique de l'Ouest.</p>
        </div>

        <div>
          <p className="font-semibold text-slate-800 mb-2">Modules</p>
          <ul className="space-y-1">
            <li><Link href="/modules/fondations-mdm" className="hover:text-indigo-600">Fondations & MDM</Link></li>
            <li><Link href="/modules/planification-mrp2" className="hover:text-indigo-600">Planification MRP2</Link></li>
            <li><Link href="/modules/stocks-qualite" className="hover:text-indigo-600">Stocks & Qualité</Link></li>
            <li><Link href="/modules/haccp" className="hover:text-indigo-600">HACCP</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-slate-800 mb-2">Certifications</p>
          <ul className="space-y-1">
            <li><Link href="/certifications/user" className="hover:text-indigo-600">Utilisateurs Bluwa</Link></li>
            <li><Link href="/certifications/metier" className="hover:text-indigo-600">Compétences métier</Link></li>
            <li><Link href="/certifications/cbscp" className="hover:text-indigo-600">CBSCP</Link></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-slate-400 pb-6">
        © {new Date().getFullYear()} Bluwa · Tous droits réservés
      </div>
    </footer>
  )
}
