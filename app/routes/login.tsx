import { useActionData } from "react-router";
import { registerUser, loginUser } from "../services/authService.server";
import { LoginView } from "../views/LoginView";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string || "").trim();
  const actionType = formData.get("_action");

  if (actionType === "register") {
    return registerUser(username, password, name);
  }

  return loginUser(username, password);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return <LoginView actionData={actionData} />;
}
