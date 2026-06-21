import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getToken, logout } from "./lib/api";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "#14532d", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between" }}>
        <strong>19er GmbH – Employee</strong>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "4px 12px", borderRadius: 4 }}>
          Logout
        </button>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
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
