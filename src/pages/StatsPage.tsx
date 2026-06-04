import { useEffect, useState } from "react";
import {
  ApiError,
  getConversationStats,
  getStats,
  type ConversationStat,
  type StatsSummary,
} from "../lib/api";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Una tarjeta de KPI del resumen. */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function StatsPage() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [conversations, setConversations] = useState<ConversationStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getStats(), getConversationStats()])
      .then(([s, c]) => {
        setSummary(s);
        setConversations(c);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las estadísticas.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Estadísticas</h2>
        <p className="text-sm text-slate-500">
          Uso y costo de tus conversaciones con el asistente.
        </p>
      </div>

      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="p-6 text-center text-sm text-slate-400">Cargando…</p>
      ) : !summary || summary.messageCount === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-400">
          Aún no hay actividad. Empieza una conversación en{" "}
          <span className="font-medium">Chat</span>.
        </p>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Costo total"
              value={`$${summary.totalCostUsd.toFixed(4)}`}
            />
            <StatCard
              label="Tokens (in/out)"
              value={`${summary.totalInputTokens.toLocaleString()} / ${summary.totalOutputTokens.toLocaleString()}`}
            />
            <StatCard
              label="Conversaciones"
              value={String(summary.conversationCount)}
            />
            <StatCard
              label="Mensajes del bot"
              value={String(summary.messageCount)}
            />
            <StatCard
              label="Latencia media"
              value={
                summary.avgLatencyMs > 0
                  ? `${(summary.avgLatencyMs / 1000).toFixed(1)} s`
                  : "—"
              }
            />
          </div>

          {/* Desglose por conversación */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Conversación</th>
                  <th className="px-4 py-3 font-medium">Turnos</th>
                  <th className="px-4 py-3 font-medium">Tokens (in/out)</th>
                  <th className="px-4 py-3 font-medium">Costo</th>
                  <th className="px-4 py-3 font-medium">Latencia media</th>
                  <th className="px-4 py-3 font-medium">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((c) => (
                  <tr
                    key={c.conversationId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">
                      {c.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.turnCount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.inputTokens.toLocaleString()} /{" "}
                      {c.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      ${c.costUsd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.avgLatencyMs > 0
                        ? `${(c.avgLatencyMs / 1000).toFixed(1)} s`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(c.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
