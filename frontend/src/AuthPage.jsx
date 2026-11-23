import { useState } from "react";
import { api } from "./api.js";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = isLogin
        ? await api.login(email.trim(), password)
        : await api.register(email.trim(), password);
      if (!data || !data.token) throw new Error("The server did not return a token.");
      onLogin(data.token);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError("");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand brand-lg">
          <span className="brand-mark">J</span> JobTracker
        </div>
        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {isLogin
            ? "Log in to see your job applications."
            : "Keep every application, interview and offer in one place."}
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="switch">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button type="button" className="link" onClick={switchMode}>
            {isLogin ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
