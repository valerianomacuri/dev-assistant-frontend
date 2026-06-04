/**
 * Cliente WebSocket (Socket.IO) para eventos en tiempo real del backend.
 * Hoy se usa para el progreso de ingestión de documentos (`document.status`),
 * reemplazando el polling anterior.
 */
import { io, type Socket } from "socket.io-client";
import { API_URL, getToken, type DocumentStatus } from "./api";

/** Payload del evento `document.status` emitido por el backend. */
export interface DocumentStatusEvent {
  id: string;
  status: DocumentStatus;
  chunkCount?: number;
  errorMessage?: string | null;
}

let socket: Socket | null = null;

/** Devuelve (creando si hace falta) el socket autenticado con el JWT actual. */
function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_URL, {
    auth: { token: getToken() ?? "" },
    transports: ["websocket"],
  });
  return socket;
}

/**
 * Suscribe `cb` a los eventos `document.status`. Devuelve una función para
 * desuscribirse (pensada para el cleanup de un `useEffect`).
 */
export function onDocumentStatus(
  cb: (event: DocumentStatusEvent) => void,
): () => void {
  const s = getSocket();
  s.on("document.status", cb);
  return () => {
    s.off("document.status", cb);
  };
}

/** Cierra la conexión (p. ej. al cerrar sesión). */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
