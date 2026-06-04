import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthForm } from "../components/AuthForm";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <AuthForm
      title="Inicia sesión en tu cuenta"
      submitLabel="Entrar"
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate("/chat", { replace: true });
      }}
      footer={{
        text: "¿No tienes cuenta?",
        linkLabel: "Regístrate",
        to: "/register",
      }}
    />
  );
}
