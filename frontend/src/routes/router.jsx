import { lazy } from "react"
import { Route, Routes } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import DashboardLayout from "../layouts/DashboardLayout"
import RequireAuth from "./guards/RequireAuth"
import RequireModuleAccess from "./guards/RequireModuleAccess"
import HomeRedirect from "./HomeRedirect"
import Skeleton from "../components/ui/Skeleton"

const LoginPage = lazy(() => import("../pages/auth/LoginPage"))
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"))
const DashboardPage = lazy(() => import("../pages/app/DashboardPage"))
const PaseListaPage = lazy(() => import("../pages/app/PaseListaPage"))
const EntityPage = lazy(() => import("../pages/app/EntityPage"))
const ForbiddenPage = lazy(() => import("../pages/app/ForbiddenPage"))
const NotFoundPage = lazy(() => import("../pages/app/NotFoundPage"))

function PageFallback() {
  return <Skeleton lines={6} />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>

      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path="dashboard"
          element={
            <RequireModuleAccess moduleKey="dashboard">
              <DashboardPage />
            </RequireModuleAccess>
          }
        />
        <Route
          path="pase-lista"
          element={
            <RequireModuleAccess moduleKey="pase-lista">
              <PaseListaPage />
            </RequireModuleAccess>
          }
        />
        <Route path="sin-acceso" element={<ForbiddenPage />} />
        <Route path=":entityKey" element={<EntityPage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export { PageFallback }
