import { AppShell } from "@/core/layout/AppShell";
import { ProtectedRoute } from "@/core/layout/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { HomePage } from "@/features/home/pages/HomePage";
import { PayrollDetailPage } from "@/features/payroll/pages/PayrollDetailPage";
import { PayrollPage } from "@/features/payroll/pages/PayrollPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { SchedulePage } from "@/features/schedule/pages/SchedulePage";
import { ShiftDetailPage } from "@/features/schedule/pages/ShiftDetailPage";
import { Navigate, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="schedule/:assignmentId" element={<ShiftDetailPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/:id" element={<PayrollDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
