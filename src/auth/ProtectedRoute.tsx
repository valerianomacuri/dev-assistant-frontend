import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Layout } from "../components/Layout";

/**
 * Envuelve las rutas que requieren sesión. Si no hay token, redirige al login;
 * en caso contrario renderiza el Layout con la ruta hija.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
