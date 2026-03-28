import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import LoginPage from './pages/LoginPage';
import ResponsibleSetupPage from './pages/ResponsibleSetupPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import ToolsPage from './pages/ToolsPage';
import WithdrawalPage from './pages/WithdrawalPage';
import ReturnPage from './pages/ReturnPage';
import HistoryPage from './pages/HistoryPage';
import InventoryPage from './pages/InventoryPage';

function AppRoutes() {
  const { state } = useApp();

  // Step 1: Not logged into a shift → Login
  if (!state.currentShift) {
    return <LoginPage />;
  }

  // Step 2: Logged in but no responsible set → Responsible Setup
  if (!state.responsible) {
    return <ResponsibleSetupPage />;
  }

  // Step 3: All good → Main app
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/funcionarios" element={<EmployeesPage />} />
        <Route path="/ferramentas" element={<ToolsPage />} />
        <Route path="/retirada" element={<WithdrawalPage />} />
        <Route path="/devolucao" element={<ReturnPage />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/inventario" element={<InventoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <ToastContainer />
      </AppProvider>
    </BrowserRouter>
  );
}
