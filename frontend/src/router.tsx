// src/router.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext.tsx";
import Login from "@/pages/Login";
import Dashboard from "@/pages/dashboard/Dashboard.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import AdminLayout from "./components/layout/AdminLayout";
import UsersPage from "./pages/users/UsersPage";
import UserFormPage from "./pages/users/UserFormPage";
import RolesPage from "./pages/roles&permissions/RolesPage";
import RoleFormPage from "./pages/roles&permissions/RoleFormPage";
import StaffPage from "./pages/staff/StaffPage";
import StaffFormPage from "./pages/staff/StaffFormPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerFormPage from "./pages/customers/CustomerFormPage";
import ProductsPage from "./pages/products/ProductsPage";
import ProductFormPage from "./pages/products/ProductFormPage";
import ServicesPage from "./pages/services/ServicesPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import PackagePlansPage from "./pages/packages/PackagePlansPage";
import PackagePlanFormPage from "./pages/packages/PackagePlanFormPage";
import CustomerPackagesPage from "./pages/packages/CustomerPackagesPage";
import PackageUsagesPage from "./pages/packages/PackageUsagesPage";
import RoomsPage from "./pages/rooms/RoomsPage";
import RoomFormPage from "./pages/rooms/RoomFormPage";
import RoomTypesPage from "./pages/rooms/RoomTypesPage";
import RoomTypeFormPage from "./pages/rooms/RoomTypeFormPage";
import ShiftPage from "./pages/shifts/ShiftPage";
import ShiftSummaryPage from "./pages/shifts/ShiftSummaryPage";
import PosPage from "./pages/pos/PosPage.tsx";
import OrdersHistoryPage from "./pages/pos/OrdersHistoryPage.tsx";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";
import AppointmentFormPage from "./pages/appointments/AppointmentFormPage";
import AppointmentCheckoutPage from "./pages/appointments/AppointmentCheckoutPage";
import PaymentMethodsPage from "./pages/paymentMethods/PaymentMethodsPage";
import PaymentMethodFormPage from "./pages/paymentMethods/PaymentMethodFormPage";
import ReportsPage from "./pages/reports/ReportsPage";
//import UsersPage from "./pages/users/UsersPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-200">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRouter = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* 👇 Parent route + nested routes جوّه AdminLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* route الأساسية / → Dashboard */}
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="pos/history" element={<OrdersHistoryPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route
              path="appointments/create"
              element={<AppointmentFormPage />}
            />
            <Route
              path="appointments/edit/:id"
              element={<AppointmentFormPage />}
            />
            <Route
              path="appointments/checkout/:id"
              element={<AppointmentCheckoutPage />}
            />
            {/* مثال لروتس تانية هنضيفها بعدين */}
            <Route path="system/users" element={<UsersPage />} />
            <Route path="system/users/create" element={<UserFormPage />} />
            <Route path="system/users/edit/:id" element={<UserFormPage />} />

            {/* Roles CRUD */}
            <Route path="system/roles" element={<RolesPage />} />
            <Route path="system/roles/create" element={<RoleFormPage />} />
            <Route path="system/roles/edit/:id" element={<RoleFormPage />} />

            {/* Payment Methods */}
            <Route
              path="system/payment-methods"
              element={<PaymentMethodsPage />}
            />
            <Route
              path="system/payment-methods/create"
              element={<PaymentMethodFormPage />}
            />
            <Route
              path="system/payment-methods/edit/:id"
              element={<PaymentMethodFormPage />}
            />

            {/* Staff CRUD */}
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/create" element={<StaffFormPage />} />
            <Route path="staff/edit/:id" element={<StaffFormPage />} />

            {/* Customers CRUD */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/create" element={<CustomerFormPage />} />
            <Route path="customers/edit/:id" element={<CustomerFormPage />} />

            {/* Products CRUD */}
            <Route path="inventory/products" element={<ProductsPage />} />
            <Route
              path="inventory/products/create"
              element={<ProductFormPage />}
            />
            <Route
              path="inventory/products/edit/:id"
              element={<ProductFormPage />}
            />

            {/* Services CRUD */}
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/create" element={<ServiceFormPage />} />
            <Route path="services/edit/:id" element={<ServiceFormPage />} />

            {/* Packages */}
            <Route path="packages/plans" element={<PackagePlansPage />} />
            <Route
              path="packages/plans/create"
              element={<PackagePlanFormPage />}
            />
            <Route
              path="packages/plans/edit/:id"
              element={<PackagePlanFormPage />}
            />
            <Route
              path="packages/customers"
              element={<CustomerPackagesPage />}
            />
            <Route path="packages/usages" element={<PackageUsagesPage />} />

            {/* Rooms CRUD */}
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="rooms/create" element={<RoomFormPage />} />
            <Route path="rooms/edit/:id" element={<RoomFormPage />} />
            <Route path="rooms/types" element={<RoomTypesPage />} />
            <Route path="rooms/types/create" element={<RoomTypeFormPage />} />
            <Route path="rooms/types/edit/:id" element={<RoomTypeFormPage />} />

            {/* Shifts */}
            <Route path="shifts" element={<ShiftPage />} />
            <Route
              path="shifts/open"
              element={<Navigate to="/shifts" replace />}
            />
            <Route
              path="shifts/close"
              element={<Navigate to="/shifts" replace />}
            />
            <Route path="shifts/summary" element={<ShiftSummaryPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Routes>

        <Toaster />
      </AuthProvider>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </BrowserRouter>
);

export default AppRouter;
