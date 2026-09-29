import { Form, useNavigation } from "react-router";
import { User, Lock, LogIn, Loader2, AlertCircle, Clock } from "lucide-react";

interface LoginViewProps {
  actionData: any;
}

export function LoginView({ actionData }: LoginViewProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Clock size={32} />
          </div>
          <h1>Entrar no Ponto</h1>
          <p>Bem-vindo de volta! Acesse sua conta</p>
        </div>

        {actionData?.error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{actionData.error}</span>
          </div>
        )}

        <Form method="post" className="login-form">
          <div className="input-field">
            <User size={18} />
            <input type="text" id="username-input" name="username" placeholder="Nome de Usuário" autoComplete="username" required />
          </div>

          <div className="input-field">
            <Lock size={18} />
            <input type="password" id="password-input" name="password" placeholder="Sua Senha" autoComplete="current-password" required />
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogIn size={18} /> Entrar</>}
          </button>
        </Form>
      </div>
    </div>
  );
}
