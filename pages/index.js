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
  const leftX = CX + R * Math.cos(Math.PI);
  const rightX = CX + R * Math.cos(0);

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
          <div
