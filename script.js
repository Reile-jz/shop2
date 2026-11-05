/* Kainah Diner — views, cart, checkout, order status */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const peso = (n) => "₱" + (Number.isInteger(n) ? n : n.toFixed(2));

const VIEWS = ["overview", "menu", "cart", "checkout", "status"];
const cart = [];
let orderSeq = 1042;
let order = null;

/* ---- persistence (best effort) ---- */
try {
  const saved = JSON.parse(sessionStorage.getItem("kainah-cart") || "[]");
  if (Array.isArray(saved)) saved.forEach((i) => i && i.id && cart.push(i));
  orderSeq = Number(sessionStorage.getItem("kainah-seq")) || orderSeq;
} catch (e) {}
function persist() {
  try {
    sessionStorage.setItem("kainah-cart", JSON.stringify(cart));
    sessionStorage.setItem("kainah-seq", String(orderSeq));
  } catch (e) {}
}

/* ---- cart helpers ---- */
const count = () => cart.reduce((a, i) => a + i.qty, 0);
const total = () => cart.reduce((a, i) => a + i.qty * i.price, 0);
const find = (id) => cart.find((i) => i.id === id);
const itemsText = () => `${count()} item${count() === 1 ? "" : "s"}`;

function setQty(id, qty, src) {
  let it = find(id);
  if (!it && qty > 0 && src) {
    it = { id, name: src.name, price: Number(src.price), img: src.img, qty: 0 };
    cart.push(it);
  }
  if (!it) return;
  it.qty = Math.max(0, qty);
  if (it.qty === 0) cart.splice(cart.indexOf(it), 1);
  render();
}

/* ---- rendering ---- */
function stepperHTML(id, qty, name) {
  return `<div class="stepper" role="group" aria-label="${name} quantity">
    <button type="button" data-act="dec" data-id="${id}" aria-label="Decrease ${name}">−</button>
    <output aria-live="polite">${qty}</output>
    <button type="button" data-act="inc" data-id="${id}" aria-label="Increase ${name}">+</button></div>`;
}

function render() {
  const n = count(), t = total();
  $$("[data-cart-count]").forEach((e) => (e.textContent = n));
  $$("[data-cart-total]").forEach((e) => (e.textContent = peso(t)));
  $$("[data-cart-items-text]").forEach((e) => (e.textContent = itemsText()));
  $("#overview-cart-link").hidden = n === 0;

  // menu controls
  $$("[data-control][data-id]").forEach((c) => {
    const { id, name } = c.dataset;
    const it = find(id);
    c.innerHTML = it
      ? stepperHTML(id, it.qty, name)
      : `<button class="btn btn-ghost" type="button" data-act="add" data-id="${id}" aria-label="Add ${name} to your cart">+ Add</button>`;
  });

  // summary lines
  const lines = cart.length
    ? cart.map((i) => `<li><span>${i.qty} × ${i.name}</span><span>${peso(i.qty * i.price)}</span></li>`).join("")
    : `<li class="none">Nothing added yet</li>`;
  $$("[data-summary-lines]").forEach((u) => (u.innerHTML = lines));

  // cart page
  $("#cart-list").innerHTML = cart
    .map(
      (i) => `<li class="cart-row">
      <img src="${i.img}" alt="" />
      <div class="info"><h3>${i.name}</h3><span>${peso(i.price)} each</span></div>
      <strong class="line-price">${peso(i.qty * i.price)}</strong>
      ${stepperHTML(i.id, i.qty, i.name)}
      <button class="remove" type="button" data-act="rm" data-id="${i.id}" aria-label="Remove ${i.name}">Remove</button></li>`
    )
    .join("");
  $("#cart-empty").hidden = n > 0;
  $("#to-checkout").style.display = n ? "" : "none";
  $("#place-order").disabled = false;
  $("#err-cart").hidden = n > 0;
  updateSticky();
  persist();
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id;
  const it = find(id);
  if (b.dataset.act === "add") {
    const c = b.closest("[data-control]");
    setQty(id, 1, { name: c.dataset.name, price: c.dataset.price, img: c.dataset.img });
  } else if (b.dataset.act === "inc") setQty(id, it.qty + 1);
  else if (b.dataset.act === "dec") setQty(id, it.qty - 1);
  else if (b.dataset.act === "rm") setQty(id, 0);
});

/* ---- routing ---- */
let current = "overview";
function route() {
  let h = (location.hash || "#overview").slice(1);
  if (h === "rice-meals" || h === "drinks") h = "menu";
  if (h === "reviews" || h === "contact") h = "overview";
  if (!VIEWS.includes(h)) h = "overview";
  if (h === "status" && !order) h = "overview";
  show(h);
}
function show(name, scroll = true) {
  const changed = name !== current;
  current = name;
  $$(".view").forEach((v) => (v.hidden = v.dataset.view !== name));
  $$(".tabs a").forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `${name === "overview" ? "" : name[0].toUpperCase() + name.slice(1) + " | "}Kainah Diner | QCU Canteen`;
  if (changed && scroll) window.scrollTo({ top: 0 });
  updateSticky();
  if (name === "checkout") render();
  if (name === "status") $("#status-title").focus({ preventScroll: true });
}
window.addEventListener("hashchange", () => {
  const raw = (location.hash || "").slice(1);
  route();
  if (raw === "rice-meals" || raw === "drinks") {
    const t = document.getElementById(raw);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* sticky bar: only on menu / overview, and only with items */
function updateSticky() {
  const on = count() > 0 && (current === "menu" || current === "overview");
  $("#sticky-cart").hidden = !on;
  document.body.classList.toggle("has-sticky", on);
}

/* menu category highlight */
const jump = $$(".jump a");
window.addEventListener("scroll", () => {
  if (current !== "menu") return;
  const drinks = $("#drinks");
  const stacked = getComputedStyle($(".menu-grid")).gridTemplateColumns.split(" ").length === 1;
  const active = stacked && drinks.getBoundingClientRect().top < 140 ? "drinks" : "rice-meals";
  jump.forEach((a) => a.classList.toggle("is-active", a.dataset.jump === active));
}, { passive: true });
jump.forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  const t = document.getElementById(a.dataset.jump);
  t.scrollIntoView({ behavior: "smooth", block: "start" });
  jump.forEach((x) => x.classList.toggle("is-active", x === a));
}));

/* open / closed (7:00 AM – 4:30 PM) */
function openState() {
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  const open = m >= 420 && m <= 990;
  const pill = $(".open-pill");
  pill.classList.toggle("is-closed", !open);
  $("#open-text").textContent = open ? "Open now" : "Closed · opens 7 AM";
}

/* ---- checkout ---- */
const form = $("#checkout-form");
const when = $$('input[name="when"]');
function syncWhen() {
  const later = when.find((r) => r.checked).value === "later";
  $("#time-field").hidden = !later;
  $$(".choice:not(.pay-choice)").forEach((c) => c.classList.toggle("is-selected", c.querySelector("input").checked));
}
when.forEach((r) => r.addEventListener("change", syncWhen));

function fail(input, err, bad) {
  err.hidden = !bad;
  input.setAttribute("aria-invalid", String(bad));
  return bad;
}
function fmtTime(v) {
  const [h, m] = v.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cart.length) { $("#err-cart").hidden = false; return; }
  const name = $("#pickup-name"), phone = $("#pickup-phone"), time = $("#pickup-time");
  const digits = phone.value.replace(/[\s-]/g, "");
  const badName = fail(name, $("#err-name"), name.value.trim().length < 2);
  const badPhone = fail(phone, $("#err-phone"), !/^(\+63|0)9\d{9}$/.test(digits));
  const later = when.find((r) => r.checked).value === "later";
  const badTime = later
    ? fail(time, $("#err-time"), !time.value || time.value < "07:00" || time.value > "16:30")
    : fail(time, $("#err-time"), false);
  if (badName || badPhone || badTime) {
    (badName ? name : badPhone ? phone : time).focus();
    return;
  }
  order = {
    number: orderSeq++,
    items: cart.map((i) => ({ ...i })),
    total: total(),
    name: name.value.trim(),
    pickup: later ? fmtTime(time.value) : "As soon as possible",
    notes: $("#notes").value.trim(),
  };
  $("#order-number").textContent = "#" + order.number;
  $("#status-lines").innerHTML = order.items
    .map((i) => `<li><span>${i.qty} × ${i.name}</span><span>${peso(i.qty * i.price)}</span></li>`).join("");
  $("#status-total").textContent = peso(order.total);
  $("#status-pickup").textContent = order.pickup;
  $("#status-name").textContent = order.name;
  $("#status-notes").textContent = order.notes;
  $("#status-notes-row").hidden = !order.notes;
  setStatus("preparing");
  cart.length = 0;
  render();
  location.hash = "#status";
});

function setStatus(s) {
  const ready = s === "ready";
  $("#status-title").textContent = ready ? "Your order is ready for pickup" : "Your order is being prepared";
  $("#status-msg").textContent = ready
    ? "Your order is ready. Please pick it up at Kainah Diner, Stall 2."
    : "The shop is preparing your order.";
  $$("#tracker li").forEach((li, i) => {
    li.classList.toggle("is-complete", ready || i === 0);
    li.classList.toggle("is-current", ready ? i === 2 : i === 1);
    li.toggleAttribute("aria-current", ready ? i === 2 : i === 1);
    if (li.hasAttribute("aria-current")) li.setAttribute("aria-current", "step");
  });
  const b = $("#sim-ready");
  b.disabled = ready;
  b.textContent = ready ? "Order marked ready" : "Simulate order ready";
}
$("#sim-ready").addEventListener("click", () => setStatus("ready"));
$("#new-order").addEventListener("click", () => {
  order = null;
  form.reset();
  syncWhen();
  $$("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
  $$(".err").forEach((x) => { if (x.id !== "err-cart") x.hidden = true; });
  location.hash = "#menu";
});

["#pickup-name","#pickup-phone","#pickup-time"].forEach((id) =>
  $(id).addEventListener("input", (e) => {
    e.target.removeAttribute("aria-invalid");
    const err = $("#err-" + id.split("-")[1]);
    if (err) err.hidden = true;
  })
);

/* ---- init ---- */
syncWhen();
openState();
render();
route();
