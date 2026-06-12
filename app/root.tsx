import "./app.css";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, Link, useLocation, useRouteLoaderData, useNavigation, useRevalidator } from "react-router";
import type { ShouldRevalidateFunction } from "react-router";
import { useEffect, useState, useMemo } from "react";
import { Clock, Shield, CalendarClock, LayoutDashboard, Calculator, User as UserIcon, Menu } from "lucide-react";
import { getUser } from "./services/session.server";
import { Avatar } from "./components/Avatar";

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  return { user };
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
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

function Sidebar({ user }: { user: any }) {
  const location = useLocation();
  const path = location.pathname;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <div className="sidebar-top">
        <button className="sidebar-toggle" onClick={() => setIsExpanded(!isExpanded)} title="Expandir menu">
          <Menu size={24} className="sidebar-icon" />
          {isExpanded && <span className="sidebar-text">Recolher</span>}
        </button>

        <div className="sidebar-nav">
          <Link to="/" prefetch="render" className={`sidebar-link ${path === '/' ? 'active' : ''}`} title="Bater Ponto">
            <Clock size={24} className="sidebar-icon" />
            {isExpanded && <span className="sidebar-text">Bater Ponto</span>}
          </Link>

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Link to="/admin" prefetch="render" className={`sidebar-link ${path === '/admin' ? 'active' : ''}`} title="Administrativo">
              <Shield size={24} className="sidebar-icon" />
              {isExpanded && <span className="sidebar-text">Administrativo</span>}
            </Link>
          )}

          <Link to="/escala" prefetch="render" className={`sidebar-link ${path === '/escala' ? 'active' : ''}`} title="Escala">
            <CalendarClock size={24} className="sidebar-icon" />
            {isExpanded && <span className="sidebar-text">Escala</span>}
          </Link>

          <Link to="/dashboard" prefetch="render" className={`sidebar-link ${path.includes('/dashboard') ? 'active' : ''}`} title="Meu Histórico">
            <LayoutDashboard size={24} className="sidebar-icon" />
            {isExpanded && <span className="sidebar-text">Meu Histórico</span>}
          </Link>

          <Link to="/simulador" prefetch="render" className={`sidebar-link ${path === '/simulador' ? 'active' : ''}`} title="Simulador de Horas">
            <Calculator size={24} className="sidebar-icon" />
            {isExpanded && <span className="sidebar-text">Simulador</span>}
          </Link>
        </div>
      </div>

      <div className="sidebar-bottom">
        <Link to="/perfil" prefetch="render" className={`sidebar-link ${path === '/perfil' ? 'active' : ''}`} title="Minha Conta">
          <Avatar src={user?.avatarUrl} name={user?.name} size={28} className="sidebar-avatar" />
          {isExpanded && <span className="sidebar-text">Minha Conta</span>}
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
  const data = useRouteLoaderData("root") as { user: any } | undefined;
  const isLoginPage = location.pathname === "/login";

  return (
    <html lang="pt-BR">
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
        {!isLoginPage && <Sidebar user={data?.user} />}
        {children}
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
