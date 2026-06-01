export function WestAfricaMap() {
  // Coordinate system: x = (lon + 18) * 21 + 10, y = (20 - lat) * 21 + 10
  // ViewBox 0 0 720 360 covers lon [-18, 15], lat [3, 20]

  const landPath = [
    'M 31 74',
    'L 21 111', 'L 25 130', 'L 42 147', 'L 52 158', 'L 63 179',
    'L 84 200', 'L 100 214', 'L 115 242', 'L 115 269',
    'L 147 275', 'L 168 288',
    'L 220 315', 'L 241 326', 'L 283 315', 'L 304 311', 'L 336 315',
    'L 367 305', 'L 399 294',
    'L 413 292', 'L 435 286', 'L 451 290',
    'L 472 284', 'L 493 294', 'L 525 305', 'L 556 326', 'L 571 330', 'L 580 326',
    'L 661 294', 'L 682 252', 'L 682 147',
    'L 661 105', 'L 577 53', 'L 556 42', 'L 472 21',
    'L 430 0', 'L 367 0', 'L 304 11', 'L 220 21', 'L 136 42', 'L 73 63',
    'Z',
  ].join(' ')

  const cities = [
    {
      name: 'Dakar',
      cx: 23, cy: 121,
      label: { x: 36, y: 113, w: 47 },
    },
    {
      name: 'Abidjan',
      cx: 306, cy: 319,
      label: { x: 319, y: 311, w: 57 },
    },
    {
      name: 'Lomé',
      cx: 413, cy: 302,
      label: { x: 391, y: 282, w: 40 }, // above
    },
    {
      name: 'Cotonou',
      cx: 438, cy: 296,
      label: { x: 451, y: 288, w: 60 },
    },
  ]

  return (
    <svg
      viewBox="0 0 720 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-label="Carte Afrique de l'Ouest — Bluwa"
    >
      {/* Ocean */}
      <rect width="720" height="360" rx="20" fill="#eaf5f0" />

      {/* Land */}
      <path d={landPath} fill="#c4e3d2" stroke="#9ccdb8" strokeWidth="1.2" strokeLinejoin="round" />

      {/* Subtle country borders (Ivory Coast/Ghana, Ghana/Togo, Togo/Benin areas) */}
      <path d="M 367 305 L 365 180" stroke="#9ccdb8" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
      <path d="M 399 294 L 397 175" stroke="#9ccdb8" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
      <path d="M 435 286 L 438 175" stroke="#9ccdb8" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />

      {/* Dashed connection lines between cities */}
      {/* Dakar → Abidjan (arc along Gulf of Guinea) */}
      <path
        d="M 23 121 C 60 330 220 345 306 319"
        stroke="#074ce1"
        strokeWidth="1.8"
        strokeDasharray="7 5"
        opacity="0.35"
        strokeLinecap="round"
      />
      {/* Abidjan → Lomé */}
      <path
        d="M 306 319 C 350 318 385 310 413 302"
        stroke="#074ce1"
        strokeWidth="1.8"
        strokeDasharray="7 5"
        opacity="0.35"
        strokeLinecap="round"
      />
      {/* Lomé → Cotonou */}
      <path
        d="M 413 302 C 422 300 431 298 438 296"
        stroke="#074ce1"
        strokeWidth="1.8"
        strokeDasharray="7 5"
        opacity="0.35"
        strokeLinecap="round"
      />

      {/* Small ambient dots at other major cities */}
      {[
        { cx: 536, cy: 270 }, // Lagos area
        { cx: 335, cy: 298 }, // Accra area
        { cx: 157, cy: 200 }, // Conakry area
      ].map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r="3.5" fill="#9ccdb8" opacity="0.6" />
      ))}

      {/* City pins */}
      {cities.map((city) => (
        <g key={city.name}>
          {/* Pulse ring */}
          <circle cx={city.cx} cy={city.cy} r="15" fill="#074ce1" opacity="0.1" />
          {/* Outer white ring */}
          <circle cx={city.cx} cy={city.cy} r="9" fill="white" stroke="#074ce1" strokeWidth="2.5" />
          {/* Inner filled dot */}
          <circle cx={city.cx} cy={city.cy} r="4" fill="#074ce1" />

          {/* Label pill */}
          <rect
            x={city.label.x}
            y={city.label.y}
            width={city.label.w}
            height={18}
            rx="5"
            fill="#074ce1"
          />
          <text
            x={city.label.x + 5}
            y={city.label.y + 13}
            fontSize="10"
            fontWeight="700"
            fill="white"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  )
}
