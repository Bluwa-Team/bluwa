'use client'

import { Play, Clock } from 'lucide-react'
import { useState } from 'react'

interface VideoEmbedProps {
  youtubeId?: string
  title: string
  duration?: string  // ex. "2 min 45 s"
}

export function VideoEmbed({ youtubeId, title, duration = '~3 min' }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false)

  // ── Lecture réelle ──────────────────────────────────────────────────────────
  if (youtubeId && playing) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg mb-5">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          title={title}
        />
      </div>
    )
  }

  const available = Boolean(youtubeId)

  // ── Placeholder ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-md mb-5 select-none ${available ? 'cursor-pointer group' : 'cursor-default'}`}
      onClick={() => available && setPlaying(true)}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
      role={available ? 'button' : undefined}
      aria-label={available ? `Lire : ${title}` : undefined}
    >
      {/* Grille de points */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Dégradé bas */}
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent" />

      {/* Badge "Bientôt disponible" */}
      {!available && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-800/80 backdrop-blur-sm text-slate-400 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-700/60">
          <Clock className="w-3 h-3" />
          Bientôt disponible
        </div>
      )}

      {/* Bouton Play + titre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            available
              ? 'bg-white/20 backdrop-blur-sm ring-2 ring-white/30 group-hover:bg-white/30 group-hover:scale-110'
              : 'bg-white/8 ring-2 ring-white/10'
          }`}
        >
          <Play
            className={`w-7 h-7 ml-1 ${available ? 'text-white' : 'text-slate-600'}`}
            fill="currentColor"
          />
        </div>

        <p className={`text-sm font-medium text-center max-w-xs leading-snug ${available ? 'text-white' : 'text-slate-500'}`}>
          {title}
        </p>
      </div>

      {/* Durée */}
      <div className="absolute bottom-3 right-3 bg-black/60 text-slate-300 text-[11px] font-mono px-2 py-0.5 rounded">
        {duration}
      </div>

      {/* Hint survol */}
      {available && (
        <div className="absolute bottom-3 left-3 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Cliquer pour lire
        </div>
      )}
    </div>
  )
}
