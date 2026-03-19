import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const serpApiKey = (process.env.SERPAPI_KEY || "").trim();
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",").map(x => x.trim()) }));
app.use(express.json({ limit: "1mb" }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sanare-radar-proxy', hasSerpApiKey: Boolean(serpApiKey) });
});

app.post('/api/serp/report', async (req, res) => {
  try {
    if (!serpApiKey) {
      return res.status(500).json({ error: 'Falta configurar SERPAPI_KEY en el archivo .env del backend.' });
    }

    const queries = Array.isArray(req.body?.queries) ? req.body.queries.map(q => String(q || '').trim()).filter(Boolean) : [];
    const resultsPerQuery = Math.max(1, Math.min(Number(req.body?.resultsPerQuery || 5), 10));

    if (!queries.length) {
      return res.status(400).json({ error: 'No llegaron consultas para procesar.' });
    }

    const allResults = [];
    const queryCount = {};

    for (const query of queries) {
      const payload = await fetchSerpApiQuery(query, serpApiKey, resultsPerQuery);
      const normalized = normalizeSerpResults(query, payload);
      allResults.push(...normalized);
      queryCount[query] = normalized.length;
    }

    res.json({
      ok: true,
      results: allResults,
      queryCount,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error al consultar SerpApi desde el backend.' });
  }
});

async function fetchSerpApiQuery(query, apiKey, num = 5) {
  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: apiKey,
    hl: 'es',
    gl: 'mx',
    google_domain: 'google.com.mx',
    num: String(num),
    no_cache: 'true'
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || payload?.message || `Error ${response.status} al consultar SerpApi.`);
  }

  return payload;
}

function normalizeSerpResults(query, payload) {
  const items = [];
  const organic = Array.isArray(payload?.organic_results) ? payload.organic_results : [];
  const news = Array.isArray(payload?.news_results) ? payload.news_results : [];

  for (const item of organic) {
    if (!item?.link) continue;
    items.push({
      id: crypto.randomUUID(),
      title: item.title || 'Resultado Google',
      link: item.link,
      snippet: item.snippet || item.rich_snippet?.top?.detected_extensions?.join(' · ') || 'Sin extracto disponible.',
      source: inferFuente(item.displayed_link || item.link, item.link),
      displayLink: item.displayed_link || inferDomain(item.link),
      query,
      matchedQueries: [query],
      urgency: 'Media',
      status: 'Pendiente',
      city: '',
      createdAt: new Date().toISOString()
    });
  }

  for (const item of news) {
    if (!item?.link) continue;
    items.push({
      id: crypto.randomUUID(),
      title: item.title || 'Noticia Google',
      link: item.link,
      snippet: item.snippet || 'Sin extracto disponible.',
      source: inferFuente(item.source || item.link, item.link),
      displayLink: item.source || inferDomain(item.link),
      query,
      matchedQueries: [query],
      urgency: 'Media',
      status: 'Pendiente',
      city: '',
      createdAt: new Date().toISOString()
    });
  }

  return items;
}

function inferFuente(source, link) {
  const text = `${source} ${link}`.toLowerCase();
  if (text.includes('facebook')) return 'Facebook';
  if (text.includes('linkedin')) return 'LinkedIn';
  if (text.includes('doctoralia')) return 'Directorio';
  if (text.includes('hospital') || text.includes('incan') || text.includes('medicasur')) return 'Hospital';
  return 'Google Search';
}

function inferDomain(link) {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'fuente-no-identificada';
  }
}

app.listen(port, () => {
  console.log(`Sanaré Radar Proxy corriendo en http://localhost:${port}`);
});
