import "./app.css";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useLocation,
  useRouteLoaderData,
  useNavigation
} from "react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Shield,
  CalendarClock,
  LayoutDashboard,
  Calculator,
  User as UserIcon
} from "lucide-react";
import { getUser } from "./session.server";

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  return { user };
}

// Otimização: O root só revalida se houver mudança de página ou login/logout
// Evita que o auto-sync da Home fique recarregando os dados do usuário logado
// Otimização: Removida a trava de revalidação para garantir que mudanças de cargo reflitam na UI imediatamente
export function shouldRevalidate() {
  return true;
}

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
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap",
    as: "style",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap",
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

function Sidebar({ user }: { user: any }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="sidebar">
      <Link to="/" prefetch="intent" className={`sidebar-link ${path === '/' ? 'active' : ''}`} title="Bater Ponto">
        <Clock size={24} />
      </Link>

      {(user?.role === 'admin' || user?.role === 'manager') && (
        <Link to="/admin" prefetch="intent" className={`sidebar-link ${path === '/admin' ? 'active' : ''}`} title="Administrativo">
          <Shield size={24} />
        </Link>
      )}

      <Link to="/escala" prefetch="intent" className={`sidebar-link ${path === '/escala' ? 'active' : ''}`} title="Escala">
        <CalendarClock size={24} />
      </Link>

      <Link to="/dashboard" prefetch="intent" className={`sidebar-link ${path.includes('/dashboard') ? 'active' : ''}`} title="Meu Histórico">
        <LayoutDashboard size={24} />
      </Link>
      
      <Link to="/simulador" prefetch="intent" className={`sidebar-link ${path === '/simulador' ? 'active' : ''}`} title="Simulador de Horas">
        <Calculator size={24} />
      </Link>

      <Link to="/perfil" prefetch="intent" className={`sidebar-link ${path === '/perfil' ? 'active' : ''}`} title="Minha Conta">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt="Perfil"
            style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }}
          />
        ) : (
          <UserIcon size={24} />
        )}
      </Link>
    </aside>
  );
}

function ProgressBar() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        transition: "transform 200ms ease-in-out, opacity 200ms",
        opacity: active ? 1 : 0,
        transform: `scaleX(${active ? 1 : 0})`,
        transformOrigin: "left",
        background: "linear-gradient(90deg, var(--primary) 0%, #818cf8 100%)",
        boxShadow: "0 0 8px var(--primary)",
        pointerEvents: "none",
      }}
    />
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
