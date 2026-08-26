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
      rowLimit: 15,
    },
  });
  return (response.data.rows || []).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
  }));
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

    return res.status(200).json({ results, commonQueries });
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
