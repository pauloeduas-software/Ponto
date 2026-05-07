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
  useRouteLoaderData
} from "react-router";
import { 
  Clock, 
  Shield, 
  CalendarClock, 
  LayoutDashboard,
  User as UserIcon
} from "lucide-react";
import { getUser } from "./session.server";

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  return { user };
}

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

function Sidebar({ user }: { user: any }) {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <aside className="sidebar">
      <Link to="/" className={`sidebar-link ${path === '/' ? 'active' : ''}`} title="Bater Ponto">
        <Clock size={32} />
      </Link>
      
      {user?.role === 'admin' && (
        <Link to="/admin" className={`sidebar-link ${path === '/admin' ? 'active' : ''}`} title="Administrativo">
          <Shield size={32} />
        </Link>
      )}

      <Link to="/escala" className={`sidebar-link ${path === '/escala' ? 'active' : ''}`} title="Escala">
        <CalendarClock size={32} />
      </Link>

      <Link to="/dashboard" className={`sidebar-link ${path.includes('/dashboard') ? 'active' : ''}`} title="Meu Histórico">
        <LayoutDashboard size={32} />
      </Link>

      <Link to="/perfil" className={`sidebar-link ${path === '/perfil' ? 'active' : ''}`} title="Minha Conta">
        {user?.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt="Perfil" 
            style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} 
          />
        ) : (
          <UserIcon size={32} />
        )}
      </Link>
    </aside>
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
