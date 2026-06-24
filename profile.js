import {
  getCurrentUser,
  initFirebaseClient,
  loadUserTransferHistory,
  loadUserProfile,
  signOutUser,
  updateUserPassword,
} from "./auth-client.js";

const profileUsername = document.getElementById("profile-username");
const profileUsernameInline = document.getElementById("profile-username-inline");
const profileUid = document.getElementById("profile-uid");
const profileCoins = document.getElementById("profile-coins");
const profileTransferList = document.getElementById("profile-transfer-list");
const profileFeedback = document.getElementById("profile-feedback");
const passwordForm = document.getElementById("password-form");
const logoutButton = document.getElementById("logout-button");
const passwordToggleButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));

function setFeedback(message, kind = "info") {
  if (!profileFeedback) {
    return;
  }

  profileFeedback.textContent = message || "";
  profileFeedback.dataset.kind = kind;
}

function renderLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
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

function getFieldValue(form, name) {
  const field = form?.elements?.namedItem(name);
  return typeof field?.value === "string" ? field.value : "";
}

function formatCoins(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTransferDate(value) {
  const date = value && typeof value.toDate === "function" ? value.toDate() : null;
  if (!date) {
    return "Dat an ap pare";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getTransferTitle(item) {
  if (item.type === "received-from-vendor") {
    return "Coins resevwa nan men vendeur";
  }
  if (item.type === "sent-to-vendor") {
    return "Coins voye bay vendeur";
  }
  if (item.type === "vendor-sent") {
    return "Coins voye bay joueur";
  }
  return "Coins resevwa nan men joueur";
}

function renderTransferHistory(items = []) {
  if (!profileTransferList) {
    return;
  }

  if (!items.length) {
    profileTransferList.innerHTML = '<article class="profile-transfer-empty">Pa gen transfÃ¨ pou montre pou kounye a.</article>';
    return;
  }

  profileTransferList.innerHTML = items
    .map((item) => {
      const directionClass = item.direction === "received" ? "is-received" : "is-sent";
      const directionLabel = item.direction === "received" ? "Resevwa" : "Voye";
      const signedAmount = item.direction === "received" ? `+${formatCoins(item.amount)}` : `-${formatCoins(item.amount)}`;

      return `
        <article class="profile-transfer-item ${directionClass}">
          <div class="profile-transfer-top">
            <span>${directionLabel}</span>
            <strong>${signedAmount} coins</strong>
          </div>
          <p>${escapeHtml(getTransferTitle(item))} : ${escapeHtml(item.partyName)}</p>
          <div class="profile-transfer-meta">
            <span>${escapeHtml(formatTransferDate(item.createdAt))}</span>
            <span>Preuve: ${escapeHtml(item.id)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadProfile() {
  await initFirebaseClient();
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "index.html?auth=login";
    return;
  }

  const profile = await loadUserProfile(user.uid).catch(() => null);
  const username = profile?.username || user.displayName || "Jwe";

  if (profileUsername) {
    profileUsername.textContent = username;
  }
  if (profileUsernameInline) {
    profileUsernameInline.textContent = username;
  }
  if (profileUid) {
    profileUid.textContent = user.uid;
  }
  if (profileCoins) {
    profileCoins.textContent = formatCoins(profile?.coins);
  }

  if (profileTransferList) {
    try {
      const transfers = await loadUserTransferHistory(user.uid, 12);
      renderTransferHistory(transfers);
    } catch (_) {
      renderTransferHistory([]);
    }
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = String(getFieldValue(form, "password"));
  const confirmPassword = String(getFieldValue(form, "confirmPassword"));

  setFeedback("");

  if (password.length < 6) {
    setFeedback("Nouvo modpas la dwe gen omwen 6 karakter.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setFeedback("Nouvo modpas yo pa menm.", "error");
    return;
  }

  try {
    await updateUserPassword(password);
    form.reset();
    setFeedback("Modpas la chanje ak sikse.", "success");
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/requires-recent-login") {
      setFeedback("Pou chanje modpas la, dekonekte epi konekte ankò.", "error");
      return;
    }

    setFeedback("Nou pa ka chanje modpas la kounye a.", "error");
  }
}

async function handleLogout() {
  await initFirebaseClient();
  await signOutUser();
  window.location.href = "index.html";
}

passwordForm?.addEventListener("submit", handlePasswordChange);
logoutButton?.addEventListener("click", handleLogout);
passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

renderLucideIcons();
loadProfile();
