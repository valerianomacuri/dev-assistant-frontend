import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";

interface AuthFormProps {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  footer: { text: string; linkLabel: string; to: string };
}

export function AuthForm({ title, submitLabel, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(email, password);
      // La navegación al éxito la maneja la página contenedora.
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">
          🤖 Dev Assistant
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">{title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Procesando…" : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {footer.text}{" "}
          <Link to={footer.to} className="font-medium text-slate-900 underline">
            {footer.linkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
