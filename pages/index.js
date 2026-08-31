import { google } from "googleapis";

function getClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.searchconsole({ version: "v1", auth });
}

async function fetchTotals(searchconsole, siteUrl, url, startDate, endDate) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      dimensionFilterGroups: [
        { filters: [{ dimension: "page", operator: "equals", expression: url }] },
      ],
    },
  });
  const row = response.data.rows?.[0];
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row ? row.ctr * 100 : 0,
    position: row?.position || 0,
  };
}

async function fetchTopQueries(searchconsole, siteUrl, url, startDate, endDate) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      dimensionFilterGroups: [
        { filters: [{ dimension: "page", operator: "equals", expression: url }] },
      ],
      rowLimit: 20,
    },
  });
  return (response.data.rows || []).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
  }));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function computeRecommendation(results, commonQueries) {
  if (results.length !== 2) return null;

  const [a, b] = results;
  const smallerQueryCount = Math.min(a.topQueries.length, b.topQueries.length) || 1;
  const overlapPercent = Math.round((commonQueries.length / smallerQueryCount) * 100);

  const totalClicks = a.clicks + b.clicks;
  const shareB = totalClicks > 0 ? b.clicks / totalClicks : 0.5;
  const skew = Math.abs(shareB - 0.5);

  const winnerCounts = { a: 0, b: 0 };
  if (a.clicks !== b.clicks) winnerCounts[a.clicks > b.clicks ? "a" : "b"]++;
  if (a.impressions !== b.impressions) winnerCounts[a.impressions > b.impressions ? "a" : "b"]++;
  if (a.ctr !== b.ctr) winnerCounts[a.ctr > b.ctr ? "a" : "b"]++;
  if (a.position !== b.position) winnerCounts[a.position < b.position ? "a" : "b"]++;

  const signals = [
    `${overlapPercent}% des requêtes principales sont communes`,
    `Article A : ${a.clicks} clics, Article B : ${b.clicks} clics`,
    `Article ${winnerCounts.a > winnerCounts.b ? "A" : "B"} gagne sur ${Math.max(winnerCounts.a, winnerCounts.b)} des 4 métriques SEO`,
  ];

  if (overlapPercent < 20) {
    return {
      verdict: "keep",
      confidence: clamp(Math.round(95 - overlapPercent * 2), 55, 95),
      headline: "Conserver les deux articles",
      reason: `Ces deux articles ne partagent que ${overlapPercent}% de leurs requêtes principales : ils répondent à des intentions de recherche différentes et se complètent plutôt qu'ils ne se concurrencent.`,
      signals,
      suggestions: [
        "Ajoutez un maillage interne entre les deux articles pour guider le lecteur de l'un vers l'autre",
        "Vérifiez que les titres et méta-descriptions reflètent bien deux angles distincts",
      ],
    };
  }

  if (skew < 0.15) {
    return {
      verdict: "watch",
      confidence: clamp(Math.round(70 - skew * 100), 50, 75),
      headline: "Conserver, mais surveiller la cannibalisation",
      reason: `${overlapPercent}% de requêtes communes et des performances proches entre les deux articles : ils se concurrencent probablement sur les mêmes résultats Google, sans qu'aucun ne prenne clairement le dessus.`,
      signals,
      suggestions: [
        "Différenciez plus nettement les angles ou les intentions de recherche couvertes par chaque article",
        "Envisagez de recentrer l'un des deux sur une requête plus spécifique et moins concurrente avec l'autre",
      ],
    };
  }

  const winnerIsB = shareB > 0.5;
  const winnerLabel = winnerIsB ? "B" : "A";
  const loserLabel = winnerIsB ? "A" : "B";
  const winnerClicks = winnerIsB ? b.clicks : a.clicks;
  const loserClicks = winnerIsB ? a.clicks : b.clicks;

  return {
    verdict: "redirect",
    confidence: clamp(Math.round(50 + skew * 90), 55, 95),
    winnerLabel,
    loserLabel,
    headline: `Rediriger l'article ${loserLabel} vers l'article ${winnerLabel}`,
    reason: `${overlapPercent}% de requêtes communes et l'article ${winnerLabel} capte nettement plus de trafic (${winnerClicks} clics contre ${loserClicks}). Le maintien des deux pages dilue probablement leur potentiel de positionnement.`,
    signals,
    suggestions: [
      `Avant toute redirection, vérifiez qu'aucune information utile de l'article ${loserLabel} n'est absente de l'article ${winnerLabel}`,
      `Mettez en place une redirection 301 de l'article ${loserLabel} vers l'article ${winnerLabel}`,
      `Renforcez l'article ${winnerLabel} avec le meilleur du contenu de l'article ${loserLabel} avant de rediriger`,
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { urls, startDate, endDate } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Aucune URL fournie" });
  }

  const siteUrl = (process.env.GSC_SITE_URL || "").trim();

  if (!siteUrl) {
    return res.status(500).json({ error: "GSC_SITE_URL n'est pas configuré sur le serveur." });
  }

  try {
    const searchconsole = getClient();

    const results = await Promise.all(
      urls.map(async (rawUrl) => {
        const url = rawUrl.trim();
        const [totals, topQueries] = await Promise.all([
          fetchTotals(searchconsole, siteUrl, url, startDate, endDate),
          fetchTopQueries(searchconsole, siteUrl, url, startDate, endDate),
        ]);
        return { url, ...totals, topQueries };
      })
    );

    const queryLists = results.map((r) => new Set(r.topQueries.map((q) => q.query)));
    const commonQueries = [
      ...queryLists.reduce((acc, set) => new Set([...acc].filter((q) => set.has(q)))),
    ];

    const recommendation = computeRecommendation(results, commonQueries);

    return res.status(200).json({ results, commonQueries, recommendation });
  } catch (error) {
    console.error(error);
    const detail =
      error?.response?.data?.error?.message ||
      error?.errors?.[0]?.message ||
      error.message ||
      "Erreur inconnue";
    return res
      .status(500)
      .json({ error: `Erreur Google : ${detail} (site interrogé : "${siteUrl}")` });
  }
}
