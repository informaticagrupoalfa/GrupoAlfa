import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import { NavLink, useLocation } from "react-router-dom"
import BrandLogo from "../ui/BrandLogo"
import { ENTITIES, ENTITY_ORDER } from "../../config/entities"
import { canAccessModuleWithRole } from "../../config/permissions"
import { useAuth } from "../../hooks/useAuth"

const lazyCrud = () => import("./CrudPanel.jsx")
const lazyHome = () => import("./DashboardHome.jsx")
const lazyUsuariosPage = () => import("../../pages/app/usuarios/UsuariosPage.jsx")
const lazyCapacitacionesPage = () => import("../../pages/app/capacitaciones/CapacitacionesPage.jsx")
const lazyMatriculacionesPage = () => import("../../pages/app/matriculaciones/MatriculacionesPage.jsx")
const lazyPaseLista = () => import("../../pages/app/pase-lista/PaseListaPage.jsx")
const lazyLlamarLista = () => import("../../pages/app/pase-lista/LlamarListaDocentePage.jsx")
const lazyInscripciones = () => import("../../pages/app/inscripciones/InscripcionesPage.jsx")
const lazyDataExplorer = () => import("../../pages/app/datos/DataExplorerPage.jsx")
const lazyEstudiantes = () => import("../../pages/app/estudiantes/EstudiantesPage.jsx")
const lazyMiInformacion = () => import("../../pages/app/mi-informacion/MiInformacionPage.jsx")

const PAGE_PRELOADS = {
  usuarios: lazyUsuariosPage,
  capacitaciones: lazyCapacitacionesPage,
  matriculaciones: lazyMatriculacionesPage,
  inscripciones: lazyInscripciones,
  "mi-informacion": lazyMiInformacion,
}

const STORAGE_KEY = "ga.sidebar.collapsed"
const MOBILE_QUERY = "(max-width: 900px)"

function readStoredCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handleChange = (event) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [query])

  return matches
}

function NavIcon({ name }) {
  const svgProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: "false",
  }

  switch (name) {
    case "dashboard":
      return (
        <svg {...svgProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case "usuarios":
      return (
        <svg {...svgProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "capacitaciones":
      return (
        <svg {...svgProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7h7" />
        </svg>
      )
    case "matriculaciones":
      return (
        <svg {...svgProps}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      )
    case "inscripciones":
      return (
        <svg {...svgProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 12v6" />
          <path d="M9 15h6" />
        </svg>
      )
    case "pase-lista":
    case "llamar-lista":
      return (
        <svg {...svgProps}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case "datos":
      return (
        <svg {...svgProps}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
        </svg>
      )
    case "estudiantes":
      return (
        <svg {...svgProps}>
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
        </svg>
      )
    case "mi-informacion":
      return (
        <svg {...svgProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2.5" />
          <path d="M5.5 17c.6-2 1.9-3 3.5-3s2.9 1 3.5 3" />
          <path d="M15 9h3" />
          <path d="M15 13h3" />
        </svg>
      )
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

NavIcon.propTypes = {
  name: PropTypes.string.isRequired,
}

export default function Sidebar() {
  const { loggedUser, activeRole } = useAuth()
  const location = useLocation()
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef(null)

  const isCollapsed = collapsed && !isMobile
  const visibleEntities = ENTITY_ORDER.filter(
    (key) => !ENTITIES[key].hideFromNav && canAccessModuleWithRole(loggedUser, activeRole, key),
  )

  const navItems = []
  if (canAccessModuleWithRole(loggedUser, activeRole, "dashboard")) {
    navItems.push({
      key: "dashboard",
      label: "Dashboard",
      to: "/app/dashboard",
      preload: lazyHome,
    })
  }
  if (canAccessModuleWithRole(loggedUser, activeRole, "mi-informacion")) {
    navItems.push({
      key: "mi-informacion",
      label: "Mi información",
      to: "/app/mi-informacion",
      preload: lazyMiInformacion,
    })
  }
  visibleEntities.forEach((key) => {
    navItems.push({
      key,
      label: ENTITIES[key].label,
      to: ENTITIES[key].path,
      preload: PAGE_PRELOADS[key] ?? lazyCrud,
    })
  })
  if (canAccessModuleWithRole(loggedUser, activeRole, "pase-lista")) {
    navItems.push({
      key: "pase-lista",
      label: "Pase de lista",
      to: "/app/pase-lista",
      preload: lazyPaseLista,
    })
  }
  if (canAccessModuleWithRole(loggedUser, activeRole, "llamar-lista")) {
    navItems.push({
      key: "llamar-lista",
      label: "Llamar lista",
      to: "/app/llamar-lista",
      preload: lazyLlamarLista,
    })
  }
  if (canAccessModuleWithRole(loggedUser, activeRole, "datos")) {
    navItems.push({
      key: "datos",
      label: "Explorador de datos",
      to: "/app/datos",
      preload: lazyDataExplorer,
    })
  }
  if (canAccessModuleWithRole(loggedUser, activeRole, "estudiantes")) {
    navItems.push({
      key: "estudiantes",
      label: "Estudiantes",
      to: "/app/estudiantes",
      preload: lazyEstudiantes,
    })
  }

  // Guarda la preferencia de escritorio sin tocar el modo drawer.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0")
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }, [collapsed])

  // Al navegar, el drawer móvil se cierra solo.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Si se vuelve a escritorio, el drawer deja de tener sentido.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  // Drawer móvil: Escape, bloqueo de scroll y foco inicial.
  useEffect(() => {
    if (!isMobile || !drawerOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMobile, drawerOpen])

  const sidebarClassName = [
    "sidebar",
    isCollapsed ? "is-collapsed" : "",
    isMobile && drawerOpen ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      {isMobile && !drawerOpen && (
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-controls="app-sidebar"
          aria-expanded={false}
        >
          <span className="sidebar-toggle-icon" aria-hidden="true" />
        </button>
      )}

      {isMobile && drawerOpen && (
        <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        className={sidebarClassName}
        aria-label="Barra de navegación lateral"
      >
        <div className="sidebar-brand">
          <BrandLogo size={isCollapsed ? 36 : 44} withName={!isCollapsed} />
          <button
            ref={closeButtonRef}
            className="sidebar-close"
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú de navegación"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav aria-label="Navegación principal">
          {navItems.map((item) => (
            <div key={item.key} className="nav-item-group">
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                data-label={item.label}
                aria-label={isCollapsed ? item.label : undefined}
                onMouseEnter={item.preload}
                onFocus={item.preload}
              >
                <span className="nav-item-icon">
                  <NavIcon name={item.key} />
                </span>
                <span className="nav-item-label">{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        {!isMobile && (
          <button
            className="sidebar-handle"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={isCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
            aria-controls="app-sidebar"
            aria-expanded={!isCollapsed}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d={isCollapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
            </svg>
          </button>
        )}
      </aside>
    </>
  )
}
