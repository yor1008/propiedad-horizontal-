'use client'

import { useEffect } from 'react'

// En pantallas pequeñas las tablas se muestran como tarjetas (ver globals.css). Para eso cada celda
// necesita el nombre de su columna: se copia del <th> a un atributo data-label, también en filas nuevas.
export default function TableLabels() {
  useEffect(() => {
    let frame = 0
    const label = () => {
      frame = 0
      document.querySelectorAll('table').forEach(table => {
        const heads = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent?.trim() ?? '')
        table.querySelectorAll('tbody tr').forEach(row => {
          Array.from(row.children).forEach((cell, i) => {
            if (heads[i] && cell.getAttribute('data-label') !== heads[i]) cell.setAttribute('data-label', heads[i])
          })
        })
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(label) }
    label()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame) }
  }, [])
  return null
}
