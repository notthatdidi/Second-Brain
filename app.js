const STORAGE_KEY = "tweedeBrein.items";
const POINTS_KEY = "tweedeBrein.points";
const STREAK_KEY = "tweedeBrein.streak";

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
  const streak = loadStreak();
  const streakCount = streak.count;

  statusEl.innerHTML = `<strong>Niveau ${level}</strong> · ${points} punten<br>${streakCount} ${
    streakCount === 1 ? "dag" : "dagen"
  } op rij`;
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
