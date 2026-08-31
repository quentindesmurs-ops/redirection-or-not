import { useState } from "react";

const COLORS = ["#2B6CB0", "#0F9B8E"];

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

const VERDICT_COLOR = {
  keep: "#0F9B8E",
  watch: "#D69E2E",
  redirect: "#C1440E",
};

const VERDICT_WORD = {
  keep: "CONSERVER",
  watch: "SURVEILLER",
  redirect: "REDIRIGER",
};

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

  const rec = data?.recommendation;
  const smallerQueryCount = results.length === 2
    ? Math.min(results[0].topQueries.length, results[1].topQueries.length) || 1
    : 0;
  const overlapPercent = results.length === 2
    ? Math.round(((data?.commonQueries.length || 0) / smallerQueryCount) * 100)
    : 0;

  const CX = 150, CY = 150, R = 120;
  let needleAngleDeg = 90;
  if (rec) {
    needleAngleDeg = 180 - (rec.balance / 100) * 180;
  }
  const rad = (needleAngleDeg * Math.PI) / 180;
  const needleLen = R - 20;
  const needleX = CX + needleLen * Math.cos(rad);
  const needleY = CY - needleLen * Math.sin(rad);

  const polar = (angleDeg) => {
    const r = (angleDeg * Math.PI) / 180;
    return { x: CX + R * Math.cos(r), y: CY - R * Math.sin(r) };
  };
  const arcPath = (fromDeg, toDeg) => {
    const p1 = polar(fromDeg);
    const p2 = polar(toDeg);
    return `M${p1.x},${p1.y} A${R},${R} 0 0,1 ${p2.x},${p2.y}`;
  };

  return (
    <main className="wrap">
      <header className="masthead">
        <div>
          <div className="eyebrow">Outil interne — Uni-Médias</div>
          <h1 className="title">Comparateur de KPIs</h1>
        </div>
        <div className="meta">Source : Google Search Console</div>
      </header>

      <section className="panel controls">
        <h3>Articles à comparer</h3>
        {urls.map((url, i) => (
          <div className="url-row" key={i}>
            <span className="dot" style={{ background: COLORS[i % COLORS.length] || "#7C3AED" }} />
            <input
              type="text"
              placeholder="https://www.santemagazine.fr/..."
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
            />
            {urls.length > 1 && (
              <button className="icon-btn" onClick={() => removeUrl(i)}>×</button>
            )}
          </div>
        ))}
        {urls.length < 5 && (
          <button className="ghost-btn" onClick={addUrl}>+ Ajouter un article</button>
        )}

        <div className="date-row">
          <label>Du <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>Au <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>

        <button className="primary-btn" onClick={handleCompare} disabled={loading}>
          {loading ? "Chargement..." : "Comparer"}
        </button>

        {error && <p className="error">{error}</p>}
      </section>

      {results.length > 0 && (
        <>
          <section className="panel">
            <h2 className="panel-title">Performances</h2>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th className="num">Clics</th>
                  <th className="num">Impressions</th>
                  <th className="num">CTR</th>
                  <th className="num">Position moy.</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="article-cell">
                      <span className="dot" style={{ background: COLORS[i % COLORS.length] || "#7C3AED" }} />
                      <span className="url-text">{r.url}</span>
                    </td>
                    <td className={`num ${winners.clicks === i ? "win" : ""}`}>{formatNumber(r.clicks)}</td>
                    <td className={`num ${winners.impressions === i ? "win" : ""}`}>{formatNumber(r.impressions)}</td>
                    <td className={`num ${winners.ctr === i ? "win" : ""}`}>{r.ctr.toFixed(2)}%</td>
                    <td className={`num ${winners.position === i ? "win" : ""}`}>{r.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {results.length === 2 && (
            <section className="panel">
              <h2 className="panel-title">Comparaison des mots-clés</h2>
              <div className="metric-cards">
                <div className="metric-card">
                  <div className="metric-value">{overlapPercent}%</div>
                  <div className="metric-label">Chevauchement de mots-clés</div>
                  <div className="metric-desc">
                    Part des requêtes principales que les deux articles ont en commun.
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{data.commonQueries.length}</div>
                  <div className="metric-label">Requêtes communes</div>
                  <div className="metric-desc">
                    Sur les {results[0].topQueries.length + results[1].topQueries.length} requêtes principales analysées au total.
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">
                    {results[0].clicks > results[1].clicks ? "A" : "B"}
                  </div>
                  <div className="metric-label">Article le plus performant</div>
                  <div className="metric-desc">
                    Basé sur le nombre total de clics sur la période sélectionnée.
                  </div>
                </div>
              </div>

              <div className="queries-grid">
                {results.map((r, i) => (
                  <div className="query-box" key={i} style={{ borderColor: COLORS[i % COLORS.length] }}>
                    <div className="query-box-title" style={{ color: COLORS[i % COLORS.length] }}>
                      Top requêtes — Article {i === 0 ? "A" : "B"}
                    </div>
                    <ul>
                      {r.topQueries.slice(0, 6).map((q, qi) => (
                        <li key={qi}>
                          {q.query} <span className="muted">({formatNumber(q.clicks)} clics)</span>
                        </li>
                      ))}
                      {r.topQueries.length === 0 && <li className="muted">Aucune donnée</li>}
                    </ul>
                  </div>
                ))}
              </div>

              {data.commonQueries.length > 0 && (
                <div className="common-queries">
                  <div className="common-title">Requêtes communes</div>
                  <div className="chip-row">
                    {data.commonQueries.map((q, i) => (
                      <span className="chip" key={i}>{q}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {rec && (
            <section className="panel recommendation">
              <h2 className="panel-title">Recommandation</h2>

              <div className="gauge-block">
                <div className="gauge-svg-wrap">
                  <svg viewBox="0 0 300 175" className="gauge-svg">
                    <path d={arcPath(180, 123)} stroke="#C1440E" strokeWidth="20" fill="none" strokeLinecap="butt" />
                    <path d={arcPath(117, 63)} stroke="#0F9B8E" strokeWidth="20" fill="none" strokeLinecap="butt" />
                    <path d={arcPath(57, 0)} stroke="#C1440E" strokeWidth="20" fill="none" strokeLinecap="butt" />
                    <line
                      x1={CX} y1={CY} x2={needleX} y2={needleY}
                      stroke="#14213D" strokeWidth="3.5" strokeLinecap="round"
                    />
                    <circle cx={CX} cy={CY} r="8" fill="#14213D" />
                    <circle cx={CX} cy={CY} r="8" fill="none" stroke="white" strokeWidth="2" />
                  </svg>
                  <div className="gauge-center-label">
                    <span className="gauge-tag">Calcul automatique</span>
                    <div className="gauge-word" style={{ color: VERDICT_COLOR[rec.verdict] }}>
                      {VERDICT_WORD[rec.verdict]}
                    </div>
                    {rec.verdict === "redirect" && (
                      <div className="gauge-sub">{rec.loserLabel} → {rec.winnerLabel}</div>
                    )}
                  </div>
                </div>
                <div className="gauge-zone-labels">
                  <span>Rediriger B → A</span>
                  <span>Rediriger A → B</span>
                </div>
              </div>

              <div className="rec-headline" style={{ color: VERDICT_COLOR[rec.verdict] }}>
                {rec.headline}
              </div>
              <p className="rec-reason">{rec.reason}</p>

              <details className="rec-details">
                <summary>Voir le détail du calcul</summary>
                <div className="rec-columns">
                  <div>
                    <div className="rec-subtitle">Signaux détectés</div>
                    <ul className="rec-list">
                      {rec.signals.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="rec-subtitle">Suggestions</div>
                    <ul className="rec-list arrows">
                      {rec.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </details>

              <p className="rec-disclaimer">
                Recommandation calculée automatiquement à partir des données Search Console (mots-clés et trafic). Elle ne remplace pas une lecture éditoriale des deux articles.
              </p>
            </section>
          )}
        </>
      )}

      <style jsx global>{`
        :root {
          --ink: #14213D;
          --ink-soft: #5A6482;
          --paper: #F1F0EC;
          --paper-raised: #FFFFFF;
          --line: #DDE0DA;
          --accent: #C1440E;
        }
        * { box-sizing: border-box; }
        body {
          background: var(--paper);
          color: var(--ink);
          font-family: -apple-system, "Segoe UI", Inter, sans-serif;
        }
      `}</style>

      <style jsx>{`
        .wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
        .masthead {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 3px solid var(--ink); padding-bottom: 16px; margin-bottom: 24px;
          flex-wrap: wrap; gap: 8px;
        }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--accent); font-weight: 600; margin-bottom: 4px;
        }
        .title { font-size: 28px; margin: 0; font-weight: 700; }
        .meta { font-size: 12.5px; color: var(--ink-soft); }
        .panel {
          background: var(--paper-raised); border: 1px solid var(--line);
          border-radius: 10px; padding: 22px; margin-bottom: 20px;
        }
        .panel-title { font-size: 17px; margin: 0 0 16px; }
        .controls h3 { margin-top: 0; font-size: 15px; }
        .url-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .url-row input {
          flex: 1; padding: 9px 10px; border: 1px solid var(--line);
          border-radius: 6px; font-size: 13.5px;
        }
        .icon-btn {
          border: 1px solid var(--line); background: var(--paper); border-radius: 6px;
          width: 30px; height: 30px; cursor: pointer; font-size: 15px; color: var(--ink-soft);
        }
        .ghost-btn {
          border: 1px dashed var(--line); background: none; border-radius: 20px;
          padding: 6px 14px; font-size: 12.5px; color: var(--ink-soft); cursor: pointer; margin-top: 4px;
        }
        .date-row { display: flex; gap: 16px; margin: 16px 0; font-size: 13px; flex-wrap: wrap; }
        .date-row input { margin-left: 6px; padding: 5px 8px; border: 1px solid var(--line); border-radius: 6px; }
        .primary-btn {
          background: var(--ink); color: white; border: none; padding: 11px 22px;
          border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 600;
        }
        .primary-btn:disabled { opacity: 0.6; cursor: default; }
        .error { color: var(--accent); font-size: 13px; }

        table { width: 100%; border-collapse: collapse; }
        thead th {
          text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-soft); padding: 0 10px 10px; border-bottom: 2px solid var(--ink);
        }
        thead th.num, td.num { text-align: right; }
        tbody td { padding: 12px 10px; border-bottom: 1px solid var(--line); font-size: 13.5px; }
        .article-cell { display: flex; align-items: center; gap: 8px; max-width: 340px; }
        .url-text { font-size: 12px; word-break: break-all; color: var(--ink-soft); }
        td.win { font-weight: 700; color: #0F9B8E; }

        .metric-cards {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px; margin-bottom: 20px;
        }
        .metric-card { border: 1px solid var(--line); border-radius: 10px; padding: 16px; text-align: center; }
        .metric-value { font-size: 30px; font-weight: 700; color: var(--ink); }
        .metric-label { font-size: 12.5px; font-weight: 600; margin-top: 4px; }
        .metric-desc { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; line-height: 1.4; }

        .queries-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .query-box { border: 1px solid var(--line); border-left-width: 3px; border-radius: 8px; padding: 14px; }
        .query-box-title { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
        .query-box ul { margin: 0; padding-left: 18px; font-size: 12.5px; }
        .query-box li { margin-bottom: 3px; }
        .muted { color: var(--ink-soft); }

        .common-queries { border-top: 1px solid var(--line); padding-top: 14px; }
        .common-title { font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: #F4E1D8; color: var(--accent); padding: 4px 10px; border-radius: 14px; font-size: 12px; }

        .gauge-block { display: flex; flex-direction: column; align-items: center; margin-bottom: 12px; }
        .gauge-svg-wrap { position: relative; width: 260px; }
        .gauge-svg { width: 100%; height: auto; display: block; }
        .gauge-center-label {
          position: absolute; top: 52%; left: 0; right: 0;
          text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .gauge-tag {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
          background: var(--paper); border: 1px solid var(--line); color: var(--ink-soft);
          padding: 3px 10px; border-radius: 10px;
        }
        .gauge-word { font-size: 19px; font-weight: 800; letter-spacing: 0.02em; }
        .gauge-sub { font-size: 12px; color: var(--ink-soft); font-weight: 600; }
        .gauge-zone-labels {
          display: flex; justify-content: space-between; width: 250px;
          font-size: 10px; color: var(--ink-soft); opacity: 0.7; margin-top: 2px;
        }

        .rec-headline { font-size: 21px; font-weight: 700; text-align: center; margin-bottom: 6px; }
        .rec-reason { font-size: 14px; color: var(--ink-soft); line-height: 1.5; text-align: center; max-width: 560px; margin: 0 auto 14px; }

        .rec-details { margin: 14px 0 4px; }
        .rec-details summary { cursor: pointer; font-size: 12.5px; color: var(--ink-soft); font-weight: 600; }
        .rec-details[open] summary { margin-bottom: 14px; }
        .rec-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .rec-subtitle {
          font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;
          font-weight: 700; color: var(--ink-soft); margin-bottom: 8px;
        }
        .rec-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
        .rec-list.arrows { list-style: none; padding-left: 0; }
        .rec-list.arrows li::before { content: "→ "; color: var(--accent); font-weight: 700; }
        .rec-disclaimer {
          font-size: 11px; color: var(--ink-soft); border-top: 1px solid var(--line);
          padding-top: 12px; margin: 14px 0 0;
        }

        @media (max-width: 640px) {
          .queries-grid, .rec-columns { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
