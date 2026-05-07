import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { db } from "../db.server";
import { createUserSession } from "../session.server";
import {
  User,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react";

import bcrypt from "bcryptjs";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const actionType = formData.get("_action");

  if (actionType === "register") {
    // Verifica se o usuário já existe
    const existing = db.prepare("SELECT id FROM User WHERE username = ?").get(username);
    if (existing) {
      return { error: "Este usuário já existe." };
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    db.prepare(
      "INSERT INTO User (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, username, hashedPassword, name, 'employee');

    return createUserSession({ userId, redirectTo: "/" });
  }

  // Fluxo de Login
  const user = db.prepare("SELECT * FROM User WHERE username = ?").get(username) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Usuário ou senha inválidos." };
  }

  return createUserSession({ userId: user.id, redirectTo: "/" });
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
