import { useState } from "react";
import AuthPage from "./AuthPage.jsx";
import Dashboard from "./Dashboard.jsx";
import { getToken, setToken, clearToken } from "./api.js";

export default function App() {
  const [token, setTokenState] = useState(getToken());

  function handleLogin(newToken) {
    setToken(newToken);
    setTokenState(newToken);
  }

  function handleLogout() {
    clearToken();
    setTokenState(null);
  }

  return token ? <Dashboard onLogout={handleLogout} /> : <AuthPage onLogin={handleLogin} />;
}
