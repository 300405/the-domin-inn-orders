const state = {
  catalog: [],
  orders: [],
  cart: new Map(),
  categories: [],
  activeCategory: null,
  selectedOrderId: null,
  search: ""
};

const els = {
  lowStockCount: document.querySelector("#lowStockCount"),
  catalogStatus: document.querySelector("#catalogStatus"),
  categoryTabs: document.querySelector("#categoryTabs"),
  catalogGrid: document.querySelector("#catalogGrid"),
  searchInput: document.querySelector("#searchInput"),
  cartLines: document.querySelector("#cartLines"),
  lineCount: document.querySelector("#lineCount"),
  unitCount: document.querySelector("#unitCount"),
  clearCart: document.querySelector("#clearCart"),
  refreshOrders: document.querySelector("#refreshOrders"),
  orderHistory: document.querySelector("#orderHistory"),
  orderPreview: document.querySelector("#orderPreview"),
  submitOrder: document.querySelector("#submitOrder"),
  submitMessage: document.querySelector("#submitMessage"),
  neededBy: document.querySelector("#neededBy"),
  orderNote: document.querySelector("#orderNote"),
  emptyCartTemplate: document.querySelector("#emptyCartTemplate"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  closeSettings: document.querySelector("#closeSettings"),
  addItemForm: document.querySelector("#addItemForm"),
  editItemForm: document.querySelector("#editItemForm"),
  settingsAddName: document.querySelector("#settingsAddName"),
  settingsAddCategory: document.querySelector("#settingsAddCategory"),
  settingsEditItem: document.querySelector("#settingsEditItem"),
  settingsEditName: document.querySelector("#settingsEditName"),
  settingsEditCategory: document.querySelector("#settingsEditCategory"),
  settingsDeleteItem: document.querySelector("#settingsDeleteItem"),
  settingsMessage: document.querySelector("#settingsMessage")
};

init();

async function init() {
  setDefaultDate();
  bindEvents();
  await Promise.all([loadCatalog(), loadOrders()]);
  render();
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCatalog();
  });

  els.clearCart.addEventListener("click", () => {
    state.cart.clear();
    renderCart();
    renderCatalog();
    setMessage("", "");
  });

  els.refreshOrders.addEventListener("click", loadOrders);
  els.submitOrder.addEventListener("click", submitOrder);
  els.settingsButton.addEventListener("click", openSettings);
  els.closeSettings.addEventListener("click", closeSettings);
  els.settingsOverlay.addEventListener("click", (event) => {
    if (event.target === els.settingsOverlay) closeSettings();
  });
  els.addItemForm.addEventListener("submit", addSettingsItem);
  els.editItemForm.addEventListener("submit", saveSettingsItem);
  els.settingsEditItem.addEventListener("change", fillSettingsItem);
  els.settingsDeleteItem.addEventListener("click", deleteSettingsItem);
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/catalog");
    if (!response.ok) throw new Error("Stock catalogue unavailable");

    const data = await response.json();
    state.catalog = data.items || [];
    state.categories = buildOptions(state.catalog, "category");
    if (!state.categories.some((category) => category.id === state.activeCategory)) {
      state.activeCategory = state.categories[0]?.id || null;
    }
    els.catalogStatus.textContent = `${state.catalog.length} stock lines ready to order.`;
  } catch (error) {
    state.catalog = [];
    els.catalogStatus.textContent = error.message;
  }
}

async function loadOrders() {
  try {
    const response = await fetch("/api/orders");
    if (!response.ok) throw new Error("Saved orders unavailable");

    const data = await response.json();
    state.orders = data.orders || [];
    if (!state.selectedOrderId && state.orders.length) {
      state.selectedOrderId = state.orders[0].id;
    }
  } catch {
    state.orders = [];
  }

  renderOrders();
}

function setDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  els.neededBy.value = date.toISOString().slice(0, 10);
}

function buildOptions(items, key) {
  const values = [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return values.map((value) => ({ id: value, name: value }));
}

function render() {
  renderStatus();
  renderTabs();
  renderCatalog();
  renderCart();
  renderOrders();
}

function renderStatus() {
  const lowStock = state.catalog.filter((item) => item.onHand <= item.reorderPoint).length;
  els.lowStockCount.textContent = `${lowStock} low-stock ${lowStock === 1 ? "line" : "lines"}`;
}

function renderTabs() {
  els.categoryTabs.innerHTML = state.categories.map((category) => `
    <button class="tab-button" type="button" data-category="${escapeHtml(category.id)}" aria-selected="${category.id === state.activeCategory}">
      ${escapeHtml(category.name)}
    </button>
  `).join("");

  els.categoryTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      renderTabs();
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const items = filteredItems();

  if (!items.length) {
    els.catalogGrid.innerHTML = `
      <div class="empty-state">
        <strong>No matching stock</strong>
        <span>Try a different category or search.</span>
      </div>
    `;
    return;
  }

  els.catalogGrid.innerHTML = items.map((item) => {
    const low = item.onHand <= item.reorderPoint;
    const quantity = state.cart.get(item.id)?.quantity || 0;

    return `
      <article class="item-card ${low ? "is-low" : ""}">
        <header>
          <div class="card-title-row">
            <p class="eyeline">${escapeHtml(item.category)}</p>
            <div class="card-actions">
              <span class="stock-pill">${low ? "Low" : "OK"}</span>
              <button class="item-delete-button" type="button" data-item-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}" title="Delete item">×</button>
            </div>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
        </header>

        <div class="order-row">
          <div class="catalog-stepper" aria-label="Quantity for ${escapeHtml(item.name)}">
            <span>${quantity}</span>
            <button class="add-button" type="button" data-item-id="${escapeHtml(item.id)}" aria-label="Add one ${escapeHtml(item.name)}">+</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  els.catalogGrid.querySelectorAll(".add-button").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.itemId, 1));
  });

  els.catalogGrid.querySelectorAll(".item-delete-button").forEach((button) => {
    button.addEventListener("click", () => deleteStockItem(button.dataset.itemId));
  });
}

function filteredItems() {
  return state.catalog
    .filter((item) => {
      const categoryMatch = !state.activeCategory || item.category === state.activeCategory;
      const haystack = [item.name, item.category].join(" ").toLowerCase();
      const searchMatch = !state.search || haystack.includes(state.search);
      return categoryMatch && searchMatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function openSettings() {
  renderSettings();
  setSettingsMessage("", "");
  els.settingsOverlay.hidden = false;
  els.settingsAddName.focus();
}

function closeSettings() {
  els.settingsOverlay.hidden = true;
}

function renderSettings() {
  const categories = state.categories.length
    ? state.categories.map((category) => category.name)
    : ["Bottles", "Kegs", "Snacks", "Soft Drinks", "Spirits", "Wine"];
  const categoryOptions = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  const itemOptions = [...state.catalog]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
    .join("");

  els.settingsAddCategory.innerHTML = categoryOptions;
  els.settingsEditCategory.innerHTML = categoryOptions;
  els.settingsEditItem.innerHTML = itemOptions;
  fillSettingsItem();
}

function fillSettingsItem() {
  const item = state.catalog.find((entry) => entry.id === els.settingsEditItem.value);
  els.settingsEditName.value = item?.name || "";
  els.settingsEditCategory.value = item?.category || state.categories[0]?.name || "Bottles";
  els.settingsDeleteItem.disabled = !item;
}

async function addSettingsItem(event) {
  event.preventDefault();
  const name = els.settingsAddName.value.trim();
  if (!name) {
    setSettingsMessage("Add an item name first.", "error");
    return;
  }

  try {
    const response = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: els.settingsAddCategory.value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not add item.");

    els.settingsAddName.value = "";
    await loadCatalog();
    render();
    renderSettings();
    setSettingsMessage(`${data.item.name} added.`, "success");
  } catch (error) {
    setSettingsMessage(error.message, "error");
  }
}

async function saveSettingsItem(event) {
  event.preventDefault();
  const itemId = els.settingsEditItem.value;
  const name = els.settingsEditName.value.trim();
  if (!itemId || !name) {
    setSettingsMessage("Pick an item and enter a name.", "error");
    return;
  }

  try {
    const response = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: els.settingsEditCategory.value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not save item.");

    await loadCatalog();
    render();
    renderSettings();
    els.settingsEditItem.value = data.item.id;
    fillSettingsItem();
    setSettingsMessage(`${data.item.name} saved.`, "success");
  } catch (error) {
    setSettingsMessage(error.message, "error");
  }
}

async function deleteSettingsItem() {
  const itemId = els.settingsEditItem.value;
  const item = state.catalog.find((entry) => entry.id === itemId);
  if (!item) return;

  const confirmed = window.confirm(`Delete ${item.name}? This removes it from the catalogue.`);
  if (!confirmed) return;

  const response = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    setSettingsMessage(data.message || "Could not delete item.", "error");
    return;
  }

  state.cart.delete(itemId);
  await loadCatalog();
  render();
  renderSettings();
  setSettingsMessage(`${item.name} deleted.`, "success");
}

function addToCart(itemId, quantity) {
  const item = state.catalog.find((entry) => entry.id === itemId);
  if (!item) return;

  const existing = state.cart.get(itemId);
  state.cart.set(itemId, {
    ...item,
    quantity: existing ? existing.quantity + quantity : quantity
  });

  renderCart();
  renderCatalog();
  setMessage("", "");
}

function renderCart() {
  const lines = Array.from(state.cart.values());
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);

  els.lineCount.textContent = lines.length;
  els.unitCount.textContent = units;
  els.submitOrder.disabled = !lines.length;

  if (!lines.length) {
    els.cartLines.innerHTML = els.emptyCartTemplate.innerHTML;
    return;
  }

  els.cartLines.innerHTML = lines.map((line) => `
    <div class="cart-line">
      <div>
        <strong>${escapeHtml(line.name)}</strong>
      </div>
      <div class="line-controls">
        <button class="quantity-button" type="button" data-action="decrement" data-item-id="${escapeHtml(line.id)}" aria-label="Remove one ${escapeHtml(line.name)}">-</button>
        <input class="quantity-input" data-item-id="${escapeHtml(line.id)}" min="1" type="number" value="${line.quantity}" aria-label="Quantity for ${escapeHtml(line.name)}">
        <button class="quantity-button" type="button" data-action="increment" data-item-id="${escapeHtml(line.id)}" aria-label="Add one ${escapeHtml(line.name)}">+</button>
      </div>
    </div>
  `).join("");

  els.cartLines.querySelectorAll(".quantity-button").forEach((button) => {
    button.addEventListener("click", () => changeQuantity(button.dataset.itemId, button.dataset.action));
  });

  els.cartLines.querySelectorAll(".quantity-input").forEach((input) => {
    input.addEventListener("change", () => setQuantity(input.dataset.itemId, Number(input.value)));
  });
}

function renderOrders() {
  if (!els.orderHistory) return;

  if (!state.orders.length) {
    els.orderHistory.innerHTML = `
      <div class="mini-empty">
        <strong>No saved orders yet</strong>
        <span>Submitted orders will appear here.</span>
      </div>
    `;
    els.orderPreview.innerHTML = "";
    return;
  }

  if (!state.orders.some((order) => order.id === state.selectedOrderId)) {
    state.selectedOrderId = state.orders[0].id;
  }

  els.orderHistory.innerHTML = state.orders.map((order) => `
    <button class="order-file" type="button" data-order-id="${escapeHtml(order.id)}" aria-selected="${order.id === state.selectedOrderId}">
      <span>${escapeHtml(order.orderNumber)}</span>
      <small>${escapeHtml(formatDate(order.createdAt))}</small>
    </button>
  `).join("");

  els.orderHistory.querySelectorAll(".order-file").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrderId = button.dataset.orderId;
      renderOrders();
    });
  });

  renderOrderPreview();
}

function renderOrderPreview() {
  const order = state.orders.find((entry) => entry.id === state.selectedOrderId);
  if (!order) {
    els.orderPreview.innerHTML = "";
    return;
  }

  els.orderPreview.innerHTML = `
    <div class="preview-head">
      <div>
        <strong>${escapeHtml(order.orderNumber)}</strong>
        <span>${escapeHtml(formatDate(order.createdAt))}</span>
      </div>
      <div class="preview-actions">
        ${order.pdfPath ? `<a class="order-action" href="${escapeHtml(order.pdfPath)}" target="_blank" rel="noopener" download="${escapeHtml(getOrderPdfName(order))}">${escapeHtml(getOrderPdfName(order))}</a>` : ""}
        ${order.pdfPath ? `<button class="order-action" type="button" data-action="email" data-order-id="${escapeHtml(order.id)}">Email</button>` : ""}
        ${order.pdfPath ? `<button class="order-action" type="button" data-action="print" data-order-id="${escapeHtml(order.id)}">Print</button>` : ""}
        <button class="order-action is-danger" type="button" data-action="delete" data-order-id="${escapeHtml(order.id)}">Delete</button>
      </div>
    </div>
    <ul>
      ${order.lineItems.map((line) => `
        <li>
          <span>${escapeHtml(line.quantity)} x ${escapeHtml(line.name)}</span>
        </li>
      `).join("")}
    </ul>
  `;

  els.orderPreview.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "email") emailOrder(button.dataset.orderId);
      if (button.dataset.action === "print") printOrder(button.dataset.orderId);
      if (button.dataset.action === "delete") deleteSavedOrder(button.dataset.orderId);
    });
  });
}

function getOrderPdfName(order) {
  if (order.pdfFileName) return order.pdfFileName;
  const datePart = order.createdAt ? order.createdAt.slice(0, 10) : "order";
  return `${order.orderNumber}-${datePart}.pdf`;
}

async function emailOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;

  setMessage(`Emailing ${order.orderNumber} PDF...`, "");

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/email`, {
      method: "POST"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Email could not be sent.");

    setMessage(`Emailed ${data.pdfFileName} to The Domin Inn.`, "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function printOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order?.pdfPath) return;

  const printWindow = window.open(order.pdfPath, "_blank", "noopener");
  if (printWindow) {
    printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  }
}

async function deleteSavedOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;

  const confirmed = window.confirm(`Delete ${order.orderNumber}? This removes the saved order and PDF from the orders folder.`);
  if (!confirmed) return;

  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    setMessage(data.message || "Could not delete saved order.", "error");
    return;
  }

  state.selectedOrderId = null;
  await loadOrders();
  setMessage(`${order.orderNumber} deleted.`, "success");
}

function changeQuantity(itemId, action) {
  const line = state.cart.get(itemId);
  if (!line) return;

  setQuantity(itemId, line.quantity + (action === "increment" ? 1 : -1));
}

function setQuantity(itemId, quantity) {
  const line = state.cart.get(itemId);
  if (!line) return;

  const nextQuantity = Math.floor(Number(quantity));
  if (nextQuantity <= 0 || Number.isNaN(nextQuantity)) {
    state.cart.delete(itemId);
  } else {
    state.cart.set(itemId, { ...line, quantity: nextQuantity });
  }

  renderCart();
  renderCatalog();
}

async function deleteStockItem(itemId) {
  const item = state.catalog.find((entry) => entry.id === itemId);
  if (!item) return;

  const confirmed = window.confirm(`Delete ${item.name}? This removes it from the stock catalogue.`);
  if (!confirmed) return;

  const response = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    setMessage(data.message || "Could not delete stock item.", "error");
    return;
  }

  state.cart.delete(itemId);
  await loadCatalog();
  renderTabs();
  renderCatalog();
  renderCart();
  setMessage(`${item.name} deleted from stock.`, "success");
}

async function submitOrder() {
  const lines = Array.from(state.cart.values());

  if (!lines.length) {
    setMessage("Add at least one stock item first.", "error");
    return;
  }

  els.submitOrder.disabled = true;
  setMessage("Submitting stock order...", "");

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        neededBy: els.neededBy.value,
        note: els.orderNote.value.trim(),
        lineItems: lines.map((line) => ({
          id: line.id,
          name: line.name,
          sku: line.sku,
          supplier: line.supplier,
          quantity: line.quantity,
          unitCost: line.unitCost
        }))
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Order could not be submitted.");

    state.cart.clear();
    renderCart();
    renderCatalog();
    setMessage(`Submitted ${data.orderNumber} for ${data.lineCount} stock lines.`, "success");
    await loadOrders();
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    els.submitOrder.disabled = !state.cart.size;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function setMessage(message, type) {
  els.submitMessage.textContent = message;
  els.submitMessage.className = `submit-message${type ? ` is-${type}` : ""}`;
}

function setSettingsMessage(message, type) {
  els.settingsMessage.textContent = message;
  els.settingsMessage.className = `submit-message${type ? ` is-${type}` : ""}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
