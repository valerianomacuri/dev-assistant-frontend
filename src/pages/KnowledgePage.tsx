import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  deleteDocument,
  listDocuments,
  uploadDocument,
  type DocumentEntity,
} from "../lib/api";
import { onDocumentStatus } from "../lib/socket";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const STATUS_STYLES: Record<DocumentEntity["status"], string> = {
  queued: "bg-slate-100 text-slate-700",
  chunking: "bg-amber-100 text-amber-800",
  embedding: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<DocumentEntity["status"], string> = {
  queued: "En cola…",
  chunking: "Troceando…",
  embedding: "Generando embeddings…",
  ready: "Listo",
  failed: "Error",
};

export function KnowledgePage() {
  const [docs, setDocs] = useState<DocumentEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    try {
      const list = await listDocuments();
      setDocs(list);
      return list;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los documentos.");
      return [];
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  // Progreso en tiempo real vía WebSocket (reemplaza el polling).
  useEffect(() => {
    return onDocumentStatus((event) => {
      setDocs((prev) => {
        const idx = prev.findIndex((d) => d.id === event.id);
        if (idx === -1) {
          // Documento aún no listado (subida muy reciente): refresca la lista.
          void refresh();
          return prev;
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: event.status,
          chunkCount: event.chunkCount ?? next[idx].chunkCount,
          errorMessage: event.errorMessage ?? next[idx].errorMessage,
        };
        return next;
      });
    });
  }, []);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadDocument(file);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: DocumentEntity) => {
    if (!confirm(`¿Eliminar "${doc.filename}"?`)) return;
    setError(null);
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el documento.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Fuente de conocimiento
          </h2>
          <p className="text-sm text-slate-500">
            Sube documentos (.md, .txt, .pdf — máx. 20 MB) para que el asistente
            los use como contexto.
          </p>
        </div>
        <label className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 aria-disabled:opacity-50">
          {uploading ? "Subiendo…" : "Subir documento"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.pdf"
            disabled={uploading}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">
            Aún no has subido documentos.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Tamaño</th>
                <th className="px-4 py-3 font-medium">Fragmentos</th>
                <th className="px-4 py-3 font-medium">Subido</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {doc.filename}
                    {doc.status === "failed" && doc.errorMessage && (
                      <span className="block text-xs font-normal text-red-600">
                        {doc.errorMessage}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status]}`}
                    >
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatBytes(doc.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{doc.chunkCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
