// Liste des propriétés Google Search Console disponibles dans l'outil.
// Pour en ajouter une nouvelle plus tard :
// 1. Ajoute gsc-reader@uni-medias-seo-tool.iam.gserviceaccount.com comme
//    utilisateur ("Accès limité" suffit) sur cette propriété dans Search Console
// 2. Ajoute une ligne ci-dessous avec un id, un label et l'URL exacte de la propriété
export const SITES = [
  { id: "santemagazine", label: "Santé Magazine", siteUrl: "https://www.santemagazine.fr/" },
  { id: "detentejardin", label: "Détente Jardin", siteUrl: "https://www.detentejardin.com/" },
  { id: "detoursenfrance", label: "Détours en France", siteUrl: "https://www.detoursenfrance.fr/" },
  { id: "maisoncreative", label: "Maison Créative (Merci pour l'Info)", siteUrl: "https://maisoncreative.mercipourlinfo.fr/" },
  { id: "mercipourlinfo", label: "Merci pour l'Info", siteUrl: "https://www.mercipourlinfo.fr/" },
  { id: "forumparents", label: "Forum Parents", siteUrl: "https://forum.parents.fr/" },
  { id: "momes", label: "Momes (Parents)", siteUrl: "https://momes.parents.fr/" },
  { id: "parents", label: "Parents", siteUrl: "https://www.parents.fr/" },
  { id: "regal", label: "Régal", siteUrl: "https://www.regal.fr/" },
];
