const STORAGE_KEY = "race-plan:index";

const listEl = document.getElementById("list");
const offlineBadgeEl = document.getElementById("offlineBadge");

function formatSec(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} m`;
}

function formatHours(value) {
  const parts = value.split(":");
  return `${parts[0]}:${parts[1]}h`;
}

function formatKm(value) {
  return value.toFixed(1);
}

function badgeLabel(nome) {
  const lower = nome.toLowerCase();
  if (lower.includes("crew")) return "👥 crew";
  if (lower.includes("abastecimento") || lower.includes("liquidos")) return "🥤 abastecimento";
  if (lower.includes("meta")) return "🏁 meta";
  if (lower.includes("partida")) return "🏁 partida";
  return "⭐ ponto especial";
}

// Silhueta ilustrativa da altimetria (não são dados reais) — pares [posição 0-1 no percurso, altura 0-1].
// Desenhada à mão para imitar a forma do perfil real: subida alta inicial, vale a meio, série de picos até ao fim.
const ELEVATION_SILHOUETTE = [
  [0.00, 0.02],
  [0.05, 0.55],
  [0.09, 0.95],
  [0.12, 0.78],
  [0.16, 0.68],
  [0.20, 0.74],
  [0.24, 0.65],
  [0.28, 0.80],
  [0.30, 1.00],
  [0.33, 0.60],
  [0.38, 0.22],
  [0.42, 0.06],
  [0.46, 0.05],
  [0.50, 0.28],
  [0.54, 0.40],
  [0.57, 0.30],
  [0.60, 0.55],
  [0.63, 0.42],
  [0.66, 0.63],
  [0.69, 0.30],
  [0.72, 0.10],
  [0.76, 0.45],
  [0.79, 0.60],
  [0.82, 0.30],
  [0.85, 0.15],
  [0.88, 0.35],
  [0.91, 0.28],
  [0.94, 0.50],
  [0.97, 0.62],
  [1.00, 0.05],
];

function silhouetteHeightAt(t) {
  const pts = ELEVATION_SILHOUETTE;
  if (t <= pts[0][0]) return pts[0][1];
  if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, h0] = pts[i];
    const [t1, h1] = pts[i + 1];
    if (t >= t0 && t <= t1) {
      const ratio = (t - t0) / (t1 - t0 || 1);
      return h0 + (h1 - h0) * ratio;
    }
  }
  return 0;
}

function buildElevationProfile(points) {
  const width = 560;
  const height = 260;
  const padX = 14;
  const padTop = 26;
  const padBottom = 16;

  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;

  const minKm = points[0].km;
  const maxKm = points[points.length - 1].km;
  const kmRange = maxKm - minKm || 1;

  const xAt = (km) => padX + ((km - minKm) / kmRange) * plotWidth;
  const yAt = (h) => padTop + plotHeight - h * plotHeight;

  const silhouetteCoords = ELEVATION_SILHOUETTE.map(([t, h]) => [
    padX + t * plotWidth,
    yAt(h),
  ]);

  const linePath = silhouetteCoords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const baseline = padTop + plotHeight;
  const lastX = silhouetteCoords[silhouetteCoords.length - 1][0];
  const firstX = silhouetteCoords[0][0];
  const areaPath = `${linePath} L${lastX.toFixed(1)},${baseline} L${firstX.toFixed(1)},${baseline} Z`;

  const markers = points
    .map((p, i) => {
      const t = (p.km - minKm) / kmRange;
      const x = xAt(p.km);
      const y = yAt(silhouetteHeightAt(t));
      return `
        <circle class="elevation-profile__dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"></circle>
        <text class="elevation-profile__num" x="${x.toFixed(1)}" y="${y.toFixed(1)}" dominant-baseline="central" text-anchor="middle">${i + 1}</text>
      `;
    })
    .join("");

  const section = document.createElement("section");
  section.className = "elevation-profile";
  section.innerHTML = `
    <svg class="elevation-profile__svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Perfil de altimetria do percurso">
      <path class="elevation-profile__area" d="${areaPath}"></path>
      <path class="elevation-profile__line" d="${linePath}"></path>
      ${markers}
    </svg>
  `;

  return section;
}

function buildCard(p, i, total) {
  const card = document.createElement("section");
  card.className = "card" + (p.especial ? " card--especial" : "");
  card.dataset.index = i;

  card.innerHTML = `
    <div class="card__top">
      <span class="card__index">${i + 1} / ${total}</span>
      <span class="card__badge">${p.especial ? badgeLabel(p.ponto) : ""}</span>
    </div>
    <div class="card__km">
      <span class="card__km-value">${formatKm(p.km)}</span>
      <span class="card__km-unit">KM</span>
    </div>
    <h2 class="card__ponto">${p.ponto}</h2>
    <div class="card__hero">
      <div class="hero-stat">
        <span class="hero-stat__value">${formatHours(p.decorrido)}</span>
        <span class="hero-stat__label">Objetivo</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__value">${formatHours(p.segmento)}</span>
        <span class="hero-stat__label">Segmento</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__value">${p.pace}</span>
        <span class="hero-stat__label">Pace</span>
      </div>
    </div>
    <div class="card__grid">
      <div class="grid-stat">
        <span class="grid-stat__label">Adistância</span>
        <span class="grid-stat__value">${p.adistancia} km</span>
      </div>
      <div class="grid-stat">
        <span class="grid-stat__label">Sec. D+/-</span>
        <span class="grid-stat__value">${formatSec(p.secDPlusMinus)}</span>
      </div>
      <div class="grid-stat">
        <span class="grid-stat__label">D+ Acum</span>
        <span class="grid-stat__value">${p.dPlusAcum}</span>
      </div>
      <div class="grid-stat">
        <span class="grid-stat__label">Pace</span>
        <span class="grid-stat__value">${p.pace}</span>
      </div>
      <div class="grid-stat grid-stat--wide">
        <span class="grid-stat__label">Relógio</span>
        <span class="grid-stat__value">${p.relogio}h</span>
      </div>
    </div>
  `;

  return card;
}

function saveIndex(index) {
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch (e) {}
}

function loadIndex() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const idx = saved !== null ? parseInt(saved, 10) : 0;
    return Number.isInteger(idx) ? idx : 0;
  } catch (e) {
    return 0;
  }
}

function trackVisibleCard(cards) {
  let lastSaved = -1;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = parseInt(visible.target.dataset.index, 10);
      if (index !== lastSaved) {
        lastSaved = index;
        saveIndex(index);
      }
    },
    { threshold: [0.5, 0.75, 1] }
  );
  cards.forEach((card) => observer.observe(card));
}

function updateOfflineBadge() {
  offlineBadgeEl.hidden = navigator.onLine;
}

function showError() {
  listEl.innerHTML = `
    <p class="error-state">
      Não foi possível carregar o plano.<br>
      Verifica a ligação e tenta novamente.
    </p>
  `;
}

async function init() {
  let points;
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    points = await res.json();
  } catch (err) {
    console.error("[init] falhou a carregar data.json:", err);
    showError();
    return;
  }

  listEl.appendChild(buildElevationProfile(points));

  const fragment = document.createDocumentFragment();
  const cards = points.map((p, i) => {
    const card = buildCard(p, i, points.length);
    fragment.appendChild(card);
    return card;
  });
  listEl.appendChild(fragment);

  const startIndex = Math.min(loadIndex(), points.length - 1);
  const target = cards[startIndex];
  if (target && startIndex > 0) {
    target.scrollIntoView({ block: "start" });
  }

  trackVisibleCard(cards);
}

init();

updateOfflineBadge();
window.addEventListener("online", updateOfflineBadge);
window.addEventListener("offline", updateOfflineBadge);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("[SW] registo falhou:", err));
  });
}
