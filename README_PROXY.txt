SANARÉ RADAR · FRONT + BACKEND PROXY

1) FRONTEND
- Puedes subir la carpeta principal a GitHub Pages.
- En la sección "Reporte diario automatizado" pega la URL pública de tu backend, por ejemplo:
  https://tu-backend.onrender.com

2) BACKEND
- Entra a la carpeta backend
- Copia .env.example como .env
- Pega tu SERPAPI_KEY en el archivo .env
- Instala dependencias:
  npm install
- Arranca el servidor:
  npm start

3) PRUEBA RÁPIDA LOCAL
- Frontend: abre index.html o sírvelo con un servidor local.
- Backend: http://localhost:8787
- En el frontend pega como URL backend proxy:
  http://localhost:8787

4) ENDPOINTS
- GET /health
- POST /api/serp/report

5) RECOMENDACIÓN
- Usa el backend proxy como modo principal.
- No expongas tu SERPAPI_KEY en capturas ni en GitHub Pages.
