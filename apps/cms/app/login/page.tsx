"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, Alert, Field, PageHeader, Panel, TextInput } from "../../components/ui";
import { ApiError, getApiStatus, login } from "../../lib/cms-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { baseUrl } = getApiStatus();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 0
            ? `API no disponible (${baseUrl}). Arranca api-cms en :4001.`
            : err.status === 401 || err.status === 400
              ? "Credenciales inválidas."
              : `Error (${err.message}).`,
        );
      } else {
        setError("Error inesperado.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-8">
      <Panel className="w-full max-w-md p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-8">
        <PageHeader kicker="// ACCESO" title="Entrar al CMS" />
        <p className="mt-2 text-sm text-muted">
          Better Auth email/password contra{" "}
          <code className="font-mono text-xs">{baseUrl}/auth</code>. El JWT se
          guarda en localStorage y se usa como Bearer.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <Field label="Email">
            <TextInput
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? (
            <Alert tone="error" role="alert">
              {error}
            </Alert>
          ) : null}
          <ActionButton type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando…" : "Entrar"}
          </ActionButton>
        </form>
      </Panel>
    </section>
  );
}
