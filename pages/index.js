import { useState } from "react";

const BADGE_COLORS = ["#2B6CB0", "#0F9B8E", "#D69E2E", "#7C3AED", "#C1440E"];
const LETTERS = ["A", "B", "C", "D", "E"];

const VERDICT_COLOR = {
  keep: "#0F9B8E",
  watch: "#D69E2E",
  redirect: "#C1440E",
};

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

function ageLabel(dateStr) {
  if (!dateStr) return "Date inconnue";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Date inconnue";
  const days = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Date inconnue";
  if (days < 30) return `Publié il y a ${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Publié il y a ${months} mois`;
  const years = Math.floor(days / 365);
  return `Publié il y a ${years} an${years > 1 ? "s" : ""}`;
}

function VerdictIcon({ verdict, direction }) {
  const color = VERDICT_COLOR[verdict];
  if (verdict === "keep") {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (verdict === "watch") {
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: direction === "left" ? "scaleX(-1)" : "none" }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function RecommendationRing({ rec }) {
  const R = 95;
  const circumference = 2 * Math.PI * R;
  const fillRatio = (rec.confidence || 50) / 100;
  const dashoffset = circumference * (1 - fillRatio);
  const direction = rec.verdict === "redirect" && rec.loserLabel === "B" ? "left" : "right";

  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r={R} fill="none" stroke="#E7E5DF" strokeWidth="16" />
        <circle
          cx="110" cy="110" r={R} fill="none"
          stroke={VERDICT_COLOR[rec.verdict]} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <VerdictIcon verdict={rec.verdict} direction={direction} />
      </div>
    </div>
  );
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

  const rec = data?.recommendation;
  const isPair = results.length === 2;

  const smallerQueryCount = isPair
    ? Math.min(results[0].topQueries.length, results[1].topQueries.length) || 1
    : 0;
  const overlapPercent = isPair
    ? Math.round(((data?.commonQueries.length || 0) / smallerQueryCount) * 100)
    : 0;

  let loserIdx = null, winnerIdx = null, atRiskQueries = [], atRiskTotal = 0;
  if (isPair) {
    loserIdx = results[0].clicks <= results[1].clicks ? 0 : 1;
    winnerIdx = 1 - loserIdx;
    const winnerSet = new Set(results[winnerIdx].topQueries.map((q) => q.query));
    atRiskQueries = [...results[loserIdx].topQueries].sort((a, b) => b.clicks - a.clicks);
    atRiskTotal = atRiskQueries
      .filter((q) => !winnerSet.has(q.query))
      .reduce((sum, q) => sum + q.clicks, 0);
  }

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
            <span className="badge" style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}>
              {LETTERS[i] || "?"}
            </span>
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
        <p className="hint">📅 La date de publication de chaque article est détectée automatiquement.</p>

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
                      <span className="badge small" style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}>{LETTERS[i]}</span>
                      <div>
                        <div className="url-text">{r.url}</div>
                        <div className="age-text">{ageLabel(r.publishedDate)}</div>
                      </div>
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

          {isPair && (
            <section className="panel">
              <h2 className="panel-title">Comparaison des mots-clés</h2>
              <div className="metric-cards">
                <div className="metric-card">
                  <div className="metric-value">{overlapPercent}%</div>
                  <div className="metric-label">Chevauchement de mots-clés</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{data.commonQueries.length}</div>
                  <div className="metric-label">Requêtes communes</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{LETTERS[winnerIdx]}</div>
                  <div className="metric-label">Article le plus performant</div>
                </div>
              </div>

              <div className="queries-grid">
                {results.map((r, i) => (
                  <div className="query-box" key={i} style={{ borderColor: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                    <div className="query-box-title" style={{ color: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                      Top requêtes — Article {LETTERS[i]}
                    </div>
                    <ul>
                      {r.topQueries.slice(0, 6).map((q, qi) => (
                        <li key={qi}>{q.query} <span className="muted">({formatNumber(q.clicks)} clics)</span></li>
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

              <div className="risk-section">
                <h3 className="risk-heading">
                  ⚠️ Perte de trafic potentielle si {LETTERS[loserIdx]} est redirigé vers {LETTERS[winnerIdx]}
                </h3>
                <p className="risk-intro">
                  Requêtes qui rapportent des clics à l'article {LETTERS[loserIdx]} mais qui n'apparaissent pas dans le top de {LETTERS[winnerIdx]}.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Requête (Article {LETTERS[loserIdx]})</th>
                      <th className="num">Clics</th>
                      <th style={{ textAlign: "center" }}>Présente sur {LETTERS[winnerIdx]} ?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskQueries.map((q, i) => {
                      const winnerSet = new Set(results[winnerIdx].topQueries.map((x) => x.query));
                      const present = winnerSet.has(q.query);
                      return (
                        <tr key={i}>
                          <td>{q.query}</td>
                          <td className={`num ${present ? "" : "at-risk"}`}>{q.clicks}</td>
                          <td style={{ textAlign: "center" }} className={present ? "ok" : "at-risk"}>
                            {present ? "✓ Oui" : "✕ Non"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="risk-total">
                  <span>Total trafic à risque</span>
                  <span className="risk-total-value">{atRiskTotal} clics</span>
                </div>
              </div>
            </section>
          )}

          {rec && (
            <section className="panel recommendation">
              <h2 className="panel-title">Recommandation</h2>

              <div className="rec-body">
                <RecommendationRing rec={rec} />

                <div className="rec-headline" style={{ color: VERDICT_COLOR[rec.verdict] }}>
                  {rec.headline}
                </div>

                <div className="age-pills">
                  {results.map((r, i) => (
                    <span className="age-pill" key={i} style={{ background: `${BADGE_COLORS[i % BADGE_COLORS.length]}1A`, color: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                      {LETTERS[i]} — {ageLabel(r.publishedDate)}
                    </span>
                  ))}
                </div>

                <p className="rec-reason">{rec.reason}</p>

                <div className="rec-signals">
                  {rec.signals.map((s, i) => (
                    <div className="signal-row" key={i}>
                      <span className="signal-check" style={{ background: VERDICT_COLOR[rec.verdict] }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>

                <details className="rec-details">
                  <summary>Voir les actions recommandées</summary>
                  <ul className="rec-list arrows">
                    {rec.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </details>
              </div>

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
          --teal: #0F9B8E;
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

        .badge {
          width: 26px; height: 26px; border-radius: 6px; color: white; font-weight: 700;
          font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .badge.small { width: 20px; height: 20px; font-size: 10.5px; }

        .url-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .url-row input[type="text"] {
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
        .hint { font-size: 11.5px; color: var(--ink-soft); margin: 8px 0 0; }
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
        .article-cell { display: flex; align-items: flex-start; gap: 8px; max-width: 380px; }
        .url-text { font-size: 12px; word-break: break-all; color: var(--ink-soft); }
        .age-text { font-size: 11px; color: var(--accent); font-weight: 600; margin-top: 2px; }
        td.win { font-weight: 700; color: var(--teal); }

        .metric-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .metric-card { border: 1px solid var(--line); border-radius: 10px; padding: 16px; text-align: center; }
        .metric-value { font-size: 28px; font-weight: 700; color: var(--ink); }
        .metric-label { font-size: 12px; font-weight: 600; margin-top: 4px; color: var(--ink-soft); }

        .queries-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .query-box { border: 1px solid var(--line); border-left-width: 3px; border-radius: 8px; padding: 14px; }
        .query-box-title { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
        .query-box ul { margin: 0; padding-left: 18px; font-size: 12.5px; }
        .query-box li { margin-bottom: 3px; }
        .muted { color: var(--ink-soft); }

        .common-queries { border-top: 1px solid var(--line); padding-top: 14px; margin-bottom: 20px; }
        .common-title { font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: #F4E1D8; color: var(--accent); padding: 4px 10px; border-radius: 14px; font-size: 12px; }

        .risk-section { border-top: 1px solid var(--line); padding-top: 18px; }
        .risk-heading { font-size: 14.5px; margin: 0 0 4px; }
        .risk-intro { font-size: 12px; color: var(--ink-soft); margin: 0 0 12px; }
        td.at-risk { color: var(--accent); font-weight: 700; }
        td.ok { color: var(--teal); font-weight: 700; }
        .risk-total {
          margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line);
          display: flex; justify-content: space-between; align-items: center;
        }
        .risk-total span:first-child { font-size: 13px; font-weight: 700; }
        .risk-total-value { font-size: 20px; font-weight: 800; color: var(--accent); }

        .rec-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .rec-headline { font-size: 20px; font-weight: 700; text-align: center; }
        .age-pills { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .age-pill { font-size: 11.5px; font-weight: 600; padding: 4px 11px; border-radius: 14px; }
        .rec-reason {
          font-size: 13.5px; color: var(--ink-soft); line-height: 1.5; text-align: center;
          max-width: 460px; margin: 0;
        }
        .rec-signals { display: flex; flex-direction: column; gap: 9px; align-self: flex-start; margin-top: 6px; padding-left: 4px; }
        .signal-row { display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 600; color: var(--ink); }
        .signal-check {
          width: 18px; height: 18px; border-radius: 50%; color: white;
          display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0;
        }
        .rec-details { margin-top: 6px; align-self: flex-start; }
        .rec-details summary { cursor: pointer; font-size: 12.5px; color: var(--ink-soft); font-weight: 600; }
        .rec-details[open] summary { margin-bottom: 10px; }
        .rec-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
        .rec-list.arrows { list-style: none; padding-left: 0; }
        .rec-list.arrows li::before { content: "→ "; color: var(--accent); font-weight: 700; }
        .rec-disclaimer {
          font-size: 11px; color: var(--ink-soft); border-top: 1px solid var(--line);
          padding-top: 12px; margin: 18px 0 0;
        }

        @media (max-width: 640px) {
          .queries-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
