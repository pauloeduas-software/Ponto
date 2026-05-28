import { useLoaderData } from "react-router";
import { requireUserId, getUser } from "../services/session.server";
import type { User } from "../types";
import { getManagementData, handleManagementAction } from "../services/managementService.server";
import { ManagementView } from "../views/ManagementView";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as User;
  return await getManagementData(user);
}

export async function action({ request }: { request: Request }) {
  const user = await getUser(request) as User;
  const formData = await request.formData();
  return await handleManagementAction(user, formData);
}

export default function Management() {
  const data = useLoaderData<typeof loader>();
  return <ManagementView {...data} />;
}
