import "./app.css";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, Link, useLocation, useRouteLoaderData, useNavigation, useRevalidator } from "react-router";
import type { ShouldRevalidateFunction } from "react-router";
import { useEffect, useState } from "react";
import { Clock, Shield, CalendarClock, LayoutDashboard, Menu, Sun, Moon } from "lucide-react";
import { getUser } from "./services/session.server";
import { Avatar } from "./components/Avatar";

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  const cookieHeader = request.headers.get("Cookie");
  const theme = cookieHeader?.match(/theme=(light|dark)/)?.[1] || "dark";
  return { user, theme };
}

// Otimização: Evita revalidação desnecessária do root loader nas trocas normais de página.
// Revalida apenas se houver submissões de dados (mutações) ou se o usuário navegar
// de/para a página de perfil (onde pode atualizar dados da conta).
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
  actionResult
}) => {
  // Revalida se houve envio de formulário (mutações via POST, PUT, DELETE, etc)
  if (formMethod && formMethod !== "GET") {
    return true;
  }

  // Revalida se houver um resultado de action bem-sucedido
  if (actionResult) {
    return true;
  }

  // Revalida se navegar de ou para a página de perfil
  if (currentUrl.pathname === "/perfil" || nextUrl.pathname === "/perfil") {
    return true;
  }

  return false;
};

export const headers = () => ({
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
});

export const meta = () => [
  { title: "Ponto" },
  { name: "description", content: "Sistema de controle de jornada e gestão de escalas." },
];

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous" as const,
  },
  // Preload: o browser busca a fonte antes mesmo de processar o CSS
  {
    rel: "preload",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap",
    as: "style",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap",
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=3" },
];

function Sidebar({ user, expanded, onToggle }: { user: any; expanded: boolean; onToggle: () => void }) {
  const location = useLocation();
  const path = location.pathname;
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Sincroniza o estado inicial com o localStorage caso o cookie e local storage estejam diferentes
    const saved = localStorage.getItem("theme") || "dark";
    if (saved !== theme) {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const sections = [
    {
      label: "Principal",
      items: [
        { to: "/", label: "Bater Ponto", mobileLabel: "Ponto", icon: Clock, active: path === "/" },
        { to: "/escala", label: "Escala", mobileLabel: "Escala", icon: CalendarClock, active: path === "/escala" },
        { to: "/dashboard", label: "Meu Histórico", mobileLabel: "Histórico", icon: LayoutDashboard, active: path.includes("/dashboard") },
      ],
    },
    ...((user?.role === "admin" || user?.role === "manager")
      ? [{
          label: "Gestão",
          items: [
            { to: "/admin", label: "Relatório", mobileLabel: "Relatório", icon: Shield, active: path === "/admin" },
          ],
        }]
      : []),
  ];

  const roleLabel =
    user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : "Colaborador";

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-brand-link">
            <img src="/favicon.svg?v=3" alt="" className="sidebar-logo" />
            <span className="sidebar-brand-name">Ponto</span>
          </div>
        </div>

        <div className="sidebar-collapse-wrap">
          <button
            type="button"
            className="sidebar-collapse"
            onClick={onToggle}
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            data-tip={expanded ? "Recolher" : "Expandir"}
          >
            <Menu size={20} className="sidebar-icon" />
            <span className="sidebar-text">Recolher</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div className="sidebar-section" key={section.label}>
              <span className="sidebar-section-label">{section.label}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    prefetch="render"
                    className={`sidebar-link ${item.active ? 'active' : ''}`}
                    aria-label={item.label}
                    data-tip={item.label}
                  >
                    <Icon size={20} className="sidebar-icon" />
                    <span className="sidebar-text">{item.label}</span>
                    <span className="sidebar-mobile-label">{item.mobileLabel}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-link sidebar-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          data-tip={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        >
          {theme === "dark" ? <Sun size={22} className="sidebar-icon" /> : <Moon size={22} className="sidebar-icon" />}
          <span className="sidebar-text">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        </button>

        <Link
          to="/perfil"
          prefetch="render"
          className={`sidebar-link sidebar-profile ${path === '/perfil' ? 'active' : ''}`}
          aria-label="Minha Conta"
          data-tip="Minha Conta"
        >
          <Avatar src={user?.avatarUrl} name={user?.name} size={28} className="sidebar-avatar" />
          <span className="sidebar-profile-meta">
            <span className="sidebar-profile-name">{user?.name || "Minha Conta"}</span>
            <span className="sidebar-profile-role">{roleLabel}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function ProgressBar() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  return (
    <div className={`global-progress-bar ${active ? 'active' : ''}`} />
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // BUG FIX: Layout cannot use useLoaderData. useRouteLoaderData("root") is the correct hook here.
  const data = useRouteLoaderData("root") as { user: any, theme: string } | undefined;
  const isLoginPage = location.pathname === "/login";
  const theme = data?.theme || "dark";
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded") === "1";
    setSidebarExpanded(saved);
  }, []);

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-expanded", next ? "1" : "0");
      return next;
    });
  };

  return (
    <html lang="pt-BR" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#030712" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Meta />
        <Links />
      </head>
      <body>
        <ProgressBar />
        {!isLoginPage && <Sidebar user={data?.user} expanded={sidebarExpanded} onToggle={toggleSidebar} />}
        <div className="app-content" data-sidebar={sidebarExpanded ? "expanded" : "collapsed"}>
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { revalidate } = useRevalidator();

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    }

    function onFocus() {
      revalidate();
    }

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [revalidate]);

  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: any }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
