'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

const GEO_URL = '/countries-110m.json'

const WEST_AFRICA = new Map([
  ['204', 'Bénin'],
  ['854', 'Burkina Faso'],
  ['132', 'Cabo Verde'],
  ['384', "Côte d'Ivoire"],
  ['270', 'Gambie'],
  ['288', 'Ghana'],
  ['324', 'Guinée'],
  ['624', 'Guinée-Bissau'],
  ['430', 'Libéria'],
  ['466', 'Mali'],
  ['478', 'Mauritanie'],
  ['562', 'Niger'],
  ['566', 'Nigeria'],
  ['686', 'Sénégal'],
  ['694', 'Sierra Leone'],
  ['768', 'Togo'],
])

export function WestAfricaMap() {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#e8f4f9]" style={{ aspectRatio: '720 / 440' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 1100, center: [-2, 16] }}
        width={720}
        height={440}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Carte Afrique de l'Ouest — Bluwa"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const inRegion = WEST_AFRICA.has(String(geo.id))
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={inRegion ? '#074ce1' : '#c8dce8'}
                  fillOpacity={inRegion ? 0.18 : 0.35}
                  stroke={inRegion ? '#074ce1' : '#a8c0cf'}
                  strokeWidth={inRegion ? 0.8 : 0.3}
                  strokeOpacity={inRegion ? 0.7 : 0.4}
                  style={{
                    default: { outline: 'none' },
                    hover: {
                      outline: 'none',
                      fill: '#074ce1',
                      fillOpacity: inRegion ? 0.32 : 0.35,
                      cursor: inRegion ? 'default' : 'default',
                    },
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
