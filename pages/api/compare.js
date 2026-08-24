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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { urls, startDate, endDate } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Aucune URL fournie" });
  }

  const siteUrl = process.env.GSC_SITE_URL;

  try {
    const searchconsole = getClient();

    const results = await Promise.all(
      urls.map(async (url) => {
        const totalsResponse = await searchconsole.searchanalytics.query({
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

        const row = totalsResponse.data.rows?.[0];

        return {
          url,
          clicks: row?.clicks || 0,
          impressions: row?.impressions || 0,
          ctr: row ? row.ctr * 100 : 0,
          position: row?.position || 0,
        };
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erreur lors de la récupération des données" });
  }
}
