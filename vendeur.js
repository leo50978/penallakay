import {
  creditUserCoins,
  findUserProfileByUsername,
  initFirebaseClient,
  loadUserProfile,
  loadVendorTransactions,
  loginWithUsername,
  signOutUser,
} from "./auth-client.js";

const loginPanel = document.getElementById("vendor-login-panel");
const appPanel = document.getElementById("vendor-app-panel");
const loginForm = document.getElementById("vendor-login-form");
const loginFeedback = document.getElementById("vendor-login-feedback");
const vendorFeedback = document.getElementById("vendor-feedback");
const vendorLogout = document.getElementById("vendor-logout");
const vendorBalance = document.getElementById("vendor-balance");
const searchForm = document.getElementById("vendor-search-form");
const resultCard = document.getElementById("vendor-result");
const resultName = document.getElementById("vendor-result-name");
const resultCoins = document.getElementById("vendor-result-coins");
const creditForm = document.getElementById("vendor-credit-form");
const historyList = document.getElementById("vendor-history-list");
const historyMoreButton = document.getElementById("vendor-history-more");
const passwordToggleButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));

let currentVendorUser = null;
let selectedUser = null;
let historyCursor = null;
let historyHasMore = false;
let historyLoading = false;

function renderLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function formatCoins(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatHistoryDate(value) {
  const date = value?.toDate instanceof Function ? value.toDate() : null;
  if (!date) {
    return "Kounye a";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function setFeedback(target, message, kind = "info") {
  if (!target) {
    return;
  }

  target.textContent = message || "";
  target.dataset.kind = kind;
}

function setBusy(form, isBusy) {
  form?.querySelectorAll("input, button").forEach((element) => {
    element.disabled = isBusy;
  });
}

function getFieldValue(form, name) {
  const field = form?.elements?.namedItem(name);
  return typeof field?.value === "string" ? field.value : "";
}

function getAuthMessage(error) {
  const code = error?.code || "";
  if (code === "auth/network-request-failed") {
    return "Rezo a pa disponib. Verifye koneksyon an epi reeseye.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-email" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "Non itilizate a oswa modpas la pa bon.";
  }
  return "Nou pa ka konekte kont lan kounye a.";
}

function getCreditMessage(error) {
  const code = error?.code || error?.message || "";
  if (code === "permission-denied") {
    return "Firebase pa bay kont sa dwa pou kredite coin yo.";
  }
  if (code === "self-credit-forbidden") {
    return "Yon vendeur pa ka kredite pwop kont pa li.";
  }
  if (code === "insufficient-vendor-coins") {
    return "Ou pa gen ase coin sou kont vendeur la pou fe tranzaksyon sa.";
  }
  if (code === "credit-minimum-not-reached") {
    return "Yon vendeur pa ka kredite mwens pase 90 coins.";
  }
  if (code === "vendor-not-found") {
    return "Kont vendeur la pa jwenn.";
  }
  if (code === "target-not-found") {
    return "User sa pa egziste anko.";
  }
  return "Nou pa ka kredite kont lan kounye a.";
}

function togglePasswordVisibility(button) {
  const wrapper = button.closest(".auth-password");
  const input = wrapper?.querySelector("input");
  if (!input) {
    return;
  }

  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";
  button.setAttribute("aria-label", showPassword ? "Kache modpas la" : "Montre modpas la");
  button.innerHTML = `<i data-lucide="${showPassword ? "eye-off" : "eye"}" aria-hidden="true"></i>`;
  renderLucideIcons();
}

function showLoggedOut() {
  currentVendorUser = null;
  selectedUser = null;
  historyCursor = null;
  historyHasMore = false;
  historyLoading = false;
  loginPanel?.classList.remove("is-hidden");
  appPanel?.classList.add("is-hidden");
  vendorLogout?.classList.add("is-hidden");
  resultCard?.classList.add("is-hidden");
  if (historyList) {
    historyList.innerHTML = `
      <article class="vendor-history-empty">
        <strong>Pa gen tranzaksyon toujou.</strong>
        <span>Le ou kredite yon kont, li ap paret la.</span>
      </article>
    `;
  }
  historyMoreButton?.classList.add("is-hidden");
  setFeedback(loginFeedback, "");
  setFeedback(vendorFeedback, "");
}

function renderHistoryItems(items, append = false) {
  if (!historyList) {
    return;
  }

  if (!items.length && !append) {
    historyList.innerHTML = `
      <article class="vendor-history-empty">
        <strong>Pa gen tranzaksyon toujou.</strong>
        <span>Le ou kredite yon kont, li ap paret la.</span>
      </article>
    `;
    return;
  }

  const markup = items
    .map(
      (item) => `
        <article class="vendor-history-item">
          <div class="vendor-history-top">
            <strong>${item.targetUsername || "User"}</strong>
            <span>+${formatCoins(item.amount)} coin</span>
          </div>
          <div class="vendor-history-meta">
            <span>${formatHistoryDate(item.createdAt)}</span>
            <span>${formatCoins(item.beforeCoins)} -> ${formatCoins(item.afterCoins)}</span>
          </div>
        </article>
      `
    )
    .join("");

  if (append) {
    historyList.insertAdjacentHTML("beforeend", markup);
  } else {
    historyList.innerHTML = markup;
  }
}

function syncHistoryMoreButton() {
  if (!historyMoreButton) {
    return;
  }

  historyMoreButton.classList.toggle("is-hidden", !historyHasMore);
  historyMoreButton.disabled = historyLoading;
}

async function fetchHistory({ append = false } = {}) {
  if (!currentVendorUser?.uid || historyLoading) {
    return;
  }

  historyLoading = true;
  syncHistoryMoreButton();

  try {
    const result = await loadVendorTransactions({
      vendorUid: currentVendorUser.uid,
      limitCount: 5,
      lastDoc: append ? historyCursor : null,
    });

    historyCursor = result.lastDoc;
    historyHasMore = result.hasMore;
    renderHistoryItems(result.items, append);
  } catch (_) {
    if (!append && historyList) {
      historyList.innerHTML = `
        <article class="vendor-history-empty">
          <strong>Nou pa ka chaje istorik la.</strong>
          <span>Eseye anko pita.</span>
        </article>
      `;
    }
    historyHasMore = false;
  } finally {
    historyLoading = false;
    syncHistoryMoreButton();
  }
}

async function showLoggedIn(user) {
  currentVendorUser = user;
  loginPanel?.classList.add("is-hidden");
  appPanel?.classList.remove("is-hidden");
  vendorLogout?.classList.remove("is-hidden");

  const profile = await loadUserProfile(user.uid).catch(() => null);
  if (vendorBalance) {
    vendorBalance.textContent = formatCoins(profile?.coins);
  }

  historyCursor = null;
  historyHasMore = false;
  await fetchHistory();
}

async function waitForAuthUser() {
  const { auth } = await initFirebaseClient();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

async function handleLogin(event) {
  event.preventDefault();
  await initFirebaseClient();

  const form = event.currentTarget;
  const username = String(getFieldValue(form, "username")).trim();
  const password = String(getFieldValue(form, "password"));

  setFeedback(loginFeedback, "");

  if (!username || !password) {
    setFeedback(loginFeedback, "Antre non itilizate ak modpas ou.", "error");
    return;
  }

  setBusy(form, true);
  try {
    const user = await loginWithUsername({ username, password });
    await showLoggedIn(user);
    form.reset();
  } catch (error) {
    setFeedback(loginFeedback, getAuthMessage(error), "error");
  } finally {
    setBusy(form, false);
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const username = String(getFieldValue(form, "username")).trim();

  setFeedback(vendorFeedback, "");
  selectedUser = null;
  resultCard?.classList.add("is-hidden");

  if (!username) {
    setFeedback(vendorFeedback, "Ekri non user ou vle chache a.", "error");
    return;
  }

  setBusy(form, true);
  try {
    const profile = await findUserProfileByUsername(username);
    if (!profile) {
      setFeedback(vendorFeedback, "Nou pa jwenn user sa.", "error");
      return;
    }

    selectedUser = profile;
    if (resultName) {
      resultName.textContent = profile.username || username;
    }
    if (resultCoins) {
      resultCoins.textContent = `${formatCoins(profile.coins)} coin`;
    }
    resultCard?.classList.remove("is-hidden");
    setFeedback(vendorFeedback, "User la pare pou kredi.", "success");
    renderLucideIcons();
  } catch (_) {
    setFeedback(vendorFeedback, "Recherche la pa pase. Eseye anko.", "error");
  } finally {
    setBusy(form, false);
  }
}

async function handleCredit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = Number(getFieldValue(form, "amount"));

  setFeedback(vendorFeedback, "");

  if (!currentVendorUser) {
    showLoggedOut();
    return;
  }
  if (!selectedUser?.id) {
    setFeedback(vendorFeedback, "Chache yon user avan ou kredite.", "error");
    return;
  }
  if (selectedUser.id === currentVendorUser.uid) {
    setFeedback(vendorFeedback, "Ou pa ka kredite pwop kont pa ou.", "error");
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback(vendorFeedback, "Mete yon kantite coin ki pi gran pase 0.", "error");
    return;
  }
  if (amount < 90) {
    setFeedback(vendorFeedback, "Yon vendeur pa ka kredite mwens pase 90 coins.", "error");
    return;
  }

  setBusy(form, true);
  try {
    const result = await creditUserCoins({
      targetUid: selectedUser.id,
      amount,
      vendorUser: currentVendorUser,
    });
    selectedUser.coins = result.coins;
    if (resultCoins) {
      resultCoins.textContent = `${formatCoins(result.coins)} coin`;
    }
    if (vendorBalance) {
      vendorBalance.textContent = formatCoins(result.vendorCoins);
    }
    form.reset();
    setFeedback(vendorFeedback, `${formatCoins(result.amount)} coin ajoute sou kont ${selectedUser.username || "user"} la.`, "success");
    historyCursor = null;
    historyHasMore = false;
    await fetchHistory();
  } catch (error) {
    setFeedback(vendorFeedback, getCreditMessage(error), "error");
  } finally {
    setBusy(form, false);
  }
}

async function handleLogout() {
  await initFirebaseClient();
  await signOutUser();
  showLoggedOut();
}

loginForm?.addEventListener("submit", handleLogin);
searchForm?.addEventListener("submit", handleSearch);
creditForm?.addEventListener("submit", handleCredit);
vendorLogout?.addEventListener("click", handleLogout);
historyMoreButton?.addEventListener("click", () => fetchHistory({ append: true }));
passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

renderLucideIcons();

waitForAuthUser()
  .then((user) => {
    if (user) {
      return showLoggedIn(user);
    }
    return showLoggedOut();
  })
  .catch(() => showLoggedOut());
