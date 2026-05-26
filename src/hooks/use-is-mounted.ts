import * as React from 'react'

const NOOP_UNSUBSCRIBE = () => {}
function noopSubscribe() {
  return NOOP_UNSUBSCRIBE
}
const getMountedSnapshot = () => true
const getMountedServerSnapshot = () => false

// Devuelve false en SSR y true después de hidratar. Patrón idiomático de
// React 19 para "esperar al cliente" sin disparar setState dentro de un
// effect (que es lo que flagueaba react-hooks/set-state-in-effect).
export function useIsMounted(): boolean {
  return React.useSyncExternalStore(noopSubscribe, getMountedSnapshot, getMountedServerSnapshot)
}
