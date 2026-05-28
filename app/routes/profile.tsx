import { useLoaderData, redirect } from "react-router";
import { db } from "../services/db.server";
import { requireUserId, getUser } from "../services/session.server";
import { ProfileView } from "../views/ProfileView";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as any;
  if (!user) throw redirect("/login");
  
  let team = null;
  if (user.teamId) {
    team = await db.prepare("SELECT name FROM Team WHERE id = ?").get(user.teamId);
  }

  return { 
    user, 
    team: team as { name: string } | null
  };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  
  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "updateAvatar") {
    const avatarData = formData.get("avatar") as string;
    await db.prepare("UPDATE User SET avatarUrl = ? WHERE id = ?").run(avatarData, userId);
    return { success: true, message: "Foto atualizada!" };
  }

  if (actionType === "updateName") {
    const name = formData.get("name") as string;
    await db.prepare("UPDATE User SET name = ? WHERE id = ?").run(name, userId);
    return { success: true, message: "Nome atualizado!" };
  }

  return null;
}

export default function Profile() {
  const data = useLoaderData<typeof loader>();
  return <ProfileView {...data} />;
}
