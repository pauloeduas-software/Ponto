import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";

import {
  User,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react";

import { registerUser, loginUser } from "../services/authService.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string || "").trim();
  const actionType = formData.get("_action");

  if (actionType === "register") {
    return registerUser(username, password, name);
  }

  // Fluxo de Login
  return loginUser(username, password);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Clock size={32} />
          </div>
          <h1>{isRegistering ? "Criar Conta" : "Entrar no Ponto"}</h1>
          <p>{isRegistering ? "Registre-se para começar a marcar seu ponto" : "Bem-vindo de volta! Acesse sua conta"}</p>
        </div>

        {actionData?.error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{actionData.error}</span>
          </div>
        )}

        <Form method="post" className="login-form">
          <input type="hidden" name="_action" value={isRegistering ? "register" : "login"} />

          {isRegistering && (
            <div className="input-field">
              <User size={18} />
              <input type="text" name="name" placeholder="Seu Nome Completo" required />
            </div>
          )}

          <div className="input-field">
            <User size={18} />
            <input type="text" name="username" placeholder="Nome de Usuário" required />
          </div>

          <div className="input-field">
            <Lock size={18} />
            <input type="password" name="password" placeholder="Sua Senha" required />
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : isRegistering ? (
              <><UserPlus size={18} /> Criar Conta</>
            ) : (
              <><LogIn size={18} /> Entrar</>
            )}
          </button>
        </Form>

        <div className="login-footer">
          <button onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Já tem uma conta? Entre aqui" : "Não tem uma conta? Crie agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
