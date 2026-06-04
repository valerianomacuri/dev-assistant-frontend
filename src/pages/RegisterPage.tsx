import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthForm } from "../components/AuthForm";

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <AuthForm
      title="Crea una cuenta nueva"
      submitLabel="Registrarme"
      onSubmit={async (email, password) => {
        await register(email, password);
        navigate("/chat", { replace: true });
      }}
      footer={{
        text: "¿Ya tienes cuenta?",
        linkLabel: "Inicia sesión",
        to: "/login",
      }}
    />
  );
}
