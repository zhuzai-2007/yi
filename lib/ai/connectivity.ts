import { useSyncExternalStore } from "react";
export const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
// The server assumes online; browser state is read after hydration and remains an UX hint.
export const useOffline = () =>
  useSyncExternalStore(subscribe, isOffline, () => false);
