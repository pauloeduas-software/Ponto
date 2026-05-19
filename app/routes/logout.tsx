import { logout } from "../services/session.server";

export async function action({ request }: { request: Request }) {
  return logout(request);
}

export async function loader() {
  return null;
}
