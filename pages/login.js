import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Mot de passe incorrect");
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <form onSubmit={handleSubmit} style={{ padding: "32px", border: "1px solid #ddd", borderRadius: "8px", width: "280px" }}>
        <h2 style={{ marginTop: 0 }}>Outil KPI Uni-Médias</h2>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
        />
        <button type="submit" style={{ width: "100%", padding: "8px" }}>
          Entrer
        </button>
        {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
      </form>
    </main>
  );
}
