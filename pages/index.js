import { useState } from "react";

const COLORS = ["#2B6CB0", "#0F9B8E", "#D69E2E", "#7C3AED", "#C1440E"];

function formatNumber(n) {
  return Math.round(n).toLocaleString("fr-FR");
}

function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() - 31);
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  const [urls, setUrls] = useState(["", ""]);
  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(defaultEnd());
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateUrl(index, value) {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
  }

  function addUrl() {
    if (urls.length < 5) setUrls([...urls, ""]);
  }

  function removeUrl(index) {
    setUrls(urls.filter((_, i) => i !== index));
  }

  async function handleCompare() {
    setError("");
    const cleanUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (cleanUrls.length < 1) {
      setError("Ajoute au moins une URL à comparer.");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: cleanUrls, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: "960px", margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ marginBottom: 4 }}>Comparateur de KPIs — Santé Magazine</h1>
      <p style={{ color: "#666", marginTop: 0 }}>Source : Google Search Console</p>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Articles à comparer</h3>
        {urls.map((url, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], alignSelf: "center" }} />
            <input
              type="text"
              placeholder="https://www.santemagazine.fr/..."
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              style={{ flex: 1, padding: 8 }}
            />
            {urls.length > 1 && (
              <button onClick={() => removeUrl(i)} style={{ padding: "0 10px" }}>×</button>
            )}
          </div>
        ))}
        {urls.length < 5 && <button onClick={addUrl} style={{ marginTop: 4 }}>+ Ajouter un article</button>}

        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          <label>Du <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>Au <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading}
          style={{ marginTop: 16, padding: "10px 20px", background: "#14213D", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "Chargement..." : "Comparer"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </section>

      {results && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #14213D", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Article</th>
              <th style={{ padding: 8 }}>Clics</th>
              <th style={{ padding: 8 }}>Impressions</th>
              <th style={{ padding: 8 }}>CTR</th>
              <th style={{ padding: 8 }}>Position moy.</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                  {r.url}
                </td>
                <td style={{ padding: 8 }}>{formatNumber(r.clicks)}</td>
                <td style={{ padding: 8 }}>{formatNumber(r.impressions)}</td>
                <td style={{ padding: 8 }}>{r.ctr.toFixed(2)}%</td>
                <td style={{ padding: 8 }}>{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
