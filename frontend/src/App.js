import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  LoginPage,
  DashboardPage,
  PropertiesPage,
  ResidentsPage,
  PaymentsPage,
  MaintenancePage,
  StaffPage,
  ReportsPage,
  NoticesPage,
  SettingsPage,
} from "@/pages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/residents" element={<ResidentsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
