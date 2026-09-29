import { useLoaderData, redirect } from "react-router";
import type { ShouldRevalidateFunction } from "react-router";
import { requireUserId, getUser } from "../services/session.server";
import { type Shift } from "../types";
import { getEscalaData, saveShifts } from "../services/escalaService.server";
import { EscalaView } from "../views/EscalaView";

export const shouldRevalidate: ShouldRevalidateFunction = ({ formAction, defaultShouldRevalidate }) => {
  if (formAction === "/escala") return true;
  return defaultShouldRevalidate;
};

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request);
  if (!user) return redirect("/login");

  const url = new URL(request.url);
  const selectedTeamParam = url.searchParams.get("teamFilter") || null;
  return await getEscalaData(user, selectedTeamParam);
}

export async function action({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request);
  if (!user) return redirect("/login");

  const formData = await request.formData();
  const actionType = formData.get("action");
  const targetUserId = formData.get("userId") as string;

  if (actionType === "save") {
    let shifts: Shift[];
    try {
      shifts = JSON.parse(formData.get("shifts") as string);
    } catch {
      return { error: "Dados inválidos." };
    }
    const validShifts = Array.isArray(shifts) && shifts.length <= 500 && shifts.every(s =>
      s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && typeof s.type === "string" && s.type.length <= 50 &&
      (!s.startTime || /^[0-9:]{0,5}$/.test(s.startTime)) && (!s.endTime || /^[0-9:]{0,5}$/.test(s.endTime))
    );
    if (!targetUserId || !validShifts) return { error: "Dados inválidos." };
    return await saveShifts(user, targetUserId, shifts);
  }

  return null;
}

export default function Escala() {
  const data = useLoaderData<typeof loader>();
  return <EscalaView {...data} />;
}
