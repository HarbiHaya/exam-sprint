let currentUser = null;
let users = {};

const LOCAL_SELECTED_KEY = "examSprintSelectedUser";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD20yUgzv41HO1-gCBvU4x0WDdTsMv41LY",
  authDomain: "exam-sprint-d3784.firebaseapp.com",
  projectId: "exam-sprint-d3784",
  storageBucket: "exam-sprint-d3784.firebasestorage.app",
  messagingSenderId: "953201070414",
  appId: "1:953201070414:web:16fedb14ef64a537a90e1f",
  measurementId: "G-5WRSHFQLME",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// One shared doc = your “shared JSON”
const docRef = db.collection("examSprint").doc("shared-v1");

// ---------- Name safety (important for Firestore keys)
function normalizeName(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, ""); // removes dots/slashes/arabic/emojis/etc

  return cleaned.slice(0, 15);
}

function saveSelectedUserLocal() {
  if (currentUser) localStorage.setItem(LOCAL_SELECTED_KEY, currentUser);
}

function restoreSelectedUserLocal() {
  return localStorage.getItem(LOCAL_SELECTED_KEY);
}

// ---------- Firestore realtime sync
function startRealtimeSync() {
  docRef.onSnapshot((snap) => {
    const data = snap.exists ? snap.data() : {};
    users = data.users || {};

    // restore selection per device (doesn't affect others)
    const saved = restoreSelectedUserLocal();
    if (saved && users[saved]) currentUser = saved;
    if (currentUser && !users[currentUser]) currentUser = null;

    renderUsers();
    loadUserTasks();
  });
}

// ---------- Firestore writes (JSON-like)
async function ensureUserExists(name) {
  if (users[name]) return;

  // merge so we never overwrite others
  await docRef.set(
    { users: { [name]: { tasks: {} } } },
    { merge: true }
  );
}

async function setTask(name, taskId, checked) {
  if (checked) {
    await docRef.set(
      { users: { [name]: { tasks: { [taskId]: true } } } },
      { merge: true }
    );
  } else {
    // delete the field instead of storing "false" (cleaner & smaller)
    await docRef.update({
      [`users.${name}.tasks.${taskId}`]: firebase.firestore.FieldValue.delete(),
    });
  }
}

async function removeUser(name) {
  await docRef.update({
    [`users.${name}`]: firebase.firestore.FieldValue.delete(),
  });
}

// ---------- UI actions (must be global because HTML uses onclick)
async function addUser() {
  const input = document.getElementById("userName");
  const name = normalizeName(input.value);

  if (!name) return;

  await ensureUserExists(name);

  currentUser = name;
  saveSelectedUserLocal();
  input.value = "";

  // UI will also update via realtime, but this feels instant
  renderUsers();
  loadUserTasks();
}

function selectUser(name) {
  currentUser = name;
  saveSelectedUserLocal();
  renderUsers();
  loadUserTasks();
}

async function deleteUser(name, e) {
  e.stopPropagation();

  if (!confirm("Remove " + name + "?")) return;

  await removeUser(name);

  if (currentUser === name) {
    currentUser = null;
    localStorage.removeItem(LOCAL_SELECTED_KEY);
  }
}

// expose to window for inline onclick usage
window.addUser = addUser;
window.selectUser = selectUser;
window.deleteUser = deleteUser;

// ---------- Rendering + progress
function getTotalTasks() {
  return document.querySelectorAll("input[data-task]").length;
}

function getProgress(name) {
  const user = users[name];
  if (!user) return 0;

  const total = getTotalTasks();
  const done = Object.values(user.tasks || {}).filter(Boolean).length;

  return total ? Math.round((done / total) * 100) : 0;
}

function getColor(p) {
  if (p < 25) return "var(--red)";
  if (p < 50) return "var(--orange)";
  if (p < 75) return "var(--yellow)";
  return "var(--green)";
}

function renderUsers() {
  const grid = document.getElementById("usersGrid");
  if (!grid) return;

  const names = Object.keys(users);

  if (!names.length) {
    grid.innerHTML =
      '<p class="no-users">No one here yet. Enter your name to start.</p>';
    return;
  }

  grid.innerHTML = names
    .sort()
    .map((name) => {
      const p = getProgress(name);
      const active = name === currentUser;

      return `
        <div class="user-card ${active ? "active" : ""}">
          <div class="user-header">
            <span class="name">${name}</span>
            <span class="percentage">${p}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${p}%;background:${getColor(
        p
      )}"></div>
          </div>
          <div class="user-actions">
            <button class="btn-select" onclick="selectUser('${name}')">${
        active ? "Selected" : "Select"
      }</button>
            <button class="btn-delete" onclick="deleteUser('${name}',event)">Remove</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function loadUserTasks() {
  document.querySelectorAll("input[data-task]").forEach((cb) => {
    cb.checked =
      currentUser && users[currentUser]
        ? !!(users[currentUser].tasks || {})[cb.dataset.task]
        : false;
  });

  updateCounters();
}

async function handleTask(e) {
  if (!currentUser) {
    alert("Enter your name first!");
    e.target.checked = false;
    return;
  }

  const taskId = e.target.dataset.task;
  const checked = e.target.checked;

  await ensureUserExists(currentUser);
  await setTask(currentUser, taskId, checked);

  // UI updates via realtime snapshot
}

function updateCounters() {
  document.querySelectorAll(".phase").forEach((phase) => {
    const checks = phase.querySelectorAll("input[data-task]");
    const done = Array.from(checks).filter((c) => c.checked).length;
    const counter = phase.querySelector(".phase-counter");
    if (counter) counter.textContent = done + "/" + checks.length;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // attach checkbox listeners
  document.querySelectorAll("input[data-task]").forEach((cb) => {
    cb.addEventListener("change", handleTask);
  });

  // enter to join
  const nameInput = document.getElementById("userName");
  if (nameInput) {
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addUser();
    });
  }

  startRealtimeSync();
});
