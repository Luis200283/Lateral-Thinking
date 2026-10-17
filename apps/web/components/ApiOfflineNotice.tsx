/**
 * Aviso único de "API apagada" para las pantallas públicas.
 * Fallback visual: nunca rompe el build ni la página, solo avisa.
 */
export function ApiOfflineNotice() {
  return (
    <div
      role="alert"
      className="rounded-card border-[1.5px] border-ink bg-sun p-4 shadow-[3px_3px_0_var(--color-ink)]"
    >
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-on-accent">
        // api offline
      </p>
      <p className="mt-1.5 text-sm text-on-accent">
        La API pública no responde ahora mismo: esta página muestra su fallback
        estático. Arranca la API para ver los datos reales.
      </p>
    </div>
  );
}
