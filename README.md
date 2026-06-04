# Dev Assistant — Frontend

Frontend en **React + Vite + TypeScript + Tailwind CSS** para la API
[`dev-assistant-backend`](../dev-assistant-backend). Incluye autenticación JWT,
rutas protegidas, chat con streaming (SSE) y gestión de la fuente de conocimiento
(documentos RAG).

## Requisitos

- Node.js 18+
- El backend `dev-assistant-backend` corriendo (por defecto en `http://localhost:3000`).
  Asegúrate de que tenga CORS habilitado (ver `main.ts`, variable `CORS_ORIGINS`).

## Puesta en marcha

```bash
npm install
cp .env.example .env   # ajusta VITE_API_URL si tu backend usa otra URL
npm run dev            # http://localhost:5173
```

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compila TypeScript y genera el build de producción en `dist/`.
- `npm run preview` — sirve el build de producción localmente.

## Configuración

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `VITE_API_URL` | URL base de la API del backend | `http://localhost:3000` |

## Estructura

```
src/
├── lib/api.ts          # Cliente HTTP (Bearer, manejo de errores/401)
├── auth/               # AuthContext + ProtectedRoute
├── components/         # Layout, AuthForm
└── pages/              # Login, Register, Chat, Knowledge
```

El chat usa `EventSource` contra `GET /chat/stream`; como `EventSource` no admite
cabeceras, el token JWT viaja en el query string (`?token=...`), tal como espera
el backend.
