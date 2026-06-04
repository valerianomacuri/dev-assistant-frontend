import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ChatPage } from "./pages/ChatPage";
import { KnowledgePage } from "./pages/KnowledgePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
          </Route>

          {/* Por defecto */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
