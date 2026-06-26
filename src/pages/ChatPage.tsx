import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  API_URL,
  createConversation,
  deleteConversation,
  getHistory,
  getStats,
  getToken,
  listConversations,
  type ChatMessage,
  type Conversation,
  type StatsSummary,
} from "../lib/api";
import { ConversationSidebar } from "../components/ConversationSidebar";

interface DoneMeta {
  toolsUsed?: string[];
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  iterations?: number;
  runId?: string;
  runStatus?: "running" | "completed" | "failed" | "max_iters";
  model?: string;
  costUsd?: number;
  limitReached?: boolean;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<DoneMeta | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  // Conversación activa: la que se muestra en el área de chat.
  const [activeId, setActiveId] = useState<string | null>(null);
  // Lista completa de conversaciones del usuario (para el sidebar).
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const sourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Refresca la lista de conversaciones del sidebar.
  const refreshConversations = () =>
    listConversations()
      .then((list) => {
        setConversations(list);
        return list;
      })
      .catch(() => {
        setConversations([]);
        return [] as Conversation[];
      });

  // Carga la última conversación activa y las stats acumuladas al montar.
  useEffect(() => {
    refreshConversations()
      .then(async (list) => {
        const latest = list[0];
        if (!latest) return;
        setActiveId(latest.id);
        const history = await getHistory(latest.id);
        setMessages(history);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));

    getStats()
      .then(setStats)
      .catch(() => setStats(null));

    // Cierra el stream si el componente se desmonta.
    return () => sourceRef.current?.close();
  }, []);

  // Auto-scroll al final cuando cambian los mensajes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const updateLastAssistant = (updater: (prev: string) => string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, content: updater(last.content) };
      }
      return next;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setMeta(null);
    setInput("");

    // Asegura una conversación activa (créala en el primer mensaje).
    let conversationId = activeId;
    if (!conversationId) {
      try {
        const conv = await createConversation();
        conversationId = conv.id;
        setActiveId(conv.id);
        void refreshConversations();
      } catch {
        setError("No se pudo crear la conversación.");
        return;
      }
    }

    // Mensaje del usuario + placeholder del asistente.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    const token = getToken() ?? "";
    const url = `${API_URL}/chat/stream?conversationId=${encodeURIComponent(
      conversationId,
    )}&message=${encodeURIComponent(text)}&token=${encodeURIComponent(token)}`;

    const source = new EventSource(url);
    sourceRef.current = source;
    let done = false;

    const finish = () => {
      done = true;
      setStreaming(false);
      source.close();
      sourceRef.current = null;
    };

    source.addEventListener("token", (e) => {
      updateLastAssistant((prev) => prev + (e as MessageEvent).data);
    });

    source.addEventListener("done", (e) => {
      try {
        setMeta(JSON.parse((e as MessageEvent).data) as DoneMeta);
      } catch {
        /* metadata opcional */
      }
      // Refresca los totales acumulados con el turno recién guardado.
      getStats()
        .then(setStats)
        .catch(() => {
          /* no crítico */
        });
      // Refresca el sidebar: título autogenerado y reordenamiento por actividad.
      void refreshConversations();
      finish();
    });

    source.addEventListener("error", (e) => {
      const data = (e as MessageEvent).data;
      if (data) {
        // Error de aplicación enviado por el backend.
        setError(String(data));
        updateLastAssistant((prev) => prev || "⚠️ No se pudo completar la respuesta.");
      } else if (!done) {
        // Error de conexión nativo de EventSource.
        setError("Se perdió la conexión con el servidor.");
        updateLastAssistant((prev) => prev || "⚠️ Conexión interrumpida.");
      }
      finish();
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Inicia una conversación nueva: vacía la vista y la activa al primer envío.
  const handleNew = () => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setMeta(null);
    setError(null);
  };

  // Cambia a otra conversación y carga su historial.
  const handleSelect = async (id: string) => {
    if (streaming || id === activeId) return;
    setActiveId(id);
    setMeta(null);
    setError(null);
    setLoadingHistory(true);
    try {
      setMessages(await getHistory(id));
    } catch {
      setMessages([]);
      setError("No se pudo cargar la conversación.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Borra (soft delete) una conversación; si era la activa, pasa a otra.
  const handleDelete = async (id: string) => {
    if (streaming) return;
    if (!confirm("¿Borrar esta conversación?")) return;
    try {
      await deleteConversation(id);
      const list = await refreshConversations();
      if (id === activeId) {
        setMeta(null);
        setError(null);
        const latest = list[0];
        if (latest) {
          setActiveId(latest.id);
          setMessages(await getHistory(latest.id));
        } else {
          setActiveId(null);
          setMessages([]);
        }
      }
    } catch {
      setError("No se pudo borrar la conversación.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        disabled={streaming}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4"
        >
        {loadingHistory ? (
          <p className="text-center text-sm text-slate-400">Cargando historial…</p>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">
            Empieza la conversación. Sube documentos en{" "}
            <span className="font-medium">Conocimiento</span> para respuestas con
            tu contexto.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.content ||
                  (streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      <span className="animate-pulse">●</span>
                    </span>
                  ) : (
                    ""
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {meta && (
        <p className="mt-2 text-xs text-slate-400">
          {meta.toolsUsed && meta.toolsUsed.length > 0 && (
            <>Herramientas: {meta.toolsUsed.join(", ")} · </>
          )}
          Tokens: {meta.inputTokens ?? 0} entrada / {meta.outputTokens ?? 0} salida
          {meta.cacheReadTokens != null && meta.cacheReadTokens > 0 &&
            ` · ${meta.cacheReadTokens} de caché`}
          {meta.iterations != null && meta.iterations > 1 &&
            ` · ${meta.iterations} iteraciones`}
          {meta.costUsd != null && ` · Costo: $${meta.costUsd.toFixed(4)}`}
          {meta.limitReached && " · ⚠️ límite de iteraciones alcanzado"}
        </p>
      )}

      {stats && stats.messageCount > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          Total acumulado: {stats.messageCount} mensajes en{" "}
          {stats.conversationCount} conversaciones ·{" "}
          {stats.totalInputTokens}/{stats.totalOutputTokens} tokens ·{" "}
          ${stats.totalCostUsd.toFixed(4)}
          {stats.avgLatencyMs > 0 &&
            ` · ${(stats.avgLatencyMs / 1000).toFixed(1)}s latencia media`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Escribe tu mensaje… (Enter para enviar, Shift+Enter para salto de línea)"
          className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {streaming ? "…" : "Enviar"}
        </button>
      </form>
      </div>
    </div>
  );
}
