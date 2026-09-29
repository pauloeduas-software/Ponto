import { useLoaderData } from "react-router";
import { requireUserId, getUser } from "../services/session.server";
import { getDashboardHistory, savePunchRecord, deletePunchRecord } from "../services/dashboardService.server";
import { DashboardView } from "../views/DashboardView";
import { isValidDate, parsePunchPayload, sanitizeObservation } from "../utils/validation.server";

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
  const date = formData.get("date");

  if (actionType === "delete") {
    if (!isValidDate(date)) return { error: "Data inválida." };
    await deletePunchRecord(userId, date);
    return { success: true };
  }

  if (actionType === "save") {
    const payload = parsePunchPayload(formData);
    if (!payload) return { error: "Dados inválidos." };
    await savePunchRecord(
      userId,
      payload.date,
      payload.punches,
      payload.workMins,
      payload.diffMins,
      payload.isOvertime ? 1 : 0,
      payload.goal,
      sanitizeObservation(formData.get("observation"))
    );
    return { success: true };
  }

  return null;
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  return <DashboardView {...data} />;
}
