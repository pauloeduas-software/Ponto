import { useLoaderData, redirect } from "react-router";

import { requireUserId, getUser } from "../services/session.server";
import { getAdminData } from "../services/adminService.server";
import { AdminView } from "../views/AdminView";


export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request);
  if (!user) return redirect("/login");
  
  const url = new URL(request.url);
  const selectedManagerTeamId = url.searchParams.get("teamFilter") || null;
  const monthStr = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  return getAdminData(user, selectedManagerTeamId, monthStr);
}

export default function Admin() {
  const data = useLoaderData<typeof loader>();
  return <AdminView {...data} />;
}
