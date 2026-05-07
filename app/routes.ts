import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("admin", "routes/admin.tsx"),
    route("escala", "routes/escala.tsx"),
    route("login", "routes/login.tsx"),
    route("logout", "routes/logout.tsx"),
    route("perfil", "routes/profile.tsx"),
    route("*", "routes/$.tsx"), // Rota curinga: captura URLs não mapeadas (ex: Chrome DevTools)
] satisfies RouteConfig;
