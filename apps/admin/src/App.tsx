import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/providers/AuthProvider";
import { AttendancePage } from "@/pages/AttendancePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PayrollPage } from "@/pages/PayrollPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ShiftsPage } from "@/pages/ShiftsPage";
import { UsersPage } from "@/pages/UsersPage";
import { Loader2 } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
