import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./providers/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "#14532d", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between" }}>
        <strong>19er GmbH – Employee</strong>
        <button
          type="button"
          onClick={() => void logout()}
          style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "4px 12px", borderRadius: 4 }}
        >
          Logout
        </button>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
