'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

const GEO_URL = '/countries-110m.json'

const WEST_AFRICA = new Set([
  '204', '854', '132', '384', '270', '288',
  '324', '624', '430', '466', '478', '562',
  '566', '686', '694', '768',
])

// Tous les pays africains (ISO numérique, normalisé 3 chiffres)
const AFRICA = new Set([
  '012','024','072','108','120','132','140','148','174','175',
  '178','180','204','226','231','232','262','266','270','288',
  '324','384','404','426','430','434','450','454','466','478',
  '480','504','508','516','562','566','624','646','678','686',
  '694','706','710','716','728','729','732','748','768','788',
  '800','818','834','854','894',
])

const geoId = (id: string | number) => String(id).padStart(3, '0')

export function WestAfricaMap() {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#f0f6fa]" style={{ aspectRatio: '720 / 560' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 370, center: [22, 8] }}
        width={720}
        height={560}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Carte Afrique — Bluwa"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) =>
            geographies
              .filter((geo) => AFRICA.has(geoId(geo.id)))
              .map((geo) => {
                const inRegion = WEST_AFRICA.has(geoId(geo.id))
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={inRegion ? '#074ce1' : '#c8dce8'}
                    fillOpacity={inRegion ? 0.8 : 0.5}
                    stroke="none"
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', cursor: 'default' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
}
