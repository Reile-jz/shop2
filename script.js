const cartItems = [];
const desktopLayout = window.matchMedia("(min-width: 900px)");
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const elements = {
  menuView: document.getElementById("menu-view"),
  statusScreen: document.getElementById("status-screen"),
  statusTitle: document.getElementById("status-title"),
  statusMessage: document.getElementById("status-message"),
  orderNumber: document.getElementById("order-number"),
  orderTotal: document.getElementById("order-total"),
  orderSummary: document.getElementById("order-summary"),
  requestedPickupTime: document.getElementById("requested-pickup-time"),
  notesRow: document.getElementById("notes-row"),
  orderNotes: document.getElementById("order-notes"),
  tracker: document.getElementById("tracker"),
  cartPanel: document.getElementById("cart-panel"),
  cartContent: document.getElementById("cart-content"),
  cartHeading: document.getElementById("cart-heading"),
  cartBackdrop: document.getElementById("cart-backdrop"),
  cartItems: document.getElementById("cart-items"),
  cartEmpty: document.getElementById("cart-empty"),
  cartCount: document.getElementById("cart-count"),
  clearCartButton: document.getElementById("clear-cart-button"),
  closeCartButton: document.getElementById("close-cart-button"),
  sheetHandle: document.getElementById("sheet-handle"),
  sheetTitle: document.getElementById("sheet-title"),
  sheetCount: document.getElementById("sheet-count"),
  sheetTotal: document.getElementById("sheet-total"),
  navCartButton: document.getElementById("nav-cart-button"),
  navCartCount: document.getElementById("nav-cart-count"),
  loginLink: document.getElementById("login-link"),
  drawerTotal: document.getElementById("drawer-total"),
  pickupTime: document.getElementById("pickup-time"),
  pickupError: document.getElementById("pickup-error"),
  notes: document.getElementById("special-instructions"),
  notesCount: document.getElementById("notes-count"),
  checkoutForm: document.getElementById("checkout-form"),
  confirmOrderButton: document.getElementById("confirm-order-button"),
  simulateReadyButton: document.getElementById("simulate-ready-button"),
  newOrderButton: document.getElementById("new-order-button"),
  prototypeControls: document.getElementById("prototype-controls"),
};

let cartIsOpen = false;
let orderSequence = 1042;


/* ---------- Cart helpers ---------- */

function getItemCount() {
  return cartItems.reduce((count, item) => count + item.quantity, 0);
}

function getCartTotal() {
  return cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
}

function formatPrice(amount) {
  return currency.format(amount);
}

function getCartItem(id) {
  return cartItems.find((item) => item.id === id);
}


/* ---------- Bottom sheet (mobile) ---------- */

function getCollapsedOffset() {
  return Math.max(
    0,
    elements.cartPanel.offsetHeight - elements.sheetHandle.offsetHeight,
  );
}

function syncSheet() {
  const hasItems = cartItems.length > 0;

  if (desktopLayout.matches) {
    cartIsOpen = false;
    elements.cartPanel.classList.remove("is-open", "is-empty", "is-dragging");
    elements.cartPanel.style.transform = "";
    elements.cartPanel.inert = false;
    elements.cartContent.inert = false;
    elements.cartPanel.setAttribute("role", "complementary");
    elements.cartPanel.removeAttribute("aria-modal");
    elements.cartBackdrop.classList.remove("is-visible");
    elements.sheetHandle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cart-open", "has-cart");
    return;
  }

  elements.cartPanel.hidden = false;

  if (!hasItems) cartIsOpen = false;

  const open = cartIsOpen && hasItems;

  elements.cartPanel.classList.toggle("is-empty", !hasItems);
  elements.cartPanel.classList.toggle("is-open", open);
  elements.cartPanel.inert = !hasItems;
  elements.cartContent.inert = !open;
  elements.cartPanel.setAttribute("role", open ? "dialog" : "region");

  if (open) {
    elements.cartPanel.setAttribute("aria-modal", "true");
  } else {
    elements.cartPanel.removeAttribute("aria-modal");
  }

  elements.sheetHandle.setAttribute("aria-expanded", String(open));
  elements.sheetTitle.textContent = open ? "Hide order" : "View order";
  elements.cartBackdrop.classList.toggle("is-visible", open);
  document.body.classList.toggle("cart-open", open);
  document.body.classList.toggle("has-cart", hasItems);
}

function setCartOpen(open, restoreFocus = true) {
  if (desktopLayout.matches) {
    elements.cartPanel.hidden = !open;

    if (open) {
      elements.cartPanel.scrollIntoView({ block: "center" });
      elements.cartHeading.focus({ preventScroll: true });
    } else {
      elements.navCartButton.focus({ preventScroll: true });
    }

    return;
  }

  if (open && !cartItems.length) return;

  cartIsOpen = open;
  syncSheet();

  if (open) {
    elements.cartHeading.focus({ preventScroll: true });
  } else if (restoreFocus) {
    elements.sheetHandle.focus({ preventScroll: true });
  }
}

const drag = {
  active: false,
  moved: false,
  suppressClick: false,
  startY: 0,
  startOffset: 0,
  offset: 0,
  lastY: 0,
  lastTime: 0,
  velocity: 0,
};

elements.sheetHandle.addEventListener("pointerdown", (event) => {
  if (desktopLayout.matches || !cartItems.length) return;

  drag.active = true;
  drag.moved = false;
  drag.startY = event.clientY;
  drag.startOffset = cartIsOpen ? 0 : getCollapsedOffset();
  drag.offset = drag.startOffset;
  drag.lastY = event.clientY;
  drag.lastTime = event.timeStamp;
  drag.velocity = 0;

  elements.sheetHandle.setPointerCapture(event.pointerId);
});

elements.sheetHandle.addEventListener("pointermove", (event) => {
  if (!drag.active) return;

  const delta = event.clientY - drag.startY;

  if (!drag.moved) {
    if (Math.abs(delta) < 6) return;

    drag.moved = true;
    elements.cartPanel.classList.add("is-dragging");
    elements.cartBackdrop.style.visibility = "visible";
  }

  const collapsed = getCollapsedOffset();

  drag.offset = Math.min(
    collapsed,
    Math.max(0, drag.startOffset + delta),
  );

  elements.cartPanel.style.transform = `translateY(${drag.offset}px)`;
  elements.cartContent.inert = false;

  const progress = collapsed ? 1 - drag.offset / collapsed : 1;

  elements.cartBackdrop.style.opacity = String(progress);

  const dt = event.timeStamp - drag.lastTime;

  if (dt > 0) {
    drag.velocity = (event.clientY - drag.lastY) / dt;
  }

  drag.lastY = event.clientY;
  drag.lastTime = event.timeStamp;
});

function endDrag(event) {
  if (!drag.active) return;

  drag.active = false;

  if (elements.sheetHandle.hasPointerCapture(event.pointerId)) {
    elements.sheetHandle.releasePointerCapture(event.pointerId);
  }

  if (!drag.moved) return;

  const collapsed = getCollapsedOffset();

  let shouldOpen;

  if (Math.abs(drag.velocity) > 0.4) {
    shouldOpen = drag.velocity < 0;
  } else {
    shouldOpen = drag.offset < collapsed / 2;
  }

  drag.suppressClick = true;

  window.setTimeout(() => {
    drag.suppressClick = false;
  }, 0);

  elements.cartPanel.classList.remove("is-dragging");
  elements.cartPanel.style.transform = "";
  elements.cartBackdrop.style.opacity = "";
  elements.cartBackdrop.style.visibility = "";

  cartIsOpen = shouldOpen;

  syncSheet();
}

elements.sheetHandle.addEventListener("pointerup", endDrag);
elements.sheetHandle.addEventListener("pointercancel", endDrag);

elements.sheetHandle.addEventListener("click", () => {
  if (drag.suppressClick) return;

  setCartOpen(!cartIsOpen, false);
});


/* ---------- Rendering ---------- */

function createCartItem(item) {
  const row = document.createElement("li");
  row.className = "cart-item";

  const thumbnail = document.createElement("img");
  thumbnail.className = "cart-item-thumb";
  thumbnail.src = item.image;
  thumbnail.alt = "";
  thumbnail.loading = "lazy";

  const info = document.createElement("div");
  info.className = "cart-item-info";

  const name = document.createElement("p");
  name.className = "cart-item-name";
  name.textContent = item.name;

  const subtotal = document.createElement("strong");
  subtotal.className = "cart-item-subtotal";
  subtotal.textContent = formatPrice(item.price * item.quantity);

  info.append(name, subtotal);

  const controls = document.createElement("div");
  controls.className = "cart-item-controls";

  const decrease = document.createElement("button");
  decrease.className = "quantity-control";
  decrease.type = "button";
  decrease.dataset.cartAction = "decrease";
  decrease.dataset.id = item.id;
  decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
  decrease.textContent = "−";

  const quantity = document.createElement("span");
  quantity.className = "cart-item-quantity";
  quantity.textContent = String(item.quantity);
  quantity.setAttribute("aria-label", `Quantity ${item.quantity}`);

  const increase = document.createElement("button");
  increase.className = "quantity-control";
  increase.type = "button";
  increase.dataset.cartAction = "increase";
  increase.dataset.id = item.id;
  increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
  increase.textContent = "+";

  controls.append(decrease, quantity, increase);
  row.append(thumbnail, info, controls);

  return row;
}

function updateMenuQuantities() {
  document.querySelectorAll("[data-product-card]").forEach((card) => {
    const id = card.dataset.productCard;
    const item = getCartItem(id);

    const quantity = card.querySelector("[data-product-quantity]");
    const addButton = card.querySelector(".add-btn:not(:disabled)");

    if (quantity) {
      quantity.textContent = item ? `${item.quantity} in order` : "";
    }

    if (addButton) {
      const name = addButton.dataset.name;

      addButton.setAttribute(
        "aria-label",
        item
          ? `Add another ${name}; ${item.quantity} in your order`
          : `Add ${name} to your order`,
      );
    }
  });
}

function updateConfirmState() {
  elements.confirmOrderButton.disabled =
    !cartItems.length || !elements.pickupTime.value;
}

function renderCart() {
  const itemCount = getItemCount();
  const total = getCartTotal();
  const hasItems = cartItems.length > 0;

  const formattedCount = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  const formattedTotal = formatPrice(total);

  elements.cartItems.replaceChildren(...cartItems.map(createCartItem));

  elements.cartEmpty.hidden = hasItems;
  elements.clearCartButton.hidden = !hasItems;

  elements.cartCount.textContent = formattedCount;
  elements.sheetCount.textContent = formattedCount;
  elements.sheetTotal.textContent = formattedTotal;
  elements.drawerTotal.textContent = formattedTotal;
  elements.navCartCount.textContent = String(itemCount);

  elements.navCartButton.setAttribute(
    "aria-label",
    `View your order, ${formattedCount}`,
  );

  updateConfirmState();
  updateMenuQuantities();
  syncSheet();
}


/* ---------- Cart actions ---------- */

function addToCart(button) {
  const { id, name, price: rawPrice } = button.dataset;
  const price = Number(rawPrice);

  if (!id || !name || !Number.isFinite(price) || price < 0) {
    console.error(
      "Cannot add menu item: its ID, name, or price is invalid.",
      button,
    );
    return;
  }

  const existing = getCartItem(id);

  if (existing) {
    existing.quantity += 1;
  } else {
    const image =
      button
        .closest("[data-product-card]")
        ?.querySelector(".item-image")
        ?.getAttribute("src") || "";

    cartItems.push({
      id,
      name,
      price,
      image,
      quantity: 1,
    });
  }

  renderCart();
}

function updateCartItem(button) {
  const item = getCartItem(button.dataset.id);

  if (!item) return;

  if (button.dataset.cartAction === "increase") {
    item.quantity += 1;

  } else if (button.dataset.cartAction === "decrease") {
    item.quantity -= 1;

    if (item.quantity <= 0) {
      cartItems.splice(cartItems.indexOf(item), 1);
    }

  } else if (button.dataset.cartAction === "remove") {
    cartItems.splice(cartItems.indexOf(item), 1);
  }

  renderCart();
}

function clearCart() {
  if (!cartItems.length) return;

  if (!window.confirm("Remove all items from your order?")) return;

  cartItems.length = 0;

  renderCart();
}


/* ---------- Checkout ---------- */

function setPickupError(visible) {
  elements.pickupError.hidden = !visible;

  elements.pickupTime.setAttribute(
    "aria-invalid",
    String(visible),
  );
}

function formatPickupTime(value) {
  const [hours, minutes] = value.split(":").map(Number);

  const pickupDate = new Date();

  pickupDate.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(pickupDate);
}

function setOrderStatus(status) {
  const isReady = status === "ready";

  elements.statusTitle.textContent = isReady
    ? "Your order is ready for pickup"
    : "Your order is being prepared";

  elements.statusMessage.textContent = isReady
    ? "Your order is ready. Please pick it up at Kainah Diner."
    : "The shop is preparing your order.";

  elements.tracker
    .querySelectorAll("[data-status-step]")
    .forEach((step, index) => {
      const completed = isReady || index === 0;
      const current = isReady ? index === 2 : index === 1;

      step.classList.toggle("is-complete", completed);
      step.classList.toggle("is-current", current);

      if (current) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });

  elements.simulateReadyButton.disabled = isReady;

  elements.simulateReadyButton.textContent = isReady
    ? "Order marked ready"
    : "Simulate order ready";
}

function renderOrderSummary() {
  const rows = cartItems.map((item) => {
    const row = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = `${item.quantity}× ${item.name}`;

    const price = document.createElement("span");
    price.textContent = formatPrice(item.price * item.quantity);

    row.append(label, price);

    return row;
  });

  elements.orderSummary.replaceChildren(...rows);
}

function placeOrder(event) {
  event.preventDefault();

  if (!cartItems.length) return;

  if (!elements.pickupTime.value) {
    setPickupError(true);
    elements.pickupTime.focus();
    return;
  }

  const notes = elements.notes.value.trim();

  setPickupError(false);

  elements.orderNumber.textContent = `#${orderSequence}`;
  elements.orderTotal.textContent = formatPrice(getCartTotal());

  elements.requestedPickupTime.textContent = formatPickupTime(
    elements.pickupTime.value,
  );

  elements.orderNotes.textContent = notes;
  elements.notesRow.hidden = !notes;

  renderOrderSummary();
  setOrderStatus("preparing");

  cartIsOpen = false;

  syncSheet();

  document.body.classList.remove("has-cart");

  elements.menuView.hidden = true;
  elements.statusScreen.hidden = false;
  elements.cartPanel.hidden = true;

  elements.statusTitle.focus();

  orderSequence += 1;
}

function startNewOrder() {
  cartItems.length = 0;

  elements.pickupTime.value = "";
  elements.notes.value = "";

  updateNotesCount();
  setPickupError(false);

  elements.statusScreen.hidden = true;
  elements.menuView.hidden = false;
  elements.cartPanel.hidden = false;

  elements.statusMessage.textContent =
    "The shop is preparing your order.";

  elements.prototypeControls.removeAttribute("open");

  setOrderStatus("preparing");

  renderCart();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function updateNotesCount() {
  elements.notesCount.textContent =
    `${elements.notes.value.length}/${elements.notes.maxLength}`;
}


/* ---------- Events ---------- */

elements.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-cart-action]");

  if (button) updateCartItem(button);
});

document.querySelectorAll(".add-btn:not(:disabled)").forEach((button) => {
  button.addEventListener("click", () => addToCart(button));
});

elements.clearCartButton.addEventListener("click", clearCart);

elements.closeCartButton.addEventListener("click", () =>
  setCartOpen(false),
);

elements.cartBackdrop.addEventListener("click", () =>
  setCartOpen(false),
);

elements.checkoutForm.addEventListener("submit", placeOrder);

elements.navCartButton.addEventListener("click", () =>
  setCartOpen(true),
);

elements.loginLink.addEventListener("click", (event) =>
  event.preventDefault(),
);

elements.pickupTime.addEventListener("input", () => {
  if (elements.pickupTime.value) {
    setPickupError(false);
  }

  updateConfirmState();
});

elements.notes.addEventListener("input", updateNotesCount);

elements.simulateReadyButton.addEventListener("click", () =>
  setOrderStatus("ready"),
);

elements.newOrderButton.addEventListener("click", startNewOrder);


document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartIsOpen) {
    setCartOpen(false);
    return;
  }

  if (event.key !== "Tab" || !cartIsOpen) return;

  const focusable = [
    ...elements.cartPanel.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], summary, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(
    (element) => !element.hidden && !element.closest("[hidden]"),
  );

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();

  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {
    event.preventDefault();
    first.focus();
  }
});

desktopLayout.addEventListener("change", () => {
  syncSheet();
  renderCart();
});


/* ---------- Category navigation: click + scroll direction ---------- */

const categoryLinks = [
  ...document.querySelectorAll(".category-nav a"),
];

const menuSections = [
  ...document.querySelectorAll(".menu-section"),
];

const categoryNav = document.querySelector(".category-nav");

function setActiveCategory(sectionId) {
  categoryLinks.forEach((link) => {
    if (link.getAttribute("href") === `#${sectionId}`) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateActiveCategory() {
  if (!categoryNav || !menuSections.length) return;

  const firstSectionMargin = Number.parseFloat(
    window.getComputedStyle(menuSections[0]).scrollMarginTop,
  );

  const activationLine = Math.max(
    categoryNav.getBoundingClientRect().bottom,
    Number.isFinite(firstSectionMargin) ? firstSectionMargin : 0,
  ) + 12;

  let activeSection = menuSections[0];

  menuSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= activationLine) {
      activeSection = section;
    }
  });

  setActiveCategory(activeSection.id);
}

let pendingCategoryId = null;
let pendingCategoryTimer = null;

function finishCategoryNavigation() {
  if (!pendingCategoryId) return;

  const selectedId = pendingCategoryId;

  pendingCategoryId = null;

  if (pendingCategoryTimer !== null) {
    window.clearTimeout(pendingCategoryTimer);
    pendingCategoryTimer = null;
  }

  // Keep the clicked tab selected at the end of its smooth-scroll animation.
  setActiveCategory(selectedId);
}

if (categoryNav) {
  categoryNav.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link || !categoryNav.contains(link)) return;

    const targetId = link.getAttribute("href").slice(1);
    const target = document.getElementById(targetId);

    if (!target) return;

    event.preventDefault();

    pendingCategoryId = targetId;

    setActiveCategory(targetId);

    const marginTop = Number.parseFloat(
      window.getComputedStyle(target).scrollMarginTop,
    ) || 0;

    const targetTop =
      target.getBoundingClientRect().top +
      window.scrollY -
      marginTop;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });

    if (pendingCategoryTimer !== null) {
      window.clearTimeout(pendingCategoryTimer);
    }

    pendingCategoryTimer = window.setTimeout(
      finishCategoryNavigation,
      2000,
    );
  });
}

// Native scrollend is used when available; the timeout above is a fallback.
window.addEventListener("scrollend", finishCategoryNavigation);


// A deliberate manual gesture cancels the click lock so normal tracking resumes.
function cancelPendingCategoryNavigation() {
  if (!pendingCategoryId) return;

  pendingCategoryId = null;

  if (pendingCategoryTimer !== null) {
    window.clearTimeout(pendingCategoryTimer);
    pendingCategoryTimer = null;
  }
}

window.addEventListener(
  "wheel",
  cancelPendingCategoryNavigation,
  { passive: true },
);

window.addEventListener(
  "touchstart",
  cancelPendingCategoryNavigation,
  { passive: true },
);


const categoryNavNaturalTop = categoryNav
  ? categoryNav.getBoundingClientRect().top + window.scrollY
  : 0;

let lastScrollY = window.scrollY;
let categoryUpdateScheduled = false;

window.addEventListener(
  "scroll",
  () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    lastScrollY = currentScrollY;

    if (categoryNav) {
      if (currentScrollY <= categoryNavNaturalTop - 8) {
        // At its original page position, the category bar behaves normally.
        categoryNav.classList.remove(
          "is-scrolling-down",
          "is-hidden-up",
        );

      } else if (delta > 2) {
        categoryNav.classList.add("is-scrolling-down");
        categoryNav.classList.remove("is-hidden-up");

      } else if (delta < -2) {
        categoryNav.classList.remove("is-scrolling-down");
        categoryNav.classList.add("is-hidden-up");
      }
    }

    if (pendingCategoryId || categoryUpdateScheduled) return;

    categoryUpdateScheduled = true;

    window.requestAnimationFrame(() => {
      categoryUpdateScheduled = false;
      updateActiveCategory();
    });
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  updateActiveCategory();
});


/* ---------- Initialization ---------- */

updateNotesCount();
renderCart();
updateActiveCategory();