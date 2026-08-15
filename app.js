const STORAGE_KEY = "race-plan:index";

const listEl = document.getElementById("list");
const offlineBadgeEl = document.getElementById("offlineBadge");

function formatSec(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} m`;
}

function badgeLabel(nome) {
  const lower = nome.toLowerCase();
  if (lower.includes("crew")) return "👥 crew";
  if (lower.includes("abastecimento") || lower.includes("liquidos")) return "🥤 abastecimento";
  if (lower.includes("meta")) return "🏁 meta";
  if (lower.includes("partida")) return "🏁 partida";
  return "⭐ ponto especial";
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
    <h2 class="card__ponto">${p.ponto}</h2>
    <div class="card__hero">
      <div class="hero-stat">
        <span class="hero-stat__value">${p.km}</span>
        <span class="hero-stat__label">KM</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__value">${p.dPlusAcum}</span>
        <span class="hero-stat__label">D+ Acum</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__value">${p.relogio}</span>
        <span class="hero-stat__label">Relógio</span>
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
        <span class="grid-stat__label">Segmento</span>
        <span class="grid-stat__value">${p.segmento}</span>
      </div>
      <div class="grid-stat">
        <span class="grid-stat__label">Pace</span>
        <span class="grid-stat__value">${p.pace}</span>
      </div>
      <div class="grid-stat grid-stat--wide">
        <span class="grid-stat__label">Decorrido</span>
        <span class="grid-stat__value">${p.decorrido}</span>
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
