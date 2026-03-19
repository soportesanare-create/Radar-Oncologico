const STORAGE_KEY = 'sanare-radar-observaciones-v31';
const THEME_KEY = 'sanare-radar-theme';
const SEARCH_LOG_KEY = 'sanare-radar-search-log-v1';
const MONITOR_SETTINGS_KEY = 'sanare-radar-monitor-settings-v3';
const DAILY_REPORT_KEY = 'sanare-radar-daily-report-v1';

const defaultQueries = [
  'site:facebook.com/groups "cáncer de mama" "CDMX"',
  'site:facebook.com/groups "pacientes oncológicos" "México"',
  'site:linkedin.com/posts "oncología" "México"',
  'site:linkedin.com/posts "quimioterapia" "CDMX"',
  'site:linkedin.com/posts "centro de infusión" "México"',
  '"centro de infusión" "CDMX"',
  '"oncólogo" "Toluca"',
  '"quimioterapia" "privado" "México"'
];

const seedData = [
  {
    id: crypto.randomUUID(),
    grupo: 'Guerreras de Cáncer de Mama',
    linkPost: 'https://www.facebook.com/share/g/1FQe7aGkBW/',
    fuente: 'Facebook',
    ciudad: 'CDMX',
    categoria: 'Consulta oncológica',
    estatus: 'Pendiente',
    urgencia: 'Alta',
    contactoVisible: 'No',
    resumen: 'Grupo de apoyo con potencial de publicaciones donde familiares o pacientes solicitan orientación oncológica.',
    queryOrigin: 'site:facebook.com/groups "cáncer de mama" "CDMX"',
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    grupo: 'Pacientes Oncológicos',
    linkPost: 'https://www.facebook.com/share/g/1C9gvD8i9D/',
    fuente: 'Facebook',
    ciudad: 'México',
    categoria: 'Centro de infusión',
    estatus: 'En revisión',
    urgencia: 'Media',
    contactoVisible: 'No',
    resumen: 'Comunidad general útil para detectar intención de búsqueda de centros de infusión o apoyo logístico.',
    queryOrigin: 'site:facebook.com/groups "pacientes oncológicos" "México"',
    createdAt: new Date().toISOString()
  }
];

const els = {};
let currentSearchQuery = '';


document.addEventListener('DOMContentLoaded', () => {
  bindEls();
  bindNav();
  bindSearch();
  bindForm();
  bindFilters();
  bindMisc();
  bindTheme();
  bindMonitor();
  ensureSeed();
  renderAll();
  maybeAutoRunMonitor();
});

function bindTheme() {
  const buttons = document.querySelectorAll('.theme-btn');
  const savedTheme = localStorage.getItem(THEME_KEY) || 'original';
  applyTheme(savedTheme);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme || 'original';
      applyTheme(theme);
      localStorage.setItem(THEME_KEY, theme);
    });
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function bindEls() {
  els.query = document.getElementById('google-query');
  els.chips = document.getElementById('sample-chips');
  els.form = document.getElementById('obs-form');
  els.list = document.getElementById('obs-list');
  els.filterStatus = document.getElementById('filter-status');
  els.filterPriority = document.getElementById('filter-priority');
  els.total = document.getElementById('kpi-total');
  els.high = document.getElementById('kpi-high');
  els.pending = document.getElementById('kpi-pending');
  els.queryOrigin = document.getElementById('queryOrigin');
  els.monitorMaxResults = document.getElementById('monitor-max-results');
  els.monitorAutoRun = document.getElementById('monitor-auto-run');
  els.monitorResultsPerQuery = document.getElementById('monitor-results-per-query');
  els.backendApiUrl = document.getElementById('backend-api-url');
  els.serpApiKey = document.getElementById('serpapi-key');
  els.monitorStatusNote = document.getElementById('monitor-status-note');
  els.monitorStatusDetail = document.getElementById('monitor-status-detail');
  els.reportTotalSearches = document.getElementById('report-total-searches');
  els.reportTotalResults = document.getElementById('report-total-results');
  els.reportTotalSources = document.getElementById('report-total-sources');
  els.reportSummary = document.getElementById('report-summary');
  els.reportResults = document.getElementById('report-results');
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function bindSearch() {
  renderChips();
  document.getElementById('fill-samples').addEventListener('click', renderChips);
  document.getElementById('search-btn').addEventListener('click', () => ejecutarBusquedaEmbebida(true));
  document.getElementById('open-google').addEventListener('click', () => abrirEnGoogle(true));
  document.getElementById('send-to-form').addEventListener('click', pasarCapturaAObservacion);
  els.query.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ejecutarBusquedaEmbebida(true);
    }
  });
}

function renderChips() {
  els.chips.innerHTML = defaultQueries.map(query => `
    <button class="chip" data-query="${escapeAttr(query)}">${escapeHtml(query)}</button>
  `).join('');

  els.chips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      els.query.value = chip.dataset.query;
      ejecutarBusquedaEmbebida(true);
    });
  });
}

function ejecutarBusquedaEmbebida(trackSearch = false) {
  const query = els.query.value.trim();
  if (!query) return;
  if (trackSearch) registerSearchQuery(query, 'radar');
  const searchInput = document.querySelector('input.gsc-input');
  const searchButton = document.querySelector('button.gsc-search-button');
  if (searchInput && searchButton) {
    searchInput.value = query;
    searchButton.click();
    document.getElementById('busqueda-google').scrollIntoView({ behavior: 'smooth' });
  } else {
    abrirEnGoogle(false);
  }
}

function abrirEnGoogle(trackSearch = false) {
  const query = els.query.value.trim();
  if (!query) return;
  if (trackSearch) registerSearchQuery(query, 'google');
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
}

function registerSearchQuery(query, channel = 'manual') {
  currentSearchQuery = query;
  if (els.queryOrigin) els.queryOrigin.value = query;
  const logs = getSearchLogs();
  logs.unshift({
    id: crypto.randomUUID(),
    query,
    channel,
    createdAt: new Date().toISOString()
  });
  saveSearchLogs(logs.slice(0, 600));
}

function pasarCapturaAObservacion() {
  const link = document.getElementById('manual-link').value.trim();
  const source = document.getElementById('manual-source').value.trim();
  const note = document.getElementById('manual-note').value.trim();
  document.getElementById('grupo').value = source || 'Resultado web';
  document.getElementById('linkPost').value = link;
  document.getElementById('fuente').value = inferFuente(source, link);
  document.getElementById('resumen').value = note;
  if (els.queryOrigin && currentSearchQuery) els.queryOrigin.value = currentSearchQuery;
  document.getElementById('observaciones').scrollIntoView({ behavior: 'smooth' });
}

function inferFuente(source, link) {
  const text = `${source} ${link}`.toLowerCase();
  if (text.includes('facebook')) return 'Facebook';
  if (text.includes('linkedin')) return 'LinkedIn';
  if (text.includes('doctoralia')) return 'Directorio';
  if (text.includes('hospital') || text.includes('incan') || text.includes('medicasur')) return 'Hospital';
  return 'Google Search';
}

function bindForm() {
  els.form.addEventListener('submit', event => {
    event.preventDefault();
    const record = {
      id: crypto.randomUUID(),
      grupo: document.getElementById('grupo').value.trim(),
      linkPost: document.getElementById('linkPost').value.trim(),
      fuente: document.getElementById('fuente').value,
      ciudad: document.getElementById('ciudad').value.trim(),
      categoria: document.getElementById('categoria').value,
      estatus: document.getElementById('estatus').value,
      urgencia: document.getElementById('urgencia').value,
      contactoVisible: document.getElementById('contactoVisible').value,
      resumen: document.getElementById('resumen').value.trim(),
      queryOrigin: (els.queryOrigin?.value || currentSearchQuery || '').trim(),
      createdAt: new Date().toISOString()
    };

    const data = getData();
    data.unshift(record);
    saveData(data);
    els.form.reset();
    if (els.queryOrigin) els.queryOrigin.value = currentSearchQuery || '';
    renderAll();
    document.getElementById('fuentes').scrollIntoView({ behavior: 'smooth' });
  });
}

function bindFilters() {
  els.filterStatus.addEventListener('change', renderList);
  els.filterPriority.addEventListener('change', renderList);
}

function bindMisc() {
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('clear-storage').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    ensureSeed(true);
    renderAll();
  });
}

function bindMonitor() {
  loadMonitorSettingsToUI();
  document.getElementById('save-monitor-settings').addEventListener('click', saveMonitorSettingsFromUI);
  document.getElementById('run-daily-monitor').addEventListener('click', runDailyMonitor);
  document.getElementById('export-daily-report').addEventListener('click', exportDailyReport);
}

function ensureSeed(force = false) {
  const data = getData();
  if (!data.length || force) saveData(seedData);
}

function getData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSearchLogs() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSearchLogs(data) {
  localStorage.setItem(SEARCH_LOG_KEY, JSON.stringify(data));
}

function getMonitorSettings() {
  try {
    return JSON.parse(localStorage.getItem(MONITOR_SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMonitorSettings(settings) {
  localStorage.setItem(MONITOR_SETTINGS_KEY, JSON.stringify(settings));
}

function loadMonitorSettingsToUI() {
  const settings = {
    maxResults: '5',
    resultsPerQuery: '5',
    autoRun: 'off',
    backendApiUrl: '',
    serpApiKey: '',
    ...getMonitorSettings()
  };
  if (els.monitorMaxResults) els.monitorMaxResults.value = String(settings.maxResults || '5');
  if (els.monitorResultsPerQuery) els.monitorResultsPerQuery.value = String(settings.resultsPerQuery || '5');
  if (els.monitorAutoRun) els.monitorAutoRun.value = settings.autoRun || 'off';
  if (els.backendApiUrl) els.backendApiUrl.value = settings.backendApiUrl || '';
  if (els.serpApiKey) els.serpApiKey.value = settings.serpApiKey || '';
  updateMonitorStatusNote();
}

function saveMonitorSettingsFromUI(notify = true) {
  const settings = {
    maxResults: Number(els.monitorMaxResults?.value || 5),
    resultsPerQuery: Number(els.monitorResultsPerQuery?.value || 5),
    autoRun: els.monitorAutoRun?.value || 'off',
    backendApiUrl: (els.backendApiUrl?.value || '').trim().replace(/\/$/, ''),
    serpApiKey: (els.serpApiKey?.value || '').trim()
  };
  saveMonitorSettings(settings);
  updateMonitorStatusNote();
  if (notify) alert('Configuración del reporte diario guardada.');
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function updateMonitorStatusNote(extraMessage = '') {
  if (!els.monitorStatusNote) return;
  const settings = getMonitorSettings();
  const hasProxy = Boolean(settings.backendApiUrl);
  const hasDirectKey = Boolean(settings.serpApiKey);
  els.monitorStatusNote.textContent = hasProxy
    ? 'Modo actual: backend proxy activado para snippets automáticos.'
    : hasDirectKey
      ? 'Modo actual: snippets directos por SERP API activados (solo pruebas).'
      : 'Modo actual: reporte manual sin snippets automáticos.';
  if (els.monitorStatusDetail) {
    els.monitorStatusDetail.textContent = extraMessage || (hasProxy
      ? 'Listo para consultar snippets vía backend sin exponer la key en el navegador.'
      : hasDirectKey
        ? 'Prueba rápida activada. Si el navegador bloquea la llamada, usa el backend proxy recomendado.'
        : 'Puedes generar el reporte en modo manual o pegar la URL de tu backend proxy para enriquecerlo con extractos automáticos.');
  }
}


function getQueriesForMonitorToday() {
  const todayLogs = getSearchLogs().filter(item => isSameDay(item.createdAt, new Date().toISOString()));
  const unique = [];
  const seen = new Set();
  todayLogs.forEach(item => {
    const query = (item.query || '').trim();
    if (!query || seen.has(query)) return;
    seen.add(query);
    unique.push(query);
  });
  return unique.length ? unique : [...defaultQueries];
}


async function fetchProxyReportData(backendApiUrl, queries, resultsPerQuery = 5) {
  const url = `${backendApiUrl.replace(/\/$/, '')}/api/serp/report`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ queries, resultsPerQuery })
    });
  } catch (error) {
    throw new Error('No se pudo conectar con el backend proxy. Revisa la URL y que el servidor esté corriendo.');
  }

  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || payload?.message || `Error ${response.status} del backend proxy.`);
  }

  if (!payload || !Array.isArray(payload.results)) {
    throw new Error('El backend respondió sin resultados válidos.');
  }

  return payload;
}

async function buildDailyReportFromProxy(backendApiUrl, maxHighlights = 5, resultsPerQuery = 5) {
  const todayKey = getTodayKey();
  const nowIso = new Date().toISOString();
  const observationsToday = getData().filter(item => isSameDay(item.createdAt, nowIso));
  const searchLogsToday = getSearchLogs().filter(item => isSameDay(item.createdAt, nowIso));
  const queries = getQueriesForMonitorToday();

  const proxyPayload = await fetchProxyReportData(backendApiUrl, queries, resultsPerQuery);
  const fetched = Array.isArray(proxyPayload.results) ? proxyPayload.results : [];
  const queryCount = proxyPayload.queryCount || {};

  const combined = [...fetched];
  observationsToday.forEach(item => {
    if (!item?.linkPost) return;
    combined.push({
      id: item.id,
      title: item.grupo || 'Hallazgo manual',
      link: item.linkPost || '',
      snippet: item.resumen || 'Sin nota manual.',
      source: item.fuente || inferDomain(item.linkPost || ''),
      displayLink: inferDomain(item.linkPost || '') || (item.fuente || 'fuente-manual'),
      query: (item.queryOrigin || '').trim() || 'Sin consulta origen',
      matchedQueries: (item.queryOrigin || '').trim() ? [item.queryOrigin.trim()] : [],
      urgency: item.urgencia || 'Media',
      status: item.estatus || 'Pendiente',
      city: item.ciudad || '',
      createdAt: item.createdAt
    });
  });

  const dedupedMap = new Map();
  combined.forEach(item => {
    const normalizedLink = (item.link || '').trim() || `sin-link-${item.id}`;
    const existing = dedupedMap.get(normalizedLink);
    if (!existing) {
      dedupedMap.set(normalizedLink, { ...item });
      return;
    }
    const mergedQueries = new Set([...(existing.matchedQueries || []), ...(item.matchedQueries || []), item.query, existing.query].filter(Boolean));
    existing.matchedQueries = Array.from(mergedQueries);
    if ((item.snippet || '').length > (existing.snippet || '').length) existing.snippet = item.snippet;
    if (existing.source === 'Google Search' && item.source !== 'Google Search') existing.source = item.source;
    if ((existing.title || '').length < (item.title || '').length) existing.title = item.title;
    if (existing.query === 'Sin consulta origen' && item.query) existing.query = item.query;
  });

  const results = Array.from(dedupedMap.values()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const topResults = results.slice(0, Math.max(1, maxHighlights));
  const sourcesCount = countBy(results, 'source');
  const observationsByQuery = countBy(observationsToday.filter(item => (item.queryOrigin || '').trim()), 'queryOrigin');
  const topSources = Object.entries(sourcesCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);
  const topQueries = Object.entries(queryCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);
  const topTrackedQueries = Object.entries(observationsByQuery).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);

  const summary = [
    `Se corrieron ${queries.length} consultas en el monitoreo del día y se obtuvieron ${results.length} hallazgos únicos con extracto automático cuando estuvo disponible.`,
    observationsToday.length
      ? `Además se incorporaron ${observationsToday.length} observaciones manuales para enriquecer el reporte.`
      : 'No hubo observaciones manuales adicionales hoy.',
    topSources.length
      ? `Las fuentes con más señales fueron: ${topSources.join(', ')}.`
      : 'Aún no se detectan fuentes dominantes.',
    topQueries.length
      ? `Las consultas con más resultados útiles fueron: ${topQueries.join(', ')}.`
      : 'No hubo suficientes resultados para destacar consultas.',
    topTrackedQueries.length
      ? `Las consultas con más observaciones guardadas fueron: ${topTrackedQueries.join(', ')}.`
      : 'Todavía no hay observaciones manuales asociadas a consultas origen.'
  ].join(' ');

  return {
    dateKey: todayKey,
    generatedAt: nowIso,
    totalSearches: queries.length,
    totalResults: results.length,
    totalSources: Object.keys(sourcesCount).length,
    searchLogsToday: searchLogsToday.length,
    observationMatches: observationsToday.length,
    sourcesCount,
    queryCount,
    observationsByQuery,
    summary,
    mode: 'proxy',
    results: topResults
  };
}

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

  const endpoints = [
    `https://serpapi.com/search.json?${params.toString()}`,
    `https://serpapi.com/search?${params.toString()}&output=json`
  ];

  let lastError = null;
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timer);
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok || payload?.error) {
        const message = payload?.error || payload?.message || `Error ${response.status} al consultar SERP API`;
        throw new Error(message);
      }
      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new Error('La consulta tardó demasiado. Revisa tu conexión o intenta con menos resultados por búsqueda.');
  }

  if (lastError instanceof TypeError) {
    throw new Error('El navegador bloqueó la consulta a SerpApi o no hubo conexión. Prueba desde GitHub Pages/publicado, revisa F12 > Console, o usa modo manual.');
  }

  throw lastError || new Error('No se pudo consultar SERP API.');
}


function normalizeSerpResults(query, payload) {
  const items = [];
  const organic = Array.isArray(payload?.organic_results) ? payload.organic_results : [];
  const news = Array.isArray(payload?.news_results) ? payload.news_results : [];

  organic.forEach(item => {
    if (!item?.link) return;
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
  });

  news.forEach(item => {
    if (!item?.link) return;
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
  });

  return items;
}

async function buildDailyReportFromSerpApi(apiKey, maxHighlights = 5, resultsPerQuery = 5) {
  const todayKey = getTodayKey();
  const nowIso = new Date().toISOString();
  const observationsToday = getData().filter(item => isSameDay(item.createdAt, nowIso));
  const searchLogsToday = getSearchLogs().filter(item => isSameDay(item.createdAt, nowIso));
  const queries = getQueriesForMonitorToday();

  const fetched = [];
  const queryCount = {};
  for (const query of queries) {
    const payload = await fetchSerpApiQuery(query, apiKey, resultsPerQuery);
    const normalized = normalizeSerpResults(query, payload);
    fetched.push(...normalized);
    queryCount[query] = normalized.length;
  }

  const combined = [...fetched];
  observationsToday.forEach(item => {
    if (!item?.linkPost) return;
    combined.push({
      id: item.id,
      title: item.grupo || 'Hallazgo manual',
      link: item.linkPost || '',
      snippet: item.resumen || 'Sin nota manual.',
      source: item.fuente || inferDomain(item.linkPost || ''),
      displayLink: inferDomain(item.linkPost || '') || (item.fuente || 'fuente-manual'),
      query: (item.queryOrigin || '').trim() || 'Sin consulta origen',
      matchedQueries: (item.queryOrigin || '').trim() ? [item.queryOrigin.trim()] : [],
      urgency: item.urgencia || 'Media',
      status: item.estatus || 'Pendiente',
      city: item.ciudad || '',
      createdAt: item.createdAt
    });
  });

  const dedupedMap = new Map();
  combined.forEach(item => {
    const normalizedLink = (item.link || '').trim() || `sin-link-${item.id}`;
    const existing = dedupedMap.get(normalizedLink);
    if (!existing) {
      dedupedMap.set(normalizedLink, { ...item });
      return;
    }
    const mergedQueries = new Set([...(existing.matchedQueries || []), ...(item.matchedQueries || []), item.query, existing.query].filter(Boolean));
    existing.matchedQueries = Array.from(mergedQueries);
    if ((item.snippet || '').length > (existing.snippet || '').length) existing.snippet = item.snippet;
    if (existing.source === 'Google Search' && item.source !== 'Google Search') existing.source = item.source;
    if ((existing.title || '').length < (item.title || '').length) existing.title = item.title;
    if (existing.query === 'Sin consulta origen' && item.query) existing.query = item.query;
  });

  const results = Array.from(dedupedMap.values()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const topResults = results.slice(0, Math.max(1, maxHighlights));
  const sourcesCount = countBy(results, 'source');
  const observationsByQuery = countBy(observationsToday.filter(item => (item.queryOrigin || '').trim()), 'queryOrigin');
  const topSources = Object.entries(sourcesCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);
  const topQueries = Object.entries(queryCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);
  const topTrackedQueries = Object.entries(observationsByQuery).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>`${name} (${count})`);

  const summary = [
    `Se corrieron ${queries.length} consultas en el monitoreo del día y se obtuvieron ${results.length} hallazgos únicos con extracto automático cuando estuvo disponible.`,
    observationsToday.length
      ? `Además se incorporaron ${observationsToday.length} observaciones manuales para enriquecer el reporte.`
      : 'No hubo observaciones manuales adicionales hoy.',
    topSources.length
      ? `Las fuentes con más señales fueron: ${topSources.join(', ')}.`
      : 'Aún no se detectan fuentes dominantes.',
    topQueries.length
      ? `Las consultas con más resultados útiles fueron: ${topQueries.join(', ')}.`
      : 'No hubo suficientes resultados para destacar consultas.',
    topTrackedQueries.length
      ? `Las consultas con más observaciones guardadas fueron: ${topTrackedQueries.join(', ')}.`
      : 'Todavía no hay observaciones manuales asociadas a consultas origen.'
  ].join(' ');

  return {
    dateKey: todayKey,
    generatedAt: nowIso,
    totalSearches: queries.length,
    totalResults: results.length,
    totalSources: Object.keys(sourcesCount).length,
    searchLogsToday: searchLogsToday.length,
    observationMatches: observationsToday.length,
    sourcesCount,
    queryCount,
    observationsByQuery,
    summary,
    mode: 'serpapi',
    results: topResults
  };
}

function getDailyReportStore() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_REPORT_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDailyReportForDate(dateKey, report) {
  const store = getDailyReportStore();
  store[dateKey] = report;
  localStorage.setItem(DAILY_REPORT_KEY, JSON.stringify(store));
}

function getDailyReportForDate(dateKey = getTodayKey()) {
  const store = getDailyReportStore();
  return store[dateKey] || null;
}

function maybeAutoRunMonitor() {
  renderDailyReport();
  const settings = getMonitorSettings();
  if ((settings.autoRun || 'off') !== 'on') return;
  const today = getTodayKey();
  const existing = getDailyReportForDate(today);
  if (!existing) {
    runDailyMonitor(true);
  }
}

async function runDailyMonitor(silent = false) {
  saveMonitorSettingsFromUI(!silent);
  const settings = getMonitorSettings();

  const runBtn = document.getElementById('run-daily-monitor');
  const originalText = runBtn.textContent;
  runBtn.disabled = true;
  runBtn.textContent = 'Generando...';

  try {
    updateMonitorStatusNote(settings.backendApiUrl
      ? 'Consultando backend proxy y consolidando resultados del día...'
      : settings.serpApiKey
        ? 'Consultando SerpApi y consolidando resultados del día...'
        : 'Generando reporte manual consolidado...');
    const report = settings.backendApiUrl
      ? await buildDailyReportFromProxy(settings.backendApiUrl, Number(settings.maxResults) || 5, Number(settings.resultsPerQuery) || 5)
      : settings.serpApiKey
        ? await buildDailyReportFromSerpApi(settings.serpApiKey, Number(settings.maxResults) || 5, Number(settings.resultsPerQuery) || 5)
        : buildDailyReportFromManualFlow(Number(settings.maxResults) || 5);
    saveDailyReportForDate(getTodayKey(), report);
    renderDailyReport();
    document.getElementById('reporte-diario').scrollIntoView({ behavior: 'smooth' });
    updateMonitorStatusNote(settings.backendApiUrl
      ? 'Reporte generado correctamente con snippets automáticos vía backend.'
      : settings.serpApiKey
        ? 'Reporte generado correctamente con snippets automáticos.'
        : 'Reporte manual generado correctamente.');
    if (!silent) alert(settings.backendApiUrl
      ? 'Reporte diario generado con snippets automáticos vía backend.'
      : settings.serpApiKey
        ? 'Reporte diario generado con snippets automáticos.'
        : 'Reporte diario generado correctamente.');
  } catch (error) {
    console.error(error);
    updateMonitorStatusNote(`Error al generar el reporte: ${error.message}`);
    if (!silent) alert(`No se pudo generar el reporte: ${error.message}`);
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = originalText;
  }
}

function inferDomain(link) {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'fuente-no-identificada';
  }
}

function buildDailyReportFromManualFlow(maxHighlights = 5) {
  const todayKey = getTodayKey();
  const nowIso = new Date().toISOString();
  const observationsToday = getData().filter(item => isSameDay(item.createdAt, nowIso));
  const searchLogsToday = getSearchLogs().filter(item => isSameDay(item.createdAt, nowIso));

  const dedupedMap = new Map();
  observationsToday.forEach(item => {
    const normalizedLink = (item.linkPost || '').trim() || `sin-link-${item.id}`;
    const existing = dedupedMap.get(normalizedLink);
    const queryOrigin = (item.queryOrigin || '').trim();
    if (!existing) {
      dedupedMap.set(normalizedLink, {
        id: item.id,
        title: item.grupo || 'Hallazgo manual',
        link: item.linkPost || '',
        snippet: item.resumen || 'Sin nota manual.',
        source: item.fuente || inferDomain(item.linkPost || ''),
        displayLink: inferDomain(item.linkPost || '') || (item.fuente || 'fuente-manual'),
        query: queryOrigin || 'Sin consulta origen',
        matchedQueries: queryOrigin ? [queryOrigin] : [],
        urgency: item.urgencia || 'Media',
        status: item.estatus || 'Pendiente',
        city: item.ciudad || '',
        createdAt: item.createdAt
      });
    } else {
      if (queryOrigin && !existing.matchedQueries.includes(queryOrigin)) existing.matchedQueries.push(queryOrigin);
      if ((item.resumen || '').length > (existing.snippet || '').length) existing.snippet = item.resumen;
    }
  });

  const results = Array.from(dedupedMap.values())
    .sort((a, b) => {
      const urgencyScore = { Alta: 3, Media: 2, Baja: 1 };
      const statusScore = { Pendiente: 3, 'En revisión': 2, Contactado: 1, Convertido: 1, Descartado: 0 };
      return (urgencyScore[b.urgency] || 0) - (urgencyScore[a.urgency] || 0)
        || (statusScore[b.status] || 0) - (statusScore[a.status] || 0)
        || new Date(b.createdAt) - new Date(a.createdAt);
    });

  const topResults = results.slice(0, Math.max(1, maxHighlights));
  const sourcesCount = countBy(results, 'source');
  const queryCount = countBy(searchLogsToday, 'query');
  const observationsByQuery = countBy(observationsToday.filter(item => (item.queryOrigin || '').trim()), 'queryOrigin');

  const topSources = Object.entries(sourcesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} (${count})`);

  const topQueries = Object.entries(queryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} (${count})`);

  const topTrackedQueries = Object.entries(observationsByQuery)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} (${count})`);

  const summary = [
    searchLogsToday.length
      ? `Hoy se registraron ${searchLogsToday.length} búsquedas dentro del radar.`
      : 'Hoy todavía no se registran búsquedas en el radar.',
    observationsToday.length
      ? `Se guardaron ${observationsToday.length} observaciones manuales y ${results.length} hallazgos únicos deduplicados.`
      : 'Aún no hay observaciones manuales guardadas hoy.',
    topSources.length
      ? `Las fuentes con más señales fueron: ${topSources.join(', ')}.`
      : 'Aún no hay fuentes dominantes detectadas.',
    topQueries.length
      ? `Las consultas más trabajadas del día fueron: ${topQueries.join(', ')}.`
      : 'Todavía no hay suficiente historial de consultas para destacar tendencias.',
    topTrackedQueries.length
      ? `Las consultas con más observaciones guardadas fueron: ${topTrackedQueries.join(', ')}.`
      : 'Todavía no hay observaciones asociadas a consultas origen.'
  ].join(' ');

  return {
    dateKey: todayKey,
    generatedAt: nowIso,
    totalSearches: searchLogsToday.length,
    totalResults: results.length,
    totalSources: Object.keys(sourcesCount).length,
    searchLogsToday: searchLogsToday.length,
    observationMatches: observationsToday.length,
    sourcesCount,
    queryCount,
    observationsByQuery,
    summary,
    results: topResults
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'Sin dato';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function isSameDay(dateA, dateB) {
  return new Date(dateA).toISOString().slice(0, 10) === new Date(dateB).toISOString().slice(0, 10);
}

function renderAll() {
  renderKPIs();
  renderList();
  renderDailyReport();
}

function renderKPIs() {
  const data = getData();
  els.total.textContent = data.length;
  els.high.textContent = data.filter(item => item.urgencia === 'Alta').length;
  els.pending.textContent = data.filter(item => item.estatus === 'Pendiente').length;
}

function renderList() {
  const status = els.filterStatus.value;
  const priority = els.filterPriority.value;
  let data = getData();
  if (status) data = data.filter(item => item.estatus === status);
  if (priority) data = data.filter(item => item.urgencia === priority);

  if (!data.length) {
    els.list.innerHTML = `<div class="empty-state">No hay observaciones para esos filtros.</div>`;
    return;
  }

  els.list.innerHTML = data.map(item => `
    <article class="obs-card">
      <div class="obs-meta">
        <span class="badge ${priorityClass(item.urgencia)}">${item.urgencia}</span>
        <span class="badge ${statusClass(item.estatus)}">${item.estatus}</span>
        <span class="badge">${escapeHtml(item.categoria)}</span>
        <span class="badge">${escapeHtml(item.fuente)}</span>
      </div>
      <h3>${escapeHtml(item.grupo)}</h3>
      <p>${escapeHtml(item.resumen || 'Sin resumen.')}</p>
      <div class="obs-meta">
        <span>${escapeHtml(item.ciudad || 'Sin ciudad')}</span>
        <span>•</span>
        <span>${new Date(item.createdAt).toLocaleString('es-MX')}</span>
      </div>
      ${item.queryOrigin ? `<div class="query-origin">Consulta origen: ${escapeHtml(item.queryOrigin)}</div>` : ''}
      <div class="obs-actions">
        <a class="mini-btn" href="${escapeAttr(item.linkPost)}" target="_blank" rel="noopener noreferrer">Abrir enlace</a>
        <button class="mini-btn" data-id="${item.id}">Eliminar</button>
      </div>
    </article>
  `).join('');

  els.list.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => removeItem(btn.dataset.id));
  });
}

function renderDailyReport() {
  const report = getDailyReportForDate();
  if (!report) {
    if (els.reportTotalSearches) els.reportTotalSearches.textContent = '0';
    if (els.reportTotalResults) els.reportTotalResults.textContent = '0';
    if (els.reportTotalSources) els.reportTotalSources.textContent = '0';
    if (els.reportSummary) els.reportSummary.textContent = 'Aún no se genera el reporte de hoy.';
    if (els.reportResults) els.reportResults.innerHTML = `<div class="empty-state">Genera el reporte del día para consolidar búsquedas y observaciones manuales.</div>`;
    return;
  }

  els.reportTotalSearches.textContent = report.totalSearches;
  els.reportTotalResults.textContent = report.totalResults;
  els.reportTotalSources.textContent = report.totalSources;
  els.reportSummary.innerHTML = `
    <strong>Última ejecución:</strong> ${new Date(report.generatedAt).toLocaleString('es-MX')}<br>
    <strong>Modo:</strong> ${report.mode === 'proxy' ? 'Backend proxy con snippets' : report.mode === 'serpapi' ? 'SERP API con snippets' : 'Manual consolidado'}<br>
    ${escapeHtml(report.summary)}
  `;

  if (!report.results.length) {
    els.reportResults.innerHTML = `<div class="empty-state">No se encontraron resultados únicos en la corrida de hoy.</div>`;
    return;
  }

  els.reportResults.innerHTML = report.results.map(item => `
    <article class="result-card">
      <div class="obs-meta">
        <span class="badge">${escapeHtml(item.source)}</span>
        <span class="badge">${escapeHtml(item.displayLink)}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.snippet || 'Sin snippet')}</p>
      <div class="query-origin">Consulta origen: ${escapeHtml(item.query)}</div>
      ${item.matchedQueries?.length > 1 ? `<div class="query-origin">También apareció en: ${escapeHtml(item.matchedQueries.slice(1).join(' | '))}</div>` : ''}
      <div class="result-actions">
        <a class="mini-btn" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">Abrir resultado</a>
      </div>
    </article>
  `).join('');
}

function removeItem(id) {
  const data = getData().filter(item => item.id !== id);
  saveData(data);
  renderAll();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sanare-radar-observaciones.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportDailyReport() {
  const report = getDailyReportForDate();
  if (!report) {
    alert('Primero genera el reporte del día para poder exportarlo.');
    return;
  }

  const lines = [
    'SANARÉ · REPORTE DIARIO DE MONITOREO',
    `Fecha: ${report.dateKey}`,
    `Generado: ${new Date(report.generatedAt).toLocaleString('es-MX')}`,
    `Búsquedas corridas: ${report.totalSearches}`,
    `Hallazgos únicos: ${report.totalResults}`,
    `Fuentes detectadas: ${report.totalSources}`,
    `Observaciones manuales de hoy asociadas: ${report.observationMatches}`,
    '',
    'Resumen ejecutivo:',
    report.summary,
    '',
    'Hallazgos:'
  ];

  report.results.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`   Fuente: ${item.source}`);
    lines.push(`   Consulta origen: ${item.query}`);
    lines.push(`   Link: ${item.link}`);
    lines.push(`   Nota: ${item.snippet}`);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sanare-reporte-diario-${report.dateKey}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function priorityClass(value) {
  return value === 'Alta' ? 'high' : value === 'Media' ? 'medium' : 'low';
}

function statusClass(value) {
  return String(value).toLowerCase().replace(/\s+/g, '-');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, '&#96;');
}
