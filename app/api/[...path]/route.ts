import type { NextRequest } from 'next/server'

// Proxy de /api/* hacia el backend, con respaldo: se prueban los servidores en orden y, si uno no
// responde (apagado, sin conexión o 502/503/504), se usa el siguiente. Reemplaza al rewrite de next.config.
//   API_URLS = "http://localhost:8080,https://propiedad-horizontal-back-end.onrender.com"  (separados por coma)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKENDS = (process.env.API_URLS || process.env.API_URL || 'http://localhost:8080,https://propiedad-horizontal-back-end.onrender.com')
  .split(',').map(u => u.trim().replace(/\/+$/, '')).filter(Boolean)

// Recuerda el último servidor que respondió para no reintentar uno caído en cada petición.
let preferred = 0
let preferredUntil = 0
const STICKY_MS = 30_000

const DOWN = new Set([502, 503, 504])
const SKIP_REQ = new Set(['host', 'connection', 'content-length', 'accept-encoding'])
const SKIP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection'])

async function proxy(req: NextRequest): Promise<Response> {
  const { pathname, search } = req.nextUrl
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer()
  const headers = new Headers()
  req.headers.forEach((v, k) => { if (!SKIP_REQ.has(k)) headers.set(k, v) })

  const start = Date.now() < preferredUntil ? preferred : 0
  const order = BACKENDS.map((_, i) => (start + i) % BACKENDS.length)
  let last: Response | null = null

  for (const [n, i] of order.entries()) {
    const isLast = n === order.length - 1
    try {
      const res = await fetch(`${BACKENDS[i]}${pathname}${search}`, { method: req.method, headers, body, redirect: 'manual', cache: 'no-store' })
      if (DOWN.has(res.status) && !isLast) { last = res; continue }
      preferred = i; preferredUntil = Date.now() + STICKY_MS
      const out = new Headers()
      res.headers.forEach((v, k) => { if (!SKIP_RES.has(k)) out.set(k, v) })
      return new Response(res.status === 204 || res.status === 304 ? null : res.body, { status: res.status, headers: out })
    } catch {
      // sin conexión con este servidor: se prueba el siguiente
    }
  }
  if (last) return new Response(last.body, { status: last.status })
  // Ninguno responde: texto plano (no JSON) para que el front lo trate como servidor caído.
  return new Response('Servidor no disponible', { status: 502, headers: { 'content-type': 'text/plain' } })
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD }
