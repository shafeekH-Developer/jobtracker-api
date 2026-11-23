import { useEffect, useState } from "react";
import { api } from "./api.js";
import Icon from "./Icons.jsx";

const RESEND_SECONDS = 60;

const HEADINGS = {
  login: ["Welcome back", "Log in to see your job applications."],
  register: ["Create your account", "It's free. Start tracking your applications in a minute."],
  verify: ["Check your email", "Enter the 6-digit code we sent you to finish signing up."],
  forgot: ["Forgot your password?", "Enter your email and we'll send you a code to reset it."],
  reset: ["Choose a new password", "Enter the code from your email and a new password."],
};

export default function AuthPage({ onLogin, theme, onToggleTheme }) {
  const [screen, setScreen] = useState("login"); // login | register | verify | forgot | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Counts down the "resend code" wait.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function goTo(next, message = "") {
    setScreen(next);
    setError("");
    setNotice(message);
    setCode("");
    setNewPassword("");
    setShowPassword(false);
  }

  async function run(action) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    run(async () => {
      try {
        const data = await api.login(email.trim(), password);
        if (!data || !data.token) throw new Error("The server did not return a token.");
        onLogin(data.token);
      } catch (err) {
        if (err.data && err.data.needs_verification) {
          if (err.data.email) setEmail(err.data.email);
          goTo("verify", "Your email isn't verified yet. We sent you a new code.");
          setCooldown(RESEND_SECONDS);
          return;
        }
        throw err;
      }
    });
  }

  function handleRegister(e) {
    e.preventDefault();
    run(async () => {
      const data = await api.register(email.trim(), password);
      goTo("verify", data.message || "We sent you a 6-digit code.");
      setCooldown(RESEND_SECONDS);
    });
  }

  function handleVerify(e) {
    e.preventDefault();
    run(async () => {
      const data = await api.verifyEmail(email.trim(), code.trim());
      if (!data || !data.token) throw new Error("The server did not return a token.");
      onLogin(data.token);
    });
  }

  function handleResend(purpose) {
    if (cooldown > 0 || busy) return;
    run(async () => {
      await api.resendCode(email.trim(), purpose);
      setNotice("If that account exists, a new code is on its way.");
      setCooldown(RESEND_SECONDS);
    });
  }

  function handleForgot(e) {
    e.preventDefault();
    run(async () => {
      const data = await api.forgotPassword(email.trim());
      goTo("reset", data.message || "We sent you a reset code.");
      setCooldown(RESEND_SECONDS);
    });
  }

  function handleReset(e) {
    e.preventDefault();
    run(async () => {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setPassword("");
      goTo("login", "Your password was updated. Please log in with the new one.");
    });
  }

  const [heading, subheading] = HEADINGS[screen];
  const codeInput = (
    <label>
      6-digit code
      <input
        className="code-input"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        required
        autoFocus
      />
    </label>
  );

  const passwordToggle = (
    <button type="button" className="link small" onClick={() => setShowPassword((v) => !v)}>
      {showPassword ? "Hide" : "Show"}
    </button>
  );

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="brand brand-light">
          <span className="brand-mark">J</span> JobTracker
        </div>
        <div className="hero-body">
          <h2>Land your next job, <span>organised.</span></h2>
          <p>
            Keep every application, interview and follow-up in one place, so nothing slips
            through the cracks while you job hunt.
          </p>
          <ul className="hero-points">
            <li><Icon name="board" /> Drag applications across a visual board</li>
            <li><Icon name="bell" /> Reminders for interviews and follow-ups</li>
            <li><Icon name="chart" /> See your response and interview rates</li>
            <li><Icon name="download" /> Export everything to a spreadsheet</li>
          </ul>
        </div>
        <div className="hero-cards" aria-hidden="true">
          <div className="mini mini-1"><b>Frontend Developer</b><span className="dot s-interview" />Interview · Tomorrow</div>
          <div className="mini mini-2"><b>React Developer</b><span className="dot s-offer" />Offer received</div>
          <div className="mini mini-3"><b>UI Engineer</b><span className="dot s-applied" />Applied · Follow up Fri</div>
        </div>
      </section>

      <section className="auth-panel">
        <button className="icon-btn theme-btn" onClick={onToggleTheme} aria-label="Toggle dark mode">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>

        <div className="auth-card">
          <div className="brand auth-brand-mobile">
            <span className="brand-mark">J</span> JobTracker
          </div>
          <h1>{heading}</h1>
          <p className="muted">{subheading}</p>

          {notice && <div className="notice">{notice}</div>}

          {screen === "login" && (
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>
                <span className="label-row">
                  Password
                  <button type="button" className="link small" onClick={() => goTo("forgot")}>
                    Forgot password?
                  </button>
                </span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Please wait..." : "Log in"}
              </button>
              <p className="switch">
                New here?{" "}
                <button type="button" className="link" onClick={() => goTo("register")}>
                  Create an account
                </button>
              </p>
            </form>
          )}

          {screen === "register" && (
            <form onSubmit={handleRegister}>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>
                <span className="label-row">Password {passwordToggle}</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Please wait..." : "Sign up"}
              </button>
              <p className="switch">
                Already have an account?{" "}
                <button type="button" className="link" onClick={() => goTo("login")}>
                  Log in
                </button>
              </p>
            </form>
          )}

          {screen === "verify" && (
            <form onSubmit={handleVerify}>
              <p className="sent-to">
                Code sent to <b>{email}</b>
              </p>
              {codeInput}
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
                {busy ? "Verifying..." : "Verify email"}
              </button>
              <p className="switch">
                Didn't get it?{" "}
                <button type="button" className="link" onClick={() => handleResend("verify")} disabled={cooldown > 0 || busy}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
              <p className="switch">
                <button type="button" className="link" onClick={() => goTo("login")}>
                  Back to log in
                </button>
              </p>
            </form>
          )}

          {screen === "forgot" && (
            <form onSubmit={handleForgot}>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Sending..." : "Send reset code"}
              </button>
              <p className="switch">
                <button type="button" className="link" onClick={() => goTo("login")}>
                  Back to log in
                </button>
              </p>
            </form>
          )}

          {screen === "reset" && (
            <form onSubmit={handleReset}>
              <p className="sent-to">
                Code sent to <b>{email}</b>
              </p>
              {codeInput}
              <label>
                <span className="label-row">New password {passwordToggle}</span>
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
                {busy ? "Saving..." : "Update password"}
              </button>
              <p className="switch">
                Didn't get it?{" "}
                <button type="button" className="link" onClick={() => handleResend("reset")} disabled={cooldown > 0 || busy}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
              <p className="switch">
                <button type="button" className="link" onClick={() => goTo("login")}>
                  Back to log in
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
