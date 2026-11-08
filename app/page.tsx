import App from '@/components/app'

// Server Component: Next lo prerenderiza como HTML estático en el build,
// así la pantalla de ingreso aparece al instante y luego se hidrata.
export default function Page() {
  return <App />
}
