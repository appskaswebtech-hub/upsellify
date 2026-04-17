(function () {
  "use strict";

  // ---------------- Early exits ----------------
  if (!window.location.pathname.includes("/products/")) return;
  if (window.__selleasyInited) return;
  window.__selleasyInited = true;

  const handle = window.location.pathname
    .split("/products/")[1]
    ?.split("/")[0]
    ?.split("?")[0];
  if (!handle) return;

  // ---------------- Config ----------------
  const ROUTES = {
    product: (h) => `/products/${h}.js`,
    campaigns: (pid) => `/apps/selleasy/campaigns?productId=${pid}`,
    cartAdd: "/cart/add.js",
    cart: "/cart",
  };

  // ---------------- State ----------------
  const state = {
    trigger: null,   // { product, selectedVariantId }
    offers: [],      // [{ product, selected, selectedVariantId }]
    campaign: null,
    currency: "USD",
    mountEl: null,
    isAdding: false,
  };

  // ---------------- Utils ----------------
  const money = (cents, currency) =>
    new Intl.NumberFormat(document.documentElement.lang || "en", {
      style: "currency",
      currency: currency || "USD",
    }).format((cents || 0) / 100);

  const escapeHtml = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const getVariant = (product, id) =>
    product.variants.find((v) => v.id === Number(id)) || product.variants[0];

  // ---------------- Bootstrap ----------------
  fetch(ROUTES.product(handle))
    .then((r) => {
      if (!r.ok) throw new Error(`Product fetch failed: ${r.status}`);
      return r.json();
    })
    .then(async (product) => {
      state.trigger = {
        product,
        selectedVariantId: product.variants[0].id,
      };

      const res = await fetch(ROUTES.campaigns(product.id), {
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .catch(() => ({ campaigns: [] }));

      const campaign = res.campaigns?.[0];
      if (!campaign) return;
      state.campaign = campaign;

      const offerProducts = await Promise.all(
        campaign.offers.map((o) =>
          fetch(ROUTES.product(o.handle))
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );

      state.offers = offerProducts
        .filter(Boolean)
        .map((p) => ({
          product: p,
          selected: true,
          selectedVariantId: p.variants[0].id,
        }));

      mount();
    })
    .catch((e) => console.error("[selleasy] bootstrap failed:", e));

  // ---------------- Mount ----------------
  function mount() {
    // Priority 1: App Block (drag-drop placement)
    const block = document.querySelector("[data-selleasy-block]");
    if (block) {
      state.mountEl = block;
      render(block);
      const embed = document.querySelector("[data-selleasy-embed]");
      if (embed) embed.style.display = "none";
      return;
    }

    // Priority 2: App Embed (auto-injection)
    const embed = document.querySelector("[data-selleasy-embed]");
    if (!embed) return;

    const target =
      document.querySelector("form[action*='/cart/add']") ||
      document.querySelector(".product__info-wrapper") ||
      document.querySelector(".product__info") ||
      document.querySelector("main");

    if (target && target.parentNode) {
      target.parentNode.insertBefore(embed, target.nextSibling);
    }
    state.mountEl = embed;
    render(embed);
  }

  // ---------------- Render ----------------
  function render(root) {
    const c = state.campaign;
    const title = c.title || "Frequently bought together";
    const subtitle = c.subtitle || "";

    root.innerHTML = `
      <div class="sl-fbt">
        <div class="sl-fbt__head">
          <h3 class="sl-fbt__title">${escapeHtml(title)}</h3>
          ${subtitle ? `<p class="sl-fbt__subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>

        <div class="sl-fbt__trigger" data-role="trigger"></div>

        <div class="sl-fbt__plus" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="12" cy="12" r="11" fill="#fff" stroke="#d9d9d9" />
            <line x1="7" y1="12" x2="17" y2="12" stroke="#333" stroke-width="1.6" />
            <line x1="12" y1="7" x2="12" y2="17" stroke="#333" stroke-width="1.6" />
          </svg>
        </div>

        <div class="sl-fbt__offers" data-role="offers"></div>

        <div class="sl-fbt__total" data-role="total"></div>
        <p class="sl-fbt__note">Selected items will be added to cart.</p>

        <div class="sl-fbt__error" data-role="error" hidden></div>

        <button class="sl-fbt__cta" type="button" data-role="cta">
          Add bundle to cart
        </button>
      </div>
    `;

    renderTrigger(root.querySelector("[data-role=trigger]"));
    renderOffers(root.querySelector("[data-role=offers]"));
    renderTotal(root.querySelector("[data-role=total]"));

    root
      .querySelector("[data-role=cta]")
      .addEventListener("click", addBundleToCart);
  }

  function renderTrigger(el) {
    const { product, selectedVariantId } = state.trigger;
    const variant = getVariant(product, selectedVariantId);
    const img = product.featured_image || product.images?.[0];

    el.innerHTML = `
      <div class="sl-fbt__row sl-fbt__row--trigger">
        ${img
          ? `<img class="sl-fbt__img" src="${img}" alt="" loading="lazy" />`
          : `<div class="sl-fbt__img sl-fbt__img--ph"></div>`}
        <div class="sl-fbt__meta">
          <div class="sl-fbt__name">${escapeHtml(product.title)}</div>
          ${renderVariantSelect(product, selectedVariantId, "trigger")}
        </div>
        <div class="sl-fbt__price">${variantPriceHTML(variant)}</div>
      </div>
    `;

    const sel = el.querySelector("select[data-role=variant]");
    if (sel) {
      sel.addEventListener("change", (e) => {
        state.trigger.selectedVariantId = Number(e.target.value);
        renderTrigger(el);
        renderTotal(state.mountEl.querySelector("[data-role=total]"));
      });
    }
  }

  function renderOffers(el) {
    el.innerHTML = state.offers
      .map((o, i) => {
        const v = getVariant(o.product, o.selectedVariantId);
        const img = o.product.featured_image || o.product.images?.[0];
        return `
          <div class="sl-fbt__row ${o.selected ? "" : "is-unchecked"}" data-idx="${i}">
            <label class="sl-fbt__check">
              <input type="checkbox" data-role="offer-check" data-idx="${i}" ${o.selected ? "checked" : ""} />
              <span class="sl-fbt__box"></span>
            </label>
            ${img
              ? `<img class="sl-fbt__img" src="${img}" alt="" loading="lazy" />`
              : `<div class="sl-fbt__img sl-fbt__img--ph"></div>`}
            <div class="sl-fbt__meta">
              <div class="sl-fbt__name">${escapeHtml(o.product.title)}</div>
              ${renderVariantSelect(o.product, o.selectedVariantId, "offer", i)}
            </div>
            <div class="sl-fbt__price">${variantPriceHTML(v)}</div>
          </div>
        `;
      })
      .join("");

    el.querySelectorAll("input[data-role=offer-check]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.offers[idx].selected = e.target.checked;
        renderOffers(el);
        renderTotal(state.mountEl.querySelector("[data-role=total]"));
      });
    });

    el.querySelectorAll("select[data-role=variant]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.offers[idx].selectedVariantId = Number(e.target.value);
        renderOffers(el);
        renderTotal(state.mountEl.querySelector("[data-role=total]"));
      });
    });
  }

  function renderTotal(el) {
    if (!el) return;
    const items = buildCartItems();
    const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    el.innerHTML = `
      <div class="sl-fbt__total-row">
        <span class="sl-fbt__total-label">Total</span>
        <span class="sl-fbt__total-val">${money(total, state.currency)}</span>
      </div>
    `;
  }

  function renderVariantSelect(product, selectedId, role, idx) {
    if (!product.variants || product.variants.length <= 1) return "";
    const opts = product.variants
      .map(
        (v) =>
          `<option value="${v.id}" ${v.id === selectedId ? "selected" : ""}>${escapeHtml(v.title)}${
            v.available ? "" : " — Sold out"
          }</option>`,
      )
      .join("");
    const idxAttr = typeof idx === "number" ? `data-idx="${idx}"` : "";
    return `<select class="sl-fbt__variant" data-role="variant" ${idxAttr}>${opts}</select>`;
  }

  function variantPriceHTML(v) {
    if (!v) return "";
    const hasCompare = v.compare_at_price && v.compare_at_price > v.price;
    return `
      ${hasCompare ? `<span class="sl-fbt__compare">${money(v.compare_at_price, state.currency)}</span>` : ""}
      <span class="sl-fbt__current">${money(v.price, state.currency)}</span>
    `;
  }

  // ---------------- Cart logic ----------------
  /**
   * Build a deduplicated, valid list of items to send to /cart/add.js
   * Dedups by variant ID (if the trigger equals an offer, their quantities sum)
   */
  function buildCartItems() {
    const raw = [];

    const tv = getVariant(state.trigger.product, state.trigger.selectedVariantId);
    if (tv) {
      raw.push({
        id: tv.id,
        quantity: 1,
        price: tv.price,
        title: state.trigger.product.title,
        available: tv.available,
      });
    }

    state.offers.forEach((o) => {
      if (!o.selected) return;
      const v = getVariant(o.product, o.selectedVariantId);
      if (!v) return;
      raw.push({
        id: v.id,
        quantity: 1,
        price: v.price,
        title: o.product.title,
        available: v.available,
      });
    });

    // Dedup by variant id
    const map = new Map();
    for (const it of raw) {
      if (map.has(it.id)) {
        map.get(it.id).quantity += it.quantity;
      } else {
        map.set(it.id, { ...it });
      }
    }
    return Array.from(map.values());
  }

  function showError(message) {
    const el = state.mountEl?.querySelector("[data-role=error]");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(() => {
      el.hidden = true;
    }, 6000);
  }

  function clearError() {
    const el = state.mountEl?.querySelector("[data-role=error]");
    if (el) el.hidden = true;
  }

  async function addBundleToCart() {
    if (state.isAdding) return;
    state.isAdding = true;
    clearError();

    const btn = state.mountEl.querySelector("[data-role=cta]");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
      const items = buildCartItems();

      if (items.length === 0) {
        throw new Error("Please select at least one item.");
      }

      const unavailable = items.filter((i) => !i.available);
      if (unavailable.length > 0) {
        const names = unavailable.map((i) => `"${i.title}"`).join(", ");
        throw new Error(
          `${names} ${unavailable.length === 1 ? "is" : "are"} sold out. Please deselect and try again.`,
        );
      }

      const payload = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      };

      console.log("[selleasy] /cart/add.js →", payload);

      const res = await fetch(ROUTES.cartAdd, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      console.log("[selleasy] /cart/add.js ←", res.status, data);

      if (!res.ok) {
        const msg =
          data.description ||
          data.message ||
          `Add to cart failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // Notify the theme (Dawn + most OS 2.0 themes listen for this)
      document.dispatchEvent(
        new CustomEvent("cart:refresh", { detail: { items: data.items || [] } }),
      );
      document.dispatchEvent(
        new CustomEvent("cart:added", { detail: { items: data.items || [] } }),
      );

      // Redirect to cart
      window.location.href = ROUTES.cart;
    } catch (e) {
      console.error("[selleasy] add-to-cart error:", e);
      showError(e.message || "Could not add the bundle to your cart.");
      btn.disabled = false;
      btn.textContent = originalLabel;
      state.isAdding = false;
    }
  }
})();
