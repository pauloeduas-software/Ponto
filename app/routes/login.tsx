import { useActionData } from "react-router";
import { loginUser } from "../services/authService.server";
import { LoginView } from "../views/LoginView";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string;

  return loginUser(username, password);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return <LoginView actionData={actionData} />;
}
