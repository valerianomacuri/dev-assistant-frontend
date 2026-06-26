import type { Conversation } from "../lib/api";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  /** true mientras hay un stream en curso: deshabilita los controles. */
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/**
 * Lista lateral de conversaciones del usuario. Componente presentacional:
 * el estado (lista, activa) y el fetching viven en ChatPage.
 */
export function ConversationSidebar({
  conversations,
  activeId,
  disabled,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-2">
        <button
          onClick={onNew}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          ＋ Nueva conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            Sin conversaciones
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onSelect(c.id)}
                    disabled={disabled}
                    className={`flex w-full items-center rounded-md px-3 py-2 pr-8 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{c.title || "Nueva conversación"}</span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    disabled={disabled}
                    title="Borrar conversación"
                    aria-label="Borrar conversación"
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-sm opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0 ${
                      isActive
                        ? "text-slate-300 hover:text-white"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
