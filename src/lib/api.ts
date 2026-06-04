/**
 * Cliente HTTP del frontend. Centraliza la URL base, el header de autenticación
 * (Bearer) y el parseo/errores de las respuestas del backend NestJS.
 */

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "accessToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Error con el mensaje devuelto por el backend y el status HTTP. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Si es FormData, no se fija Content-Type (el navegador pone el boundary). */
  isFormData?: boolean;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, isFormData, headers, ...rest } = options;
  const token = getToken();

  const finalHeaders = new Headers(headers);
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData) {
      finalBody = body as FormData;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  if (res.status === 401) {
    clearToken();
    // Forzamos navegación al login; las rutas protegidas también redirigen.
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError("Sesión expirada. Inicia sesión de nuevo.", 401);
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      // NestJS suele devolver { message: string | string[] }
      if (Array.isArray(data?.message)) message = data.message.join(", ");
      else if (typeof data?.message === "string") message = data.message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ===== Tipos compartidos con el backend =====

export interface AuthResponse {
  accessToken: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatsSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  messageCount: number;
  totalCostUsd: number;
  conversationCount: number;
  avgLatencyMs: number;
}

/** Uso agregado de una sola conversación. */
export interface ConversationStat {
  conversationId: string;
  title: string;
  turnCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgLatencyMs: number;
  lastActivity: string;
}

export type DocumentStatus = "processing" | "ready" | "error";

export interface DocumentEntity {
  id: string;
  userId: string;
  filename: string;
  s3Key?: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}

// ===== Endpoints =====

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function listConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/chat/conversations");
}

export function createConversation(): Promise<Conversation> {
  return apiFetch<Conversation>("/chat/conversations", { method: "POST" });
}

export function getHistory(conversationId: string): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(
    `/chat/conversations/${conversationId}/messages`,
  );
}

export function deleteConversation(conversationId: string): Promise<void> {
  return apiFetch<void>(`/chat/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export function getStats(): Promise<StatsSummary> {
  return apiFetch<StatsSummary>("/stats");
}

export function getConversationStats(): Promise<ConversationStat[]> {
  return apiFetch<ConversationStat[]>("/stats/conversations");
}

export function listDocuments(): Promise<DocumentEntity[]> {
  return apiFetch<DocumentEntity[]>("/documents");
}

export function uploadDocument(file: File): Promise<DocumentEntity> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<DocumentEntity>("/documents", {
    method: "POST",
    body: form,
    isFormData: true,
  });
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
}
