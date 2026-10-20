import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, ROLE_HOME } from "./auth.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import WorkOrderPrint from "./pages/WorkOrderPrint.jsx";

import NrtcDashboard from "./pages/nrtc/Dashboard.jsx";
import NrtcWorkOrders from "./pages/nrtc/WorkOrders.jsx";
import NrtcCreateWorkOrder from "./pages/nrtc/CreateWorkOrder.jsx";
import NrtcWorkOrderDetail from "./pages/nrtc/WorkOrderDetail.jsx";
import NrtcInventory from "./pages/nrtc/Inventory.jsx";
import NrtcImport from "./pages/nrtc/Import.jsx";
import NrtcSettings from "./pages/nrtc/Settings.jsx";
import NrtcUsers from "./pages/nrtc/UsersAdmin.jsx";

import P3cDashboard from "./pages/p3c/Dashboard.jsx";
import P3cWorkOrders from "./pages/p3c/WorkOrders.jsx";
import P3cWorkOrderDetail from "./pages/p3c/WorkOrderDetail.jsx";

import ProductionDashboard from "./pages/production/Dashboard.jsx";
import ProductionWorkOrders from "./pages/production/WorkOrders.jsx";
import ProductionWorkOrderDetail from "./pages/production/WorkOrderDetail.jsx";
import ProductionSections from "./pages/production/Sections.jsx";

import FinanceDashboard from "./pages/finance/Dashboard.jsx";
import FinanceWorkOrders from "./pages/finance/WorkOrders.jsx";
import FinanceWorkOrderDetail from "./pages/finance/WorkOrderDetail.jsx";

import GatepassList from "./pages/gatepass/List.jsx";
import GatepassNew from "./pages/gatepass/New.jsx";
import GatepassView from "./pages/gatepass/View.jsx";

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/print/wo/:id" element={<WorkOrderPrint />} />

        <Route path="/nrtc" element={<RequireRole role="nrtc_admin"><NrtcDashboard /></RequireRole>} />
        <Route path="/nrtc/create" element={<RequireRole role="nrtc_admin"><NrtcCreateWorkOrder /></RequireRole>} />
        <Route path="/nrtc/work-orders" element={<RequireRole role="nrtc_admin"><NrtcWorkOrders /></RequireRole>} />
        <Route path="/nrtc/work-orders/:id" element={<RequireRole role="nrtc_admin"><NrtcWorkOrderDetail /></RequireRole>} />
        <Route path="/nrtc/inventory" element={<RequireRole role="nrtc_admin"><NrtcInventory /></RequireRole>} />
        <Route path="/nrtc/inventory/import" element={<RequireRole role="nrtc_admin"><NrtcImport /></RequireRole>} />
        <Route path="/nrtc/users" element={<RequireRole role="nrtc_admin"><NrtcUsers /></RequireRole>} />
        <Route path="/nrtc/settings" element={<RequireRole role="nrtc_admin"><NrtcSettings /></RequireRole>} />

        <Route path="/p3c" element={<RequireRole role="p3c"><P3cDashboard /></RequireRole>} />
        <Route path="/p3c/work-orders" element={<RequireRole role="p3c"><P3cWorkOrders /></RequireRole>} />
        <Route path="/p3c/work-orders/:id" element={<RequireRole role="p3c"><P3cWorkOrderDetail /></RequireRole>} />

        <Route path="/production" element={<RequireRole role="production"><ProductionDashboard /></RequireRole>} />
        <Route path="/production/work-orders" element={<RequireRole role="production"><ProductionWorkOrders /></RequireRole>} />
        <Route path="/production/work-orders/:id" element={<RequireRole role="production"><ProductionWorkOrderDetail /></RequireRole>} />
        <Route path="/production/sections" element={<RequireRole role="production"><ProductionSections /></RequireRole>} />
        <Route path="/production/sections/:section" element={<RequireRole role="production"><ProductionSections /></RequireRole>} />

        <Route path="/finance" element={<RequireRole role="finance"><FinanceDashboard /></RequireRole>} />
        <Route path="/finance/work-orders" element={<RequireRole role="finance"><FinanceWorkOrders /></RequireRole>} />
        <Route path="/finance/work-orders/:id" element={<RequireRole role="finance"><FinanceWorkOrderDetail /></RequireRole>} />

        <Route path="/gatepasses" element={<GatepassList />} />
        <Route path="/gatepasses/new/:woId" element={<RequireRole role="nrtc_admin"><GatepassNew /></RequireRole>} />
        <Route path="/gatepasses/:id" element={<GatepassView />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
