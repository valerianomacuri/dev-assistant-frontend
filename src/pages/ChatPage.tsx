import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  API_URL,
  clearChat,
  getHistory,
  getToken,
  type ChatMessage,
} from "../lib/api";

interface DoneMeta {
  toolsUsed?: string[];
  inputTokens?: number;
  outputTokens?: number;
  limitReached?: boolean;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<DoneMeta | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const sourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Carga el historial al montar.
  useEffect(() => {
    getHistory()
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));

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

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setMeta(null);
    setInput("");

    // Mensaje del usuario + placeholder del asistente.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    const token = getToken() ?? "";
    const url = `${API_URL}/chat/stream?message=${encodeURIComponent(
      text,
    )}&token=${encodeURIComponent(token)}`;

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
    send();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleClear = async () => {
    if (streaming) return;
    if (!confirm("¿Borrar toda la conversación?")) return;
    try {
      await clearChat();
      setMessages([]);
      setMeta(null);
      setError(null);
    } catch {
      setError("No se pudo limpiar la conversación.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Chat</h2>
        <button
          onClick={handleClear}
          disabled={streaming || messages.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          Limpiar conversación
        </button>
      </div>

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
          {meta.limitReached && " · ⚠️ límite alcanzado"}
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
  );
}
