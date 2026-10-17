import { Button } from "@repo/ui/playground";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center sm:px-10">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
        // ERROR 404
      </p>

      <p className="mt-6 font-display text-[clamp(5rem,22vw,11rem)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">
        404
      </p>

      <p className="mt-8 max-w-[46ch] font-mono text-sm leading-relaxed text-muted">
        $ cat ruta/no/existe
        <br />
        <span className="text-coral-ink">error:</span> página no encontrada
      </p>

      <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted">
        El enlace se movió, se borró o nunca existió. Desde el blog puedes
        llegar a todo lo publicado.
      </p>

      <div className="mt-10">
        <Button href="/blog" size="lg">
          Volver al blog
        </Button>
      </div>
    </main>
  );
}
