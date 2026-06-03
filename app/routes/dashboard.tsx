import { useLoaderData } from "react-router";
import { requireUserId, getUser } from "../services/session.server";
import { getDashboardHistory, savePunchRecord, deletePunchRecord } from "../services/dashboardService.server";
import { DashboardView } from "../views/DashboardView";

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  const url = new URL(request.url);
  const monthStr = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  return { user, history: await getDashboardHistory(userId, monthStr) };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  if (!user) return { error: "Usuário não encontrado" };

  const formData = await request.formData();
  const actionType = formData.get("_action");
  const date = formData.get("date") as string;

  if (actionType === "delete") {
    await deletePunchRecord(userId, date);
    return { success: true };
  }

  if (actionType === "save") {
    await savePunchRecord(
      userId,
      date,
      formData.get("punches") as string,
      parseInt(formData.get("workMins") as string),
      parseInt(formData.get("diffMins") as string),
      formData.get("isOvertime") === "true" ? 1 : 0,
      formData.get("goal") as string,
      formData.get("observation") as string || undefined
    );
    return { success: true };
  }

  return null;
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  return <DashboardView {...data} />;
}
