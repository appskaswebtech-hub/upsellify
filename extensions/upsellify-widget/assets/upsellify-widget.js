(function () {
  "use strict";
  if (!window.location.pathname.includes("/products/")) return;
  if (window.__selleasyInited) return;
  window.__selleasyInited = true;

  const handle = window.location.pathname.split("/products/")[1]?.split("/")[0]?.split("?")[0];
  if (!handle) return;

  const ROUTES = {
    product: (h) => `/products/${h}.js`,
    campaigns: (pid) => `/apps/selleasy/campaigns?productId=${pid}`,
    cartAdd: "/cart/add.js",
    cart: "/cart",
  };

  const state = {
    trigger: null,
    offers: [],
    campaign: null,
    currency: "USD",
    mountEl: null,
    currentTierIdx: 0,
    layoutType: "FBT_LIST",
  };

  const money = (cents, currency) =>
    new Intl.NumberFormat(document.documentElement.lang || "en", {
      style: "currency", currency: currency || "USD",
    }).format((cents || 0) / 100);
  const escapeHtml = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  const getVariant = (p, id) =>
    p.variants.find((v) => v.id === Number(id)) || p.variants[0];

  // ── Bootstrap
  fetch(ROUTES.product(handle))
    .then((r) => r.json())
    .then(async (product) => {
      const res = await fetch(ROUTES.campaigns(product.id), { credentials: "same-origin" })
        .then((r) => r.json()).catch(() => ({ campaigns: [] }));
      const campaign = res.campaigns?.[0];
      if (!campaign) return;

      state.campaign = campaign;
      state.layoutType = campaign.type || "FBT_LIST";

      state.trigger = {
        product,
        selectedVariantId: product.variants[0].id,
        quantity: 1,
        selected: true,
      };

      const offers = await Promise.all(
        campaign.offers.map((o) =>
          fetch(ROUTES.product(o.handle)).then((r) => r.json()).catch(() => null),
        ),
      );

      state.offers = offers.filter(Boolean).map((p) => {
        let variantId = p.variants[0].id;
        if (campaign.settings?.autoMatchVariants) {
          const triggerVariantName = product.variants[0].title;
          const match = p.variants.find((v) => v.title === triggerVariantName);
          if (match) variantId = match.id;
        }
        return {
          product: p,
          selected: !campaign.settings?.doNotPreselect,
          selectedVariantId: variantId,
          quantity: 1,
        };
      });

      mount();
    })
    .catch((e) => console.error("[selleasy]", e));

  function mount() {
    const block = document.querySelector("[data-selleasy-block]");
    const embed = document.querySelector("[data-selleasy-embed]");
    if (block) {
      state.mountEl = block;
      if (embed) embed.style.display = "none";
    } else if (embed) {
      state.mountEl = embed;
      const target =
        document.querySelector("form[action*='/cart/add']") ||
        document.querySelector("main");
      if (target?.parentNode) target.parentNode.insertBefore(embed, target.nextSibling);
    } else return;

    applyAppearance();
    render();
  }

  function applyAppearance() {
    const a = state.campaign.appearance || {};
    const root = state.mountEl;
    root.style.setProperty("--sl-accent", a.accentColor || "#000");
    root.style.setProperty("--sl-text", a.textColor || "#202020");
    root.style.setProperty("--sl-radius", `${a.borderRadius || 8}px`);
    if (a.fontFamily && a.fontFamily !== "inherit") {
      root.style.setProperty("--sl-font", a.fontFamily);
    }
  }

  function render() {
    const c = state.campaign;

    // Classic has its own layout - CTA goes above rows, custom structure
    if (state.layoutType === "FBT_CLASSIC") {
      state.mountEl.innerHTML = `
        <div class="sl-fbt sl-fbt--classic">
          <div class="sl-fbt__head">
            <h3 class="sl-fbt__title">${escapeHtml(c.title)}</h3>
            ${c.subtitle ? `<p class="sl-fbt__subtitle">${escapeHtml(c.subtitle)}</p>` : ""}
          </div>
          ${renderTierTabs()}
          <div data-role="body"></div>
          <div class="sl-fbt__error" data-role="error" hidden></div>
        </div>
      `;
      wireTierTabs();
      renderBody();
      state.mountEl.querySelector("[data-role=cta]").addEventListener("click", addBundleToCart);
      return;
    }

    // Default (List + Amazon)
    state.mountEl.innerHTML = `
      <div class="sl-fbt sl-fbt--${state.layoutType.toLowerCase().replace("fbt_", "")}">
        <div class="sl-fbt__head">
          <h3 class="sl-fbt__title">${escapeHtml(c.title)}</h3>
          ${c.subtitle ? `<p class="sl-fbt__subtitle">${escapeHtml(c.subtitle)}</p>` : ""}
        </div>
        ${renderTierTabs()}
        <div data-role="body"></div>
        <div class="sl-fbt__total" data-role="total"></div>
        <p class="sl-fbt__note">Selected items will be added to cart.</p>
        <div class="sl-fbt__error" data-role="error" hidden></div>
        <button class="sl-fbt__cta" type="button" data-role="cta">${escapeHtml(c.ctaLabel)}</button>
      </div>
    `;
    wireTierTabs();
    renderBody();
    renderTotal();
    state.mountEl.querySelector("[data-role=cta]").addEventListener("click", addBundleToCart);
  }

  function renderTierTabs() {
    const d = state.campaign.discount;
    if (!d || d.type !== "TIERED" || !d.tiers?.length) return "";
    return `
      <div class="sl-fbt__tiers">
        ${d.tiers.map((t, i) => `
          <button class="sl-fbt__tier ${i === state.currentTierIdx ? "is-active" : ""}" data-tier="${i}" type="button">
            ${escapeHtml(t.label || `Buy ${t.minItems}, get ${t.value}${t.valueType === "PERCENTAGE" ? "%" : ""}`)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function wireTierTabs() {
    state.mountEl.querySelectorAll("[data-tier]").forEach((b) => {
      b.addEventListener("click", () => {
        state.currentTierIdx = Number(b.dataset.tier);
        render();
      });
    });
  }

  function renderBody() {
    const el = state.mountEl.querySelector("[data-role=body]");
    if (state.layoutType === "FBT_AMAZON") return renderAmazonLayout(el);
    if (state.layoutType === "FBT_CLASSIC") return renderClassicLayout(el);
    return renderListLayout(el);
  }

  function renderListLayout(el) {
    el.innerHTML = `
      <div data-role="trigger-row"></div>
      <div class="sl-fbt__plus">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <circle cx="12" cy="12" r="11" fill="#fff" stroke="#d9d9d9"/>
          <line x1="7" y1="12" x2="17" y2="12" stroke="#333" stroke-width="1.6"/>
          <line x1="12" y1="7" x2="12" y2="17" stroke="#333" stroke-width="1.6"/>
        </svg>
      </div>
      <div data-role="offers"></div>
    `;
    renderRow(el.querySelector("[data-role=trigger-row]"), state.trigger, true);
    const offersEl = el.querySelector("[data-role=offers]");
    offersEl.innerHTML = "";
    state.offers.forEach((o, i) => {
      const d = document.createElement("div");
      if (i > 0) d.style.marginTop = "8px";
      offersEl.appendChild(d);
      renderRow(d, o, false, i);
    });
  }

  function renderAmazonLayout(el) {
    const all = [state.trigger, ...state.offers];
    el.innerHTML = `
      <div class="sl-fbt__amazon">
        ${all.map((item, i) => {
          const img = item.product.featured_image || item.product.images?.[0];
          const isTrigger = i === 0;
          return `
            ${i > 0 ? `<span class="sl-fbt__amazon-plus">+</span>` : ""}
            <div class="sl-fbt__amazon-item ${!item.selected && !isTrigger ? "is-unchecked" : ""}">
              ${!isTrigger ? `
                <label class="sl-fbt__check sl-fbt__check--overlay">
                  <input type="checkbox" data-role="item-check" data-idx="${i - 1}" ${item.selected ? "checked" : ""} />
                  <span class="sl-fbt__box"></span>
                </label>` : ""}
              ${img ? `<img src="${img}" alt="" />` : `<div class="sl-fbt__img--ph"></div>`}
              <div class="sl-fbt__amazon-name">${escapeHtml(item.product.title)}</div>
              <div class="sl-fbt__price">${priceHTML(getVariant(item.product, item.selectedVariantId))}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
    el.querySelectorAll("input[data-role=item-check]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        state.offers[Number(e.target.dataset.idx)].selected = e.target.checked;
        renderBody();
        renderTotal();
      });
    });
  }

  function renderClassicLayout(el) {
    const c = state.campaign;

    el.innerHTML = `
      <div class="sl-fbt__classic-grid">
        ${[state.trigger, ...state.offers].map((item, i, arr) => {
          const img = item.product.featured_image || item.product.images?.[0];
          return `
            <div class="sl-fbt__classic-tile">
              ${img ? `<img src="${img}" alt="" />` : `<div class="sl-fbt__img--ph"></div>`}
              ${i < arr.length - 1 ? `<span class="sl-fbt__plus-small">+</span>` : ""}
            </div>
          `;
        }).join("")}
      </div>

      <button class="sl-fbt__cta sl-fbt__cta--classic" type="button" data-role="cta">${escapeHtml(c.ctaLabel)}</button>

      <div class="sl-fbt__classic-list" data-role="classic-list"></div>

      <div class="sl-fbt__total sl-fbt__total--classic" data-role="total"></div>
      <p class="sl-fbt__note">Selected items will be added to cart.</p>
    `;

    const list = el.querySelector("[data-role=classic-list]");

    // Trigger row (outlined, no thumbnail)
    const tDiv = document.createElement("div");
    list.appendChild(tDiv);
    renderClassicRow(tDiv, state.trigger, true);

    // Offer rows (checkbox + name + price, no thumbnail)
    state.offers.forEach((o, i) => {
      const d = document.createElement("div");
      d.style.marginTop = "6px";
      list.appendChild(d);
      renderClassicRow(d, o, false, i);
    });

    renderTotal();
  }

  function renderClassicRow(el, item, isTrigger, offerIdx) {
    const s = state.campaign.settings || {};
    const v = getVariant(item.product, item.selectedVariantId);
    const canToggle = !isTrigger || s.allowDeselectTrigger;
    const showQty = s.showQuantityPicker;

    el.innerHTML = `
      <div class="sl-fbt__row sl-fbt__row--slim ${isTrigger ? "sl-fbt__row--trigger" : ""} ${!item.selected ? "is-unchecked" : ""}">
        ${canToggle ? `
          <label class="sl-fbt__check">
            <input type="checkbox" data-role="row-check" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}" ${item.selected ? "checked" : ""} />
            <span class="sl-fbt__box"></span>
          </label>` : `<span class="sl-fbt__check-placeholder"></span>`}
        <div class="sl-fbt__meta">
          <div class="sl-fbt__name">${escapeHtml(item.product.title)}</div>
          ${renderVariantSelect(item.product, item.selectedVariantId, isTrigger, offerIdx)}
        </div>
        ${showQty ? `
          <div class="sl-fbt__qty">
            <button type="button" data-role="qty-dec" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-role="qty-inc" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">+</button>
          </div>` : ""}
        <div class="sl-fbt__price">${priceHTML(v)}</div>
      </div>
    `;
    wireRow(el);
  }

  function renderRow(el, item, isTrigger, offerIdx) {
    const s = state.campaign.settings || {};
    const v = getVariant(item.product, item.selectedVariantId);
    const img = item.product.featured_image || item.product.images?.[0];
    const canToggle = !isTrigger || s.allowDeselectTrigger;
    const showQty = s.showQuantityPicker;

    el.innerHTML = `
      <div class="sl-fbt__row ${isTrigger ? "sl-fbt__row--trigger" : ""} ${!item.selected ? "is-unchecked" : ""}">
        ${canToggle ? `
          <label class="sl-fbt__check">
            <input type="checkbox" data-role="row-check" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}" ${item.selected ? "checked" : ""} />
            <span class="sl-fbt__box"></span>
          </label>` : `<span class="sl-fbt__check-placeholder"></span>`}
        ${img ? `<img class="sl-fbt__img" src="${img}" alt="" />` : `<div class="sl-fbt__img sl-fbt__img--ph"></div>`}
        <div class="sl-fbt__meta">
          <div class="sl-fbt__name">${escapeHtml(item.product.title)}</div>
          ${renderVariantSelect(item.product, item.selectedVariantId, isTrigger, offerIdx)}
        </div>
        ${showQty ? `
          <div class="sl-fbt__qty">
            <button type="button" data-role="qty-dec" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-role="qty-inc" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">+</button>
          </div>` : ""}
        <div class="sl-fbt__price">${priceHTML(v)}</div>
      </div>
    `;
    wireRow(el);
  }

  function wireRow(el) {
    el.querySelectorAll("input[data-role=row-check]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const isT = e.target.dataset.trigger === "true";
        const idx = e.target.dataset.idx === "" ? null : Number(e.target.dataset.idx);
        if (isT) state.trigger.selected = e.target.checked;
        else state.offers[idx].selected = e.target.checked;
        renderBody();
        renderTotal();
      });
    });
    el.querySelectorAll("select[data-role=variant]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const isT = e.target.dataset.trigger === "true";
        const idx = e.target.dataset.idx === "" ? null : Number(e.target.dataset.idx);
        const id = Number(e.target.value);
        if (isT) state.trigger.selectedVariantId = id;
        else state.offers[idx].selectedVariantId = id;
        renderBody();
        renderTotal();
      });
    });
    el.querySelectorAll("[data-role=qty-inc], [data-role=qty-dec]").forEach((b) => {
      b.addEventListener("click", () => {
        const isT = b.dataset.trigger === "true";
        const idx = b.dataset.idx === "" ? null : Number(b.dataset.idx);
        const target = isT ? state.trigger : state.offers[idx];
        const delta = b.dataset.role === "qty-inc" ? 1 : -1;
        target.quantity = Math.max(1, target.quantity + delta);
        renderBody();
        renderTotal();
      });
    });
  }

  function renderVariantSelect(product, selectedId, isTrigger, offerIdx) {
    if (!product.variants || product.variants.length <= 1) return "";
    const opts = product.variants.map((v) =>
      `<option value="${v.id}" ${v.id === selectedId ? "selected" : ""}>${escapeHtml(v.title)}${v.available ? "" : " — Sold out"}</option>`,
    ).join("");
    return `<select class="sl-fbt__variant" data-role="variant" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">${opts}</select>`;
  }

  function priceHTML(v) {
    if (!v) return "";
    const hasCompare = v.compare_at_price && v.compare_at_price > v.price;
    return `${hasCompare ? `<span class="sl-fbt__compare">${money(v.compare_at_price, state.currency)}</span>` : ""}<span class="sl-fbt__current">${money(v.price, state.currency)}</span>`;
  }

  function renderTotal() {
    const el = state.mountEl.querySelector("[data-role=total]");
    if (!el) return;
    const items = buildCartItems();
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);

    const d = state.campaign.discount;
    let discountAmt = 0;
    let discountLabel = "";
    if (d && d.type !== "NONE") {
      let tier = null;
      if (d.type === "TIERED") {
        tier = [...d.tiers].filter((t) => totalQty >= t.minItems).sort((a, b) => b.minItems - a.minItems)[0];
      } else if (d.value) {
        tier = { value: d.value, valueType: d.type };
      }
      if (tier) {
        if (tier.valueType === "PERCENTAGE") {
          discountAmt = Math.round(subtotal * (tier.value / 100));
          discountLabel = `-${tier.value}%`;
        } else {
          discountAmt = Math.round(tier.value * 100);
          discountLabel = `-${money(discountAmt, state.currency)}`;
        }
      }
    }
    const total = Math.max(0, subtotal - discountAmt);

    el.innerHTML = `
      <div class="sl-fbt__total-row">
        <span class="sl-fbt__total-label">Total</span>
        <span>
          ${discountAmt > 0 ? `<span class="sl-fbt__compare">${money(subtotal, state.currency)}</span> <span class="sl-fbt__discount-tag">${discountLabel}</span>` : ""}
          <span class="sl-fbt__total-val">${money(total, state.currency)}</span>
        </span>
      </div>
    `;
  }

  function buildCartItems() {
    const items = [];

    if (state.trigger.selected) {
      const v = getVariant(state.trigger.product, state.trigger.selectedVariantId);
      if (v) {
        items.push({
          id: v.id,
          quantity: state.trigger.quantity,
          price: v.price,
          title: state.trigger.product.title,
          available: v.available,
        });
      }
    }

    state.offers.forEach((o) => {
      if (!o.selected) return;
      const v = getVariant(o.product, o.selectedVariantId);
      if (v) {
        items.push({
          id: v.id,
          quantity: o.quantity,
          price: v.price,
          title: o.product.title,
          available: v.available,
        });
      }
    });

    return items;
  }

  async function addBundleToCart() {
    const btn = state.mountEl.querySelector("[data-role=cta]");
    const errEl = state.mountEl.querySelector("[data-role=error]");
    errEl.hidden = true;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
      const items = buildCartItems();
      if (!items.length) throw new Error("Please select at least one item.");
      const unavail = items.filter((i) => !i.available);
      if (unavail.length) {
        throw new Error(`${unavail.map((u) => `"${u.title}"`).join(", ")} sold out.`);
      }

      const bundleId = `bundle_${state.campaign.id}_${Date.now()}`;
      const campaignName = state.campaign.title || "Bundle";

      const sectionsToRender = [];
      if (document.querySelector("cart-drawer")) {
        sectionsToRender.push("cart-drawer");
      }
      if (document.getElementById("cart-icon-bubble") ||
          document.querySelector("[id*='cart-icon-bubble']")) {
        sectionsToRender.push("cart-icon-bubble");
      }

      const body = {
        items: items.map((i, index) => ({
          id: i.id,
          quantity: i.quantity,
          properties: {
            "_bundle_id": bundleId,
            "_bundle_campaign_id": state.campaign.id,
            "_bundle_role": index === 0 ? "trigger" : "offer",
            "Bundle": campaignName,
          },
        })),
      };

      if (sectionsToRender.length) {
        body.sections = sectionsToRender.join(",");
        body.sections_url = window.location.pathname;
      }

      const addRes = await fetch(ROUTES.cartAdd, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(body),
      });

      const addData = await addRes.json();
      if (!addRes.ok) {
        throw new Error(addData.description || addData.message || `HTTP ${addRes.status}`);
      }

      const opened = await openCartDrawer(addData.sections);
      if (!opened) {
        window.location.href = ROUTES.cart;
        return;
      }

      btn.disabled = false;
      btn.textContent = original;
    } catch (e) {
      console.error("[selleasy]", e);
      errEl.textContent = e.message || "Could not add the bundle.";
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  async function openCartDrawer(sections) {
    const cartDrawer = document.querySelector("cart-drawer");

    if (cartDrawer && sections?.["cart-drawer"]) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sections["cart-drawer"], "text/html");

        const freshDrawer = doc.querySelector("cart-drawer");
        if (freshDrawer) {
          cartDrawer.innerHTML = freshDrawer.innerHTML;
          cartDrawer.classList.remove("is-empty");

          cartDrawer.querySelectorAll("cart-drawer-items, cart-items").forEach((el) => {
            if (typeof el.connectedCallback === "function") {
              try { el.connectedCallback(); } catch (e) {}
            }
          });
        }

        if (sections["cart-icon-bubble"]) {
          const bubble = document.getElementById("cart-icon-bubble") ||
                         document.querySelector("[id*='cart-icon-bubble']");
          if (bubble) {
            const bubbleDoc = parser.parseFromString(sections["cart-icon-bubble"], "text/html");
            const freshBubble = bubbleDoc.querySelector("#cart-icon-bubble") ||
                                bubbleDoc.querySelector(".shopify-section");
            if (freshBubble) {
              bubble.innerHTML = freshBubble.innerHTML;
            }
          }
        }

        if (typeof cartDrawer.open === "function") {
          cartDrawer.open();
        } else {
          cartDrawer.classList.add("active", "animate", "is-open");
          document.body.classList.add("overflow-hidden");
        }
        return true;
      } catch (e) {
        console.error("[selleasy] Dawn drawer update failed:", e);
      }
    }

    const eventNames = ["cart:refresh", "cart:updated", "cart:added", "cart:open", "cart-drawer:open"];
    eventNames.forEach((name) => {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    });

    if (window.theme?.CartDrawer) {
      try { new window.theme.CartDrawer().open(); return true; } catch (e) {}
    }

    const triggerSelectors = [
      "[data-cart-drawer-toggle]",
      ".js-drawer-open-cart",
      "#CartDrawer-trigger",
      ".header__icon--cart",
      "a[href='/cart']",
    ];
    for (const sel of triggerSelectors) {
      const el = document.querySelector(sel);
      if (el) { try { el.click(); return true; } catch (e) {} }
    }

    return false;
  }
})();
