// Logo de Torres del Parque: la torre de la ilustración del ingreso (cuerpo pizarra, núcleo ladrillo,
// cielo y césped) dibujada con trazo fino. SVG en línea: no suma ninguna petición.
const OUTLINE = '#243447'

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#d6ebf2" />
      <path d="M0 23h32a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9z" fill="#a3cf8e" />
      <rect x="7" y="9" width="12" height="15" rx="1" fill="#8196b8" stroke={OUTLINE} strokeWidth="1.3" />
      <rect x="20" y="12" width="6" height="12" rx="1" fill="#eef1f6" stroke={OUTLINE} strokeWidth="1.3" />
      <rect x="15.5" y="6.5" width="4.5" height="17.5" fill="#cf7b60" stroke={OUTLINE} strokeWidth="1.3" />
      <g fill="#e1f1f7">
        <rect x="9" y="11.5" width="2.2" height="2.2" /><rect x="12.2" y="11.5" width="2.2" height="2.2" />
        <rect x="9" y="15.3" width="2.2" height="2.2" /><rect x="12.2" y="15.3" width="2.2" height="2.2" />
        <rect x="9" y="19.1" width="2.2" height="2.2" /><rect x="12.2" y="19.1" width="2.2" height="2.2" />
      </g>
      <g fill="#8196b8">
        <rect x="22" y="15" width="2.4" height="2.2" /><rect x="22" y="19" width="2.4" height="2.2" />
      </g>
      <path d="M3.5 24.5h25" stroke={OUTLINE} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// Marco de las pantallas públicas (ingreso y restablecer contraseña): la ilustración del conjunto, la marca y el contenido.
export function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="welcome">
      {/* Dos tamaños: un celular de pantalla normal baja la versión de 1200px (38 KB) en vez de la de 1800px (88 KB). */}
      <img className="welcome-art" src="/login-hero.webp" srcSet="/login-hero-sm.webp 1200w, /login-hero.webp 1800w" sizes="(max-width: 959px) 600px, 1300px"
        alt="" aria-hidden="true" width={1800} height={1004} fetchPriority="high" decoding="async" />
      <div className="welcome-inner">
        <div className="brand"><BrandMark /><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
        {children}
      </div>
    </main>
  )
}
