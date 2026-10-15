const STORAGE_KEY = "tweedeBrein.items";
const POINTS_KEY = "tweedeBrein.points";
const STREAK_KEY = "tweedeBrein.streak";
const HISTORY_KEY = "tweedeBrein.history";

// Wordt ingevuld na het deployen van de Cloudflare Worker.
const PUSH_SERVER_URL = "https://tweede-brein-push.content-bydidii-ed5.workers.dev";
const VAPID_PUBLIC_KEY =
  "BNOpO7EPE3WHFC5G0kaoSzbKeXpsjorXCLHa_dWei8tCerkgJRIuzxJ73YOaUzKXLCUD1ph8EBUYvXGwyaaL3V4";

const DAY_LABELS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

const POINTS_ADD = 1;
const POINTS_DONE = 3;
const POINTS_BONUS_POSTPONED = 2;

const DONE_PHRASES = [
  "Mooi gedaan",
  "Knap gedaan",
  "Goed bezig",
  "Dat is gelukt",
  "Netjes afgerond",
];

const TYPE_ICON = {
  taak: '<path d="M8 6h11M8 12h11M8 18h8" /><path d="M4 6h.01M4 12h.01M4 18h.01" />',
  afspraak:
    '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8 3.5v3M16 3.5v3" />',
  later: '<circle cx="12" cy="12.5" r="8" /><path d="M12 8.5v4l2.6 2" />',
};

const dumpInput = document.getElementById("dumpInput");
const dateInput = document.getElementById("dateInput");
const dateClear = document.getElementById("dateClear");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const statusEl = document.getElementById("status");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const progressChart = document.getElementById("progressChart");
const streakNum = document.getElementById("streakNum");
const overdueOverlay = document.getElementById("overdueOverlay");
const overdueList = document.getElementById("overdueList");
const notifyToggle = document.getElementById("notifyToggle");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadPoints() {
  return Number(localStorage.getItem(POINTS_KEY)) || 0;
}

function addPoints(amount) {
  const total = loadPoints() + amount;
  localStorage.setItem(POINTS_KEY, String(total));
  return total;
}

function levelFor(points) {
  return Math.floor(points / 100) + 1;
}

function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY)) || { lastActiveDate: "", count: 0 };
  } catch {
    return { lastActiveDate: "", count: 0 };
  }
}

function bumpStreakOncePerDay() {
  const streak = loadStreak();
  const today = todayStr();
  if (streak.lastActiveDate === today) {
    return streak.count;
  }
  streak.count += 1;
  streak.lastActiveDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak.count;
}

function renderStatus() {
  const points = loadPoints();
  const level = levelFor(points);
  statusEl.innerHTML = `<strong>Niveau ${level}</strong> · ${points} punten`;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
}

function logCompletion() {
  const history = loadHistory();
  const today = todayStr();
  history[today] = (history[today] || 0) + 1;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderProgress() {
  const history = loadHistory();
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: history[key] || 0, isToday: i === 0, weekday: d.getDay() });
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));

  progressChart.innerHTML = "";
  for (const day of days) {
    const barHeight = Math.round((day.count / maxCount) * 44) + 6;
    const bar = document.createElement("div");
    bar.className = "progress-bar" + (day.isToday ? " progress-bar--today" : "");
    bar.innerHTML = `
      <div class="progress-bar__fill" style="height:${barHeight}px"></div>
      <span class="progress-bar__day">${DAY_LABELS[day.weekday]}</span>
    `;
    progressChart.appendChild(bar);
  }

  streakNum.textContent = loadStreak().count;
}

function addItem(type) {
  const text = dumpInput.value.trim();
  if (!text) return;

  const chosenDate = dateInput.value;
  const due = chosenDate && chosenDate > todayStr() ? chosenDate : todayStr();

  const items = loadItems();
  items.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    type,
    due,
    done: false,
    postponed: false,
  });
  saveItems(items);
  addPoints(POINTS_ADD);

  dumpInput.value = "";
  clearDate();
  dumpInput.focus();
  render();
}

function clearDate() {
  dateInput.value = "";
  dateClear.hidden = true;
}

dateInput.min = todayStr();
dateInput.addEventListener("change", () => {
  dateClear.hidden = !dateInput.value;
});
dateClear.addEventListener("click", clearDate);

function markDone(id, cardEl) {
  const items = loadItems();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.done = true;
  saveItems(items);

  const gained = POINTS_DONE + (item.postponed ? POINTS_BONUS_POSTPONED : 0);
  addPoints(gained);
  bumpStreakOncePerDay();
  logCompletion();
  showToast(gained);

  cardEl.classList.add("item--leaving");
  setTimeout(render, 220);
}

function postponeToTomorrow(id, cardEl) {
  const items = loadItems();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.due = tomorrowStr();
  item.postponed = true;
  saveItems(items);

  cardEl.classList.add("item--leaving");
  setTimeout(render, 220);
}

function rescheduleItem(id, newDate) {
  if (!newDate) return;
  const items = loadItems();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.due = newDate;
  item.postponed = true;
  saveItems(items);
  render();
}

function formatDueDate(due) {
  const [y, m, d] = due.split("-");
  return `${d}-${m}-${y}`;
}

function renderOverdueOverlay() {
  const today = todayStr();
  const overdue = loadItems().filter((i) => !i.done && i.due < today);

  if (overdue.length === 0) {
    overdueOverlay.hidden = true;
    overdueList.innerHTML = "";
    return;
  }

  overdueOverlay.hidden = false;
  overdueList.innerHTML = "";

  for (const item of overdue) {
    const li = document.createElement("li");
    li.className = "overdue-item";
    li.innerHTML = `
      <div class="overdue-item__top">
        <svg class="overdue-item__type" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          ${TYPE_ICON[item.type] || TYPE_ICON.taak}
        </svg>
        <span class="overdue-item__text"></span>
      </div>
      <div class="overdue-item__due"></div>
      <div class="overdue-item__actions">
        <button class="overdue-item__btn overdue-item__btn--done">Gedaan</button>
        <label class="overdue-item__btn overdue-item__btn--reschedule">
          Nieuwe datum
          <input type="date" />
        </label>
      </div>
    `;

    li.querySelector(".overdue-item__text").textContent = item.text;
    li.querySelector(".overdue-item__due").textContent = `Gepland voor ${formatDueDate(item.due)}`;
    li.querySelector(".overdue-item__btn--done").addEventListener("click", () =>
      markDone(item.id, li)
    );

    const rescheduleInput = li.querySelector('input[type="date"]');
    rescheduleInput.min = today;
    rescheduleInput.addEventListener("change", () =>
      rescheduleItem(item.id, rescheduleInput.value)
    );

    overdueList.appendChild(li);
  }
}

function showToast(gained) {
  const phrase = DONE_PHRASES[Math.floor(Math.random() * DONE_PHRASES.length)];
  toastText.textContent = `${phrase} · +${gained}`;

  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 1500);
}

function render() {
  const today = todayStr();
  const items = loadItems().filter((i) => !i.done && i.due <= today);

  list.innerHTML = "";
  empty.hidden = items.length > 0;

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "item";

    li.innerHTML = `
      <div class="item__top">
        <svg class="item__type" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          ${TYPE_ICON[item.type] || TYPE_ICON.taak}
        </svg>
        <span class="item__text"></span>
      </div>
      <div class="item__actions">
        <button class="item__btn item__btn--done">Gedaan</button>
        <button class="item__btn item__btn--tomorrow">Morgen</button>
      </div>
    `;

    li.querySelector(".item__text").textContent = item.text;
    li.querySelector(".item__btn--done").addEventListener("click", () =>
      markDone(item.id, li)
    );
    li.querySelector(".item__btn--tomorrow").addEventListener("click", () =>
      postponeToTomorrow(item.id, li)
    );

    list.appendChild(li);
  }

  renderStatus();
  renderProgress();
  renderOverdueOverlay();
}

document.querySelectorAll(".dump__buttons .btn").forEach((btn) => {
  btn.addEventListener("click", () => addItem(btn.dataset.type));
});

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getExistingSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function updateNotifyToggle() {
  if (!notifyToggle) return;
  const sub = await getExistingSubscription();
  notifyToggle.classList.toggle("notify-toggle--on", !!sub);
  notifyToggle.setAttribute(
    "aria-label",
    sub ? "Herinneringen staan aan" : "Herinneringen uitgeschakeld"
  );
}

async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await fetch(`${PUSH_SERVER_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

async function disablePush() {
  const sub = await getExistingSubscription();
  if (!sub) return;

  await fetch(`${PUSH_SERVER_URL}/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});

  await sub.unsubscribe();
}

if (notifyToggle && "serviceWorker" in window.navigator && "PushManager" in window) {
  notifyToggle.addEventListener("click", async () => {
    const sub = await getExistingSubscription();
    if (sub) {
      await disablePush();
    } else {
      await enablePush();
    }
    updateNotifyToggle();
  });
  updateNotifyToggle();
} else if (notifyToggle) {
  notifyToggle.hidden = true;
}
