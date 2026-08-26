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

function bestIndex(results, key, lowerIsBetter = false) {
  if (results.length < 2) return -1;
  const values = results.map((r) => r[key]);
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  if (values.every((v) => v === values[0])) return -1;
  return values.indexOf(best);
}

export default function Home() {
  const [urls, setUrls] = useState(["", ""]);
  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(defaultEnd());
  const [data, setData] = useState(null);
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
    setData(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: cleanUrls, startDate, endDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const results = data?.results || [];
  const winners = results.length
    ? {
        clicks: bestIndex(results, "clicks"),
        impressions: bestIndex(results, "impressions"),
        ctr: bestIndex(results, "ctr"),
        position: bestIndex(results, "position", true),
      }
    : {};

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
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

      {results.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 28 }}>
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
                  <td style={{ padding: 8, display: "flex", alignItems: "center", gap: 8, maxWidth: 320 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, wordBreak: "break-all" }}>{r.url}</span>
                  </td>
                  <td style={{ padding: 8, fontWeight: winners.clicks === i ? 700 : 400, color: winners.clicks === i ? "#2F855A" : "inherit" }}>
                    {formatNumber(r.clicks)} {winners.clicks === i && "🏆"}
                  </td>
                  <td style={{ padding: 8, fontWeight: winners.impressions === i ? 700 : 400, color: winners.impressions === i ? "#2F855A" : "inherit" }}>
                    {formatNumber(r.impressions)} {winners.impressions === i && "🏆"}
                  </td>
                  <td style={{ padding: 8, fontWeight: winners.ctr === i ? 700 : 400, color: winners.ctr === i ? "#2F855A" : "inherit" }}>
                    {r.ctr.toFixed(2)}% {winners.ctr === i && "🏆"}
                  </td>
                  <td style={{ padding: 8, fontWeight: winners.position === i ? 700 : 400, color: winners.position === i ? "#2F855A" : "inherit" }}>
                    {r.position.toFixed(1)} {winners.position === i && "🏆"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${results.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
            {results.map((r, i) => (
              <div key={i} style={{ border: `1px solid ${COLORS[i % COLORS.length]}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: COLORS[i % COLORS.length] }}>
                  Top requêtes — Article {i + 1}
                </div>
                {r.topQueries.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Aucune donnée</p>}
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {r.topQueries.slice(0, 5).map((q, qi) => (
                    <li key={qi}>{q.query} <span style={{ color: "#999" }}>({formatNumber(q.clicks)} clics)</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Requêtes communes entre les articles comparés
            </div>
            {data.commonQueries.length === 0 ? (
              <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
                Aucune requête commune trouvée dans le top 15 de chaque article — les articles semblent cibler des mots-clés différents.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.commonQueries.map((q, i) => (
                  <span key={i} style={{ background: "#F4E1D8", color: "#C1440E", padding: "4px 10px", borderRadius: 14, fontSize: 12.5 }}>
                    {q}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
