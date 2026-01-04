const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const STORAGE_KEY = "cb_shop_settings_v1";

function safeUrl(url) {
  try { return new URL(url).toString(); } catch { return ""; }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { discordUrl: "", contactText: "" };
    const parsed = JSON.parse(raw);
    return {
      discordUrl: typeof parsed.discordUrl === "string" ? parsed.discordUrl : "",
      contactText: typeof parsed.contactText === "string" ? parsed.contactText : "",
    };
  } catch { return { discordUrl: "", contactText: "" }; }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function setDiscordLinks(discordUrl) {
  const url = safeUrl(discordUrl) || "#";
  const ids = ["#discordCta", "#discordCardBtn", "#discordGiftBtn", "#goDiscordBtn", "#goDiscordBtn2"];
  ids.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.setAttribute("href", url);
    if (url === "#") el.setAttribute("aria-disabled", "true");
    else el.removeAttribute("aria-disabled");
  });
}

function setupDrawer() {
  const btn = $("#hamburger");
  const drawer = $("#drawer");
  const close = $("#drawerClose");
  if (!btn || !drawer || !close) return;

  const open = () => { drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; };
  const shut = () => { drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; };

  btn.addEventListener("click", open);
  close.addEventListener("click", shut);
  drawer.addEventListener("click", (e) => { if (e.target === drawer) shut(); });
  $$(".drawer__link").forEach((a) => a.addEventListener("click", shut));
}

async function loadProducts() {
  const res = await fetch("assets/data/products.json", { cache: "no-store" });
  if (!res.ok) throw new Error("products.json 載入失敗");
  return await res.json();
}

function buildFilters(products) {
  const filtersEl = $("#filters");
  if (!filtersEl) return [];
  const cats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
  const filters = ["全部", ...cats];

  filtersEl.innerHTML = "";
  filters.forEach((name, idx) => {
    const btn = document.createElement("button");
    btn.className = "filter";
    btn.type = "button";
    btn.textContent = name;
    btn.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
    btn.dataset.filter = name;
    filtersEl.appendChild(btn);
  });

  return filters;
}

function renderProducts(products, activeCategory, query) {
  const grid = $("#productGrid");
  if (!grid) return;

  const q = (query || "").trim().toLowerCase();
  const filtered = products.filter((p) => {
    const catOk = activeCategory === "全部" || p.category === activeCategory;
    const text = `${p.name} ${p.category} ${p.desc} ${(p.tags || []).join(" ")}`.toLowerCase();
    const qOk = !q || text.includes(q);
    return catOk && qOk;
  });

  grid.innerHTML = "";
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notice";
    empty.innerHTML = `
      <div class="notice__title">找不到符合的商品</div>
      <div class="notice__body">你可以換個關鍵字，或切換分類查看。</div>
    `;
    grid.appendChild(empty);
    return;
  }

  filtered.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card product";
    const badge = p.status ? `<span class="product__badge">${p.status}</span>` : `<span class="product__badge">上架中</span>`;
    const price = p.price ? `<div class="price">${p.price}</div>` : `<div class="price">洽詢報價</div>`;
    const tagText = p.tags && p.tags.length ? p.tags.join(" / ") : "—";

    card.innerHTML = `
      <div class="product__top">
        <div>
          <div class="product__name">${p.name}</div>
          <div class="product__cat">${p.category} ・ ${tagText}</div>
        </div>
        ${badge}
      </div>
      <p class="product__desc">${p.desc || "—"}</p>
      <div class="product__bottom">
        ${price}
        <a class="btn btn--ghost" href="./#discord" title="到 Discord 詢問">詢問</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function main() {
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  setupDrawer();

  const settings = loadSettings();
  const discordInput = $("#discordUrl");
  const contactInput = $("#contactText");
  if (discordInput) discordInput.value = settings.discordUrl || "";
  if (contactInput) contactInput.value = settings.contactText || "";
  setDiscordLinks(settings.discordUrl);

  const saveBtn = $("#saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const discordUrl = discordInput ? discordInput.value.trim() : "";
      const contactText = contactInput ? contactInput.value.trim() : "";
      const normalized = safeUrl(discordUrl);
      saveSettings({ discordUrl: normalized || discordUrl, contactText });
      setDiscordLinks(normalized || discordUrl);

      saveBtn.textContent = "已儲存 ✅";
      setTimeout(() => (saveBtn.textContent = "儲存並更新按鈕"), 1200);
    });
  }

  try {
    const products = await loadProducts();
    let activeCategory = "全部";
    let query = "";
    buildFilters(products);

    const filtersEl = $("#filters");
    if (filtersEl) {
      filtersEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter");
        if (!btn) return;
        $$(".filter").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        activeCategory = btn.dataset.filter || "全部";
        renderProducts(products, activeCategory, query);
      });
    }

    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        query = searchInput.value || "";
        renderProducts(products, activeCategory, query);
      });
    }

    renderProducts(products, activeCategory, query);
  } catch (err) {
    const grid = $("#productGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="notice">
          <div class="notice__title">商品載入失敗</div>
          <div class="notice__body">請確認 <code>assets/data/products.json</code> 是否存在且格式正確。</div>
        </div>
      `;
    }
    console.error(err);
  }
}

main();
