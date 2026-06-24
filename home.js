import {
  autoJoinMatchRoomWithBot,
  createAccount,
  createMatchRoom,
  getCurrentUser,
  GROUP_MATCH_INVITE_TEXT,
  initFirebaseClient,
  clearChatPresence,
  joinMatchRoom,
  loadMatchRoom,
  listenToAuthState,
  listenToRecentChatMessages,
  listenToUserProfile,
  loadUserProfile,
  loadShopDirectoryContacts,
  loadUserTransferHistory,
  loginWithUsername,
  maybeSendSimulatedChatMessage,
  normalizeUsername,
  saveUserProfile,
  sellCoinsToVendor,
  sendChatMessage,
  trimChatMessages,
  updateChatPresence,
} from "./auth-client.js";

const splashScreen = document.getElementById("splash-screen");
const openChatButton = document.getElementById("open-chat");
const enterGameButton = document.getElementById("enter-game");
const openGamesChatButton = document.getElementById("open-games-chat");
const openWithdrawGuideButton = document.getElementById("open-withdraw-guide");
const openShopButton = document.getElementById("open-shop");
const openShopBalanceButton = document.getElementById("open-shop-balance");
const openInviteModalButton = document.getElementById("open-invite-modal");
const closeChatButton = document.getElementById("close-chat");
const closeShopButton = document.getElementById("close-shop");
const closeInviteModalButton = document.getElementById("close-invite-modal");
const openAuthButton = document.getElementById("open-auth");
const chatUnreadDot = document.getElementById("chat-unread-dot");
const openAuthBottomButton = document.getElementById("open-auth-bottom");
const closeAuthButton = document.getElementById("close-auth");
const authModal = document.getElementById("auth-modal");
const chatModal = document.getElementById("chat-modal");
const inviteModal = document.getElementById("invite-modal");
const shopModal = document.getElementById("shop-modal");
const shopBalance = document.getElementById("shop-balance");
const shopContactList = document.getElementById("shop-contact-list");
const shopApplyLink = document.getElementById("shop-apply-link");
const shopRateBanner = document.getElementById("shop-rate-banner");
const shopHistoryMoreButton = document.getElementById("shop-history-more");
const shopFilterButtons = Array.from(document.querySelectorAll("[data-shop-filter]"));
const sellCoinsModal = document.getElementById("sell-coins-modal");
const closeSellCoinsButton = document.getElementById("close-sell-coins");
const sellCoinsForm = document.getElementById("sell-coins-form");
const sellCoinsAmountInput = document.getElementById("sell-coins-amount");
const sellCoinsAgent = document.getElementById("sell-coins-agent");
const sellCoinsFeedback = document.getElementById("sell-coins-feedback");
const playGuideModal = document.getElementById("play-guide-modal");
const playGuideUnderstoodButton = document.getElementById("play-guide-understood");
const playGuideDismissForeverButton = document.getElementById("play-guide-dismiss-forever");
const withdrawGuideModal = document.getElementById("withdraw-guide-modal");
const withdrawGuideUnderstoodButton = document.getElementById("withdraw-guide-understood");
const withdrawGuideDismissForeverButton = document.getElementById("withdraw-guide-dismiss-forever");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatFeedback = document.getElementById("chat-feedback");
const chatOnlineCount = document.getElementById("chat-online-count");
const chatReplyPreview = document.getElementById("chat-reply-preview");
const chatReplyPreviewAuthor = document.getElementById("chat-reply-preview-author");
const chatReplyPreviewText = document.getElementById("chat-reply-preview-text");
const cancelChatReplyButton = document.getElementById("cancel-chat-reply");
const sendGroupInviteButton = document.getElementById("send-group-invite");
const generateInviteCodeButton = document.getElementById("generate-invite-code");
const showHaveCodeButton = document.getElementById("show-have-code");
const inviteWagerInput = document.getElementById("invite-wager-input");
const inviteCodePanel = document.getElementById("invite-code-panel");
const inviteCodeWagerInput = document.getElementById("invite-code-wager-input");
const confirmGenerateInviteCodeButton = document.getElementById("confirm-generate-invite-code");
const inviteCodeResult = document.getElementById("invite-code-result");
const inviteCodeOutput = document.getElementById("invite-code-output");
const inviteCodeNote = document.getElementById("invite-code-note");
const copyInviteCodeButton = document.getElementById("copy-invite-code");
const enterGeneratedMatchButton = document.getElementById("enter-generated-match");
const haveCodeForm = document.getElementById("have-code-form");
const haveCodeInput = document.getElementById("have-code-input");
const verifyInviteCodeButton = document.getElementById("verify-invite-code");
const joinVerifiedCodeButton = document.getElementById("join-verified-code");
const inviteStatus = document.getElementById("invite-status");
const authTabs = Array.from(document.querySelectorAll(".auth-tab"));
const authSwitchButtons = Array.from(document.querySelectorAll("[data-auth-switch]"));
const passwordToggleButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));
const authLoginForm = document.getElementById("auth-login-form");
const authSignupForm = document.getElementById("auth-signup-form");
const authFeedback = document.getElementById("auth-feedback");
const headerUserLink = document.getElementById("header-user-link");
const headerUsername = document.getElementById("header-username");
const coinBalance = document.getElementById("coin-balance");
let currentChatUser = null;
let currentChatProfile = null;
let chatUnsubscribe = null;
let profileUnsubscribe = null;
let activeReplyTarget = null;
let lastInviteCode = "";
let activeShopFilter = "all";
let shopHistoryItems = [];
let shopHistoryVisibleCount = 3;
let shopHistoryHasMore = false;
let shopHistoryLoading = false;
let latestChatMessages = [];
let chatOnlineTicker = null;
let activeSellContact = null;
let chatPresenceTicker = null;
let chatSimulationTicker = null;
let chatSimulationWarmupTimer = null;
const pendingInviteBotJoinTimers = new Map();
const chatSessionId = getOrCreateChatSessionId();
const PLAY_GUIDE_STORAGE_KEY = "penal-lakay-hide-play-guide";
const WITHDRAW_GUIDE_STORAGE_KEY = "penal-lakay-hide-withdraw-guide";
// Replace these seeded contacts with the real official buyer/seller directory when available.
const shopContacts = [
  {
    type: "seller",
    role: "Vendeur officiel",
    name: "Lone Market 509",
    availability: "Disponible 09:00 - 20:00",
    channel: "WhatsApp",
    href: "https://wa.me/50940000001",
    contact: "+509 40 00 00 01",
  },
  {
    type: "buyer",
    role: "Acheteur officiel",
    name: "Coin Exchange Lakay",
    availability: "Réponse en moins de 10 min",
    channel: "Telegram",
    href: "https://t.me/penallakaycoins",
    contact: "@penallakaycoins",
  },
  {
    type: "seller",
    role: "Vendeur officiel",
    name: "PK Coins Support",
    availability: "Assistance 7j/7",
    channel: "Téléphone",
    href: "tel:+50940000002",
    contact: "+509 40 00 00 02",
  },
  {
    type: "buyer",
    role: "Acheteur officiel",
    name: "Lakay Buyer Desk",
    availability: "Validation rapide des transferts",
    channel: "WhatsApp",
    href: "https://wa.me/50940000003",
    contact: "+509 40 00 00 03",
  },
];

function setFeedback(message, kind = "info") {
  if (!authFeedback) {
    return;
  }

  authFeedback.textContent = message || "";
  authFeedback.dataset.kind = kind;
}

function setChatFeedback(message, kind = "info") {
  if (!chatFeedback) {
    return;
  }

  chatFeedback.textContent = message || "";
  chatFeedback.dataset.kind = kind;
}

function setSellCoinsFeedback(message, kind = "info") {
  if (!sellCoinsFeedback) {
    return;
  }

  sellCoinsFeedback.textContent = message || "";
  sellCoinsFeedback.dataset.kind = kind;
}

function setAuthMode(mode) {
  authTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.authTab === mode);
  });

  if (authLoginForm) {
    authLoginForm.classList.toggle("is-hidden", mode !== "login");
  }

  if (authSignupForm) {
    authSignupForm.classList.toggle("is-hidden", mode !== "signup");
  }

  setFeedback("");
}

function getOrCreateChatSessionId() {
  const storageKey = "penal-lakay-chat-session-id";
  try {
    const existingId = window.localStorage.getItem(storageKey);
    if (existingId) {
      return existingId;
    }

    const nextId =
      window.crypto?.randomUUID?.() ||
      `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, nextId);
    return nextId;
  } catch (_) {
    return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function focusAuthField(mode) {
  const targetForm = mode === "signup" ? authSignupForm : authLoginForm;
  const firstField = targetForm?.querySelector("input");
  if (firstField) {
    window.setTimeout(() => firstField.focus(), 0);
  }
}

function renderLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function isSellerContact(contact) {
  return Boolean(contact?.isSeller || contact?.type === "seller");
}

function isBuyerContact(contact) {
  return Boolean(contact?.isBuyer || contact?.type === "buyer");
}

function getShopContactName(contact) {
  return contact?.displayName || contact?.name || contact?.username || "Contact officiel";
}

function getShopContactUid(contact) {
  return String(contact?.uid || "").trim();
}

function getShopContactRole(contact) {
  if (isSellerContact(contact) && isBuyerContact(contact)) {
    return "Vendeur & acheteur officiel";
  }
  if (isSellerContact(contact)) {
    return "Vendeur officiel";
  }
  return "Acheteur officiel";
}

function matchesShopFilter(contact, filter) {
  if (filter === "seller") {
    return isSellerContact(contact);
  }
  if (filter === "buyer") {
    return isBuyerContact(contact);
  }
  return false;
}

function updateShopApplyLink() {
  if (!shopApplyLink) {
    return;
  }

  const currentUid = String(currentChatUser?.uid || "").trim();
  const currentDirectoryEntry = currentUid
    ? shopContacts.find((contact) => String(contact?.uid || "").trim() === currentUid)
    : null;
  const isCurrentUserSeller = Boolean(currentDirectoryEntry?.isSeller);

  if (isCurrentUserSeller) {
    shopApplyLink.href = "vendeur.html";
    shopApplyLink.target = "_self";
    shopApplyLink.removeAttribute("rel");
    shopApplyLink.setAttribute("aria-label", "Aksede ak page vendeur ou kounye a");
    const label = shopApplyLink.querySelector("span");
    if (label) {
      label.textContent = "Aksede ak page vendeur ou kounye a";
    }
    shopApplyLink.classList.add("is-vendor-access");
    return;
  }

  shopApplyLink.href = "https://wa.me/50935601379";
  shopApplyLink.target = "_blank";
  shopApplyLink.rel = "noreferrer";
  shopApplyLink.setAttribute("aria-label", "Aplike pou vinn vendeur kounye a");
  const label = shopApplyLink.querySelector("span");
  if (label) {
    label.textContent = "Aplike pou vinn vendeur kounye a";
  }
  shopApplyLink.classList.remove("is-vendor-access");
}

function renderShopContacts() {
  if (!shopContactList) {
    return;
  }

  const visibleContacts = shopContacts.filter((contact) => matchesShopFilter(contact, activeShopFilter));

  if (!visibleContacts.length) {
    shopContactList.innerHTML = `
      <article class="shop-empty-state">
        <strong>Aucun contact dans cette categorie</strong>
        <p>Change le filtre pour afficher les vendeurs ou les acheteurs officiels disponibles.</p>
      </article>
    `;
    return;
  }

  shopContactList.innerHTML = visibleContacts
    .map(
      (contact) => `
        <article class="shop-contact-card">
          <div class="shop-contact-top">
            <div class="shop-contact-title-group">
              <strong class="shop-contact-name">${escapeHtml(getShopContactName(contact))}</strong>
              <span class="shop-contact-role">${escapeHtml(getShopContactRole(contact))}</span>
            </div>
            <span class="shop-contact-status">Verifie</span>
          </div>
          <p class="shop-contact-availability">${escapeHtml(contact.availability || "Disponibilite a verifye ak agent la.")}</p>
          <div class="shop-contact-meta">
            <span>${escapeHtml(contact.channel || "Contact direct")}</span>
            <span>${escapeHtml(contact.contact || "-")}</span>
          </div>
          <div class="shop-contact-actions">
            <a class="shop-contact-action" href="${escapeHtml(contact.href || "#")}" target="_blank" rel="noreferrer">
              Contacter
            </a>
            ${
              isSellerContact(contact) && getShopContactUid(contact)
                ? `<button class="shop-contact-action shop-contact-action-secondary" type="button" data-sell-contact="${escapeHtml(
                    getShopContactName(contact)
                  )}" data-sell-uid="${escapeHtml(getShopContactUid(contact))}">Vendre</button>`
                : ""
            }
          </div>
        </article>
      `
    )
    .join("");
}

function formatShopHistoryDate(value) {
  const date = value?.toDate instanceof Function ? value.toDate() : null;
  if (!date) {
    return "Kounye a";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function renderShopHistoryItems(items, append = false) {
  if (!shopContactList) {
    return;
  }

  if (!items.length && !append) {
    shopContactList.innerHTML = `
      <article class="shop-history-empty">
        <strong>Pa gen tranzaksyon toujou</strong>
        <p>Vant ak acha coin yo ap paret la ak non vendeur ki te jere yo.</p>
      </article>
    `;
    return;
  }

  const markup = items
    .map((item) => {
      let title = `Tranzaksyon ak ${escapeHtml(item.partyName || "vendeur la")}`;
      let amountLabel = `${formatCoinBalance(item.amount)} coin`;
      let amountClass = "is-negative";

      if (item.type === "received-from-vendor") {
        title = `Achat ak ${escapeHtml(item.partyName || "vendeur la")}`;
        amountLabel = `+${formatCoinBalance(item.amount)} coin`;
        amountClass = "is-positive";
      } else if (item.type === "sent-to-vendor") {
        title = `Vente a ${escapeHtml(item.partyName || "vendeur la")}`;
        amountLabel = `-${formatCoinBalance(item.amount)} coin`;
      } else if (item.type === "vendor-sent") {
        title = `Vente pou ${escapeHtml(item.partyName || "joueur la")}`;
        amountLabel = `-${formatCoinBalance(item.amount)} coin`;
      } else if (item.type === "vendor-received") {
        title = `Achat nan men ${escapeHtml(item.partyName || "joueur la")}`;
        amountLabel = `+${formatCoinBalance(item.amount)} coin`;
        amountClass = "is-positive";
      }

      return `
        <article class="shop-history-card">
          <div class="shop-history-top">
            <strong>${title}</strong>
            <span class="${amountClass}">${amountLabel}</span>
          </div>
          <div class="shop-history-meta">
            <span>${formatShopHistoryDate(item.createdAt)}</span>
            <span>${formatCoinBalance(item.beforeCoins)} -> ${formatCoinBalance(item.afterCoins)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  if (append) {
    shopContactList.insertAdjacentHTML("beforeend", markup);
  } else {
    shopContactList.innerHTML = markup;
  }
}

function syncShopHistoryMoreButton() {
  if (!shopHistoryMoreButton) {
    return;
  }

  shopHistoryMoreButton.classList.toggle("is-hidden", activeShopFilter !== "history" || !shopHistoryHasMore);
  shopHistoryMoreButton.disabled = shopHistoryLoading;
}

async function renderShopHistory({ append = false } = {}) {
  if (!shopContactList) {
    return;
  }

  const user = currentChatUser || (await getCurrentUser().catch(() => null));
  if (!user) {
    shopContactList.innerHTML = `
      <article class="shop-history-empty">
        <strong>Konekte pou we istorik ou</strong>
        <p>Le ou konekte, nou ap montre 3 denye tranzaksyon acha ak vente ou yo.</p>
      </article>
    `;
    shopHistoryItems = [];
    shopHistoryHasMore = false;
    syncShopHistoryMoreButton();
    return;
  }

  if (shopHistoryLoading) {
    return;
  }

  shopHistoryLoading = true;
  syncShopHistoryMoreButton();

  try {
    if (!append) {
      shopHistoryVisibleCount = 3;
      shopHistoryItems = await loadUserTransferHistory(user.uid, 30);
    } else {
      shopHistoryVisibleCount += 3;
    }

    shopHistoryHasMore = shopHistoryItems.length > shopHistoryVisibleCount;
    renderShopHistoryItems(shopHistoryItems.slice(0, shopHistoryVisibleCount), false);
  } catch (_) {
    if (!append && shopContactList) {
      shopContactList.innerHTML = `
        <article class="shop-history-empty">
          <strong>Nou pa ka chaje istorik la</strong>
          <p>Eseye anko pita.</p>
        </article>
      `;
    }
    shopHistoryItems = [];
    shopHistoryHasMore = false;
  } finally {
    shopHistoryLoading = false;
    syncShopHistoryMoreButton();
  }
}

function updateShopSectionsVisibility() {
  const isHistory = activeShopFilter === "history";
  shopApplyLink?.classList.toggle("is-hidden", isHistory);
  shopRateBanner?.classList.toggle("is-hidden", isHistory);
  syncShopHistoryMoreButton();
}

async function refreshShopDirectory() {
  try {
    const contacts = await loadShopDirectoryContacts();
    if (contacts.length) {
      shopContacts.splice(0, shopContacts.length, ...contacts);
    }
  } catch (_) {
    // Keep fallback contacts if remote directory is unavailable.
  }

  updateShopApplyLink();
  renderShopContacts();
}

function setShopFilter(filter) {
  activeShopFilter = filter;
  shopFilterButtons.forEach((button) => {
    const isActive = button.dataset.shopFilter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  updateShopSectionsVisibility();
  if (filter === "history") {
    shopHistoryItems = [];
    shopHistoryVisibleCount = 3;
    shopHistoryHasMore = false;
    renderShopHistory();
    return;
  }
  renderShopContacts();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setInviteStatus(message, kind = "info") {
  if (!inviteStatus) {
    return;
  }

  inviteStatus.textContent = message || "";
  inviteStatus.dataset.kind = kind;
}

function syncInviteWagerInputs(source = "primary") {
  const primaryValue = String(inviteWagerInput?.value || "").trim();
  const codeValue = String(inviteCodeWagerInput?.value || "").trim();
  const normalizedValue = String(Math.max(25, Math.floor(Number(primaryValue || codeValue || 25))));

  if (source === "code") {
    if (inviteWagerInput) {
      inviteWagerInput.value = normalizedValue;
    }
    return;
  }

  if (inviteCodeWagerInput) {
    inviteCodeWagerInput.value = normalizedValue;
  }
}

function scheduleBotJoinForInvite(code, messageId) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanMessageId = String(messageId || "").trim();
  if (!cleanCode || !cleanMessageId) {
    return;
  }

  const existingTimer = pendingInviteBotJoinTimers.get(cleanCode);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  const timer = window.setTimeout(async () => {
    pendingInviteBotJoinTimers.delete(cleanCode);
    try {
      await autoJoinMatchRoomWithBot({
        code: cleanCode,
        messageId: cleanMessageId,
      });
    } catch (_) {
      // Ignore: a real player may have joined first.
    }
  }, 10000);

  pendingInviteBotJoinTimers.set(cleanCode, timer);
}

function getChatClockParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port-au-Prince",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function hashOnlineSeed(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function getOnlineRangeForHour(hour) {
  if (hour >= 0 && hour < 6) {
    return { minOnline: 3, maxOnline: 12 };
  }
  if (hour >= 6 && hour < 11) {
    return { minOnline: 16, maxOnline: 42 };
  }
  return { minOnline: 60, maxOnline: 123 };
}

function getSimulatedOnlineCount() {
  const parts = getChatClockParts();
  const secondsSinceMidnight = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const daySeed = `${parts.year}-${parts.month}-${parts.day}`;
  let elapsed = 0;
  let segmentIndex = 0;

  while (elapsed <= secondsSinceMidnight) {
    const segmentLength = 4 + (hashOnlineSeed(`${daySeed}-interval-${segmentIndex}`) % 5);
    if (elapsed + segmentLength > secondsSinceMidnight) {
      const { minOnline, maxOnline } = getOnlineRangeForHour(parts.hour);
      const value = hashOnlineSeed(`${daySeed}-count-${segmentIndex}-${parts.hour}`);
      return minOnline + (value % (maxOnline - minOnline + 1));
    }
    elapsed += segmentLength;
    segmentIndex += 1;
  }

  const { minOnline, maxOnline } = getOnlineRangeForHour(parts.hour);
  return minOnline + (hashOnlineSeed(`${daySeed}-fallback-${parts.hour}`) % (maxOnline - minOnline + 1));
}

function updateChatOnlineCount() {
  if (!chatOnlineCount) {
    return;
  }

  chatOnlineCount.textContent = String(getSimulatedOnlineCount());
}

function startChatOnlineTicker() {
  updateChatOnlineCount();
  if (chatOnlineTicker) {
    return;
  }

  chatOnlineTicker = window.setInterval(updateChatOnlineCount, 1000);
}

async function refreshChatPresence() {
  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    const username = currentChatProfile?.username || user?.displayName || "Jwe";
    await updateChatPresence({ sessionId: chatSessionId, user, username });
  } catch (_) {
    // Presence is best-effort; chat still works without it.
  }
}

function startChatPresence() {
  refreshChatPresence();
  if (!chatPresenceTicker) {
    chatPresenceTicker = window.setInterval(refreshChatPresence, 10000);
  }
}

function stopChatPresence() {
  if (chatPresenceTicker) {
    window.clearInterval(chatPresenceTicker);
    chatPresenceTicker = null;
  }

  clearChatPresence(chatSessionId).catch(() => {});
}

async function runChatSimulationCheck() {
  try {
    const sentMessage = await maybeSendSimulatedChatMessage({
      idleMs: 7000,
      minOpenMs: 7000,
      simulationOwnerId: chatSessionId,
    });

    if (sentMessage) {
      await trimChatMessages(10);
    }
  } catch (error) {
    console.warn("Chat simulation skipped:", error?.message || error);
  }
}

function startChatSimulationTicker() {
  if (!chatSimulationTicker) {
    chatSimulationWarmupTimer = window.setTimeout(() => {
      chatSimulationWarmupTimer = null;
      runChatSimulationCheck();
    }, 7000);
    chatSimulationTicker = window.setInterval(runChatSimulationCheck, 7000);
  }
}

function stopChatSimulationTicker() {
  if (chatSimulationWarmupTimer) {
    window.clearTimeout(chatSimulationWarmupTimer);
    chatSimulationWarmupTimer = null;
  }
  if (chatSimulationTicker) {
    window.clearInterval(chatSimulationTicker);
    chatSimulationTicker = null;
  }
}

function generateInviteCode() {
  const base = (currentChatProfile?.username || currentChatUser?.displayName || "PK")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base}-${suffix}`;
}

function resetInvitePanels() {
  inviteCodePanel?.classList.add("is-hidden");
  haveCodeForm?.classList.add("is-hidden");
  setInviteStatus("");
}

function getJoinMatchUrl(inviteCode) {
  return `jeu.html?invite=${encodeURIComponent(String(inviteCode || "").trim())}`;
}

function getInviteWagerAmount() {
  const amount = Number.parseInt(String(inviteWagerInput?.value || "25").trim(), 10);
  return Number.isInteger(amount) && amount >= 25 ? amount : 25;
}

function createInsufficientCoinsError(currentCoins, requiredCoins) {
  const error = new Error("insufficient-coins");
  error.currentCoins = Number.isFinite(Number(currentCoins)) ? Number(currentCoins) : 0;
  error.requiredCoins = Number.isFinite(Number(requiredCoins)) ? Number(requiredCoins) : 25;
  return error;
}

function getInsufficientCoinsMessage(error, fallbackRequired = 25) {
  const currentCoins = Math.max(0, Math.floor(Number(error?.currentCoins || currentChatProfile?.coins || 0)));
  const requiredCoins = Math.max(25, Math.floor(Number(error?.requiredCoins || fallbackRequired || 25)));
  return `Ou pa gen ase coins pou rantre nan salle sa. Ou genyen ${formatCoinBalance(currentCoins)} coins, salle la mande ${formatCoinBalance(requiredCoins)} coins.`;
}

async function ensureUserCanCoverWager(user, wagerCoins) {
  if (!user?.uid) {
    throw new Error("not-authenticated");
  }

  const profile = await loadUserProfile(user.uid).catch(() => null);
  const currentCoins = Number(profile?.coins || 0);
  const requiredCoins = Math.max(25, Math.floor(Number(wagerCoins || 25)));
  if (currentCoins < requiredCoins) {
    throw createInsufficientCoinsError(currentCoins, requiredCoins);
  }
  currentChatProfile = {
    ...(currentChatProfile || { username: user.displayName || "Jwe" }),
    ...(profile || {}),
  };
  setSignedInUI(user, currentChatProfile);
  return true;
}

function hasRoomWagerPayment(room, role) {
  const paidKey = role === "host" ? "hostPaid" : role === "guest" ? "guestPaid" : "";
  return Boolean(paidKey && room?.wagerPayments?.[paidKey]);
}

async function ensureUserCanEnterRoom(user, room, role) {
  if (hasRoomWagerPayment(room, role)) {
    return true;
  }

  const wagerCoins = Math.max(25, Math.floor(Number(room?.wagerCoins || 25)));
  return ensureUserCanCoverWager(user, wagerCoins);
}

function getJoinedMatchCodes() {
  try {
    return JSON.parse(window.localStorage.getItem("penal_joined_match_codes") || "[]");
  } catch (_) {
    return [];
  }
}

function hasJoinedMatchCode(inviteCode) {
  const cleanCode = String(inviteCode || "").trim().toUpperCase();
  return Boolean(cleanCode && getJoinedMatchCodes().includes(cleanCode));
}

function rememberJoinedMatchCode(inviteCode) {
  const cleanCode = String(inviteCode || "").trim().toUpperCase();
  if (!cleanCode) {
    return;
  }

  try {
    const codes = getJoinedMatchCodes();
    if (!codes.includes(cleanCode)) {
      codes.push(cleanCode);
      window.localStorage.setItem("penal_joined_match_codes", JSON.stringify(codes.slice(-30)));
    }
  } catch (_) {
    // Ignore localStorage failures.
  }
}

function isMatchRoomAlreadyUsed(room, role = "") {
  const state = room?.gameState || {};
  const cleanRole = role === "guest" ? "guest" : role === "host" ? "host" : "";
  const currentRoleAlreadyInGame = cleanRole ? Boolean(room?.gamePresence?.[cleanRole]) : false;
  return Boolean(
    state.startedWithBothInGame
      || state.gameOver
      || state.phase === "collecting"
      || state.phase === "resolved"
      || currentRoleAlreadyInGame
      || room?.rematch?.status,
  );
}

async function enterHostMatchByCode(inviteCode, button = null) {
  const cleanCode = String(inviteCode || "").trim().toUpperCase();
  setChatFeedback("");
  if (!cleanCode) {
    setInviteStatus("Kod la pa pare.", "error");
    return;
  }
  if (hasJoinedMatchCode(cleanCode)) {
    setInviteStatus("Ou deja rantre nan match sa.", "error");
    return;
  }

  try {
    const room = await loadMatchRoom(cleanCode);
    if (!room) {
      setInviteStatus("Kod sa pa existe.", "error");
      return;
    }
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeInviteModal();
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou rantre nan match la.", "error");
      return;
    }
    await ensureUserCanEnterRoom(user, room, "host");
    if (isMatchRoomAlreadyUsed(room, "host")) {
      if (button) {
        button.disabled = true;
        button.textContent = "Match deja itilize";
      }
      rememberJoinedMatchCode(cleanCode);
      renderChatMessages(latestChatMessages);
      setChatFeedback("Ou deja antre nan match sa. Invitation an pa ka relanse menm match la.", "error");
      return;
    }

    rememberJoinedMatchCode(cleanCode);
    window.location.href = getJoinMatchUrl(cleanCode);
  } catch (error) {
    console.error("Host enter invite failed:", { code: error?.code, message: error?.message });
    if ((error?.message || error?.code) === "insufficient-coins") {
      const message = getInsufficientCoinsMessage(error);
      setInviteStatus(message, "error");
      setChatFeedback(message, "error");
      return;
    }
    setInviteStatus("Nou pa rive verifye match la kounye a.", "error");
  }
}

function scrollChatToBottom() {
  if (!chatMessages) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  });
}

function getChatSeenStorageKey() {
  const viewerKey = currentChatUser?.uid || `guest-${chatSessionId}`;
  return `penal-lakay-chat-last-seen:${viewerKey}`;
}

function readLastSeenChatMessageId() {
  try {
    return window.localStorage.getItem(getChatSeenStorageKey()) || "";
  } catch (_) {
    return "";
  }
}

function saveLastSeenChatMessageId(messageId) {
  if (!messageId) {
    return;
  }

  try {
    window.localStorage.setItem(getChatSeenStorageKey(), String(messageId));
  } catch (_) {
    // Ignore localStorage failures.
  }
}

function syncChatUnreadIndicator() {
  if (!chatUnreadDot) {
    return;
  }

  const latestMessageId = latestChatMessages.at(-1)?.id || "";
  const isChatOpen = Boolean(chatModal?.classList.contains("is-open"));
  const shouldShow = Boolean(latestMessageId) && !isChatOpen && readLastSeenChatMessageId() !== latestMessageId;
  chatUnreadDot.hidden = !shouldShow;
}

function markLatestChatAsSeen() {
  const latestMessageId = latestChatMessages.at(-1)?.id || "";
  if (!latestMessageId) {
    syncChatUnreadIndicator();
    return;
  }

  saveLastSeenChatMessageId(latestMessageId);
  syncChatUnreadIndicator();
}

function getChatMessageSignature(message) {
  return [
    String(message?.uid || ""),
    String(message?.username || ""),
    String(message?.messageType || "text"),
    String(message?.text || ""),
    String(message?.invite?.code || ""),
  ].join("|");
}

function dedupeAdjacentChatMessages(messages = []) {
  const result = [];
  let previousSignature = "";

  messages.forEach((message) => {
    const signature = getChatMessageSignature(message);
    if (signature && signature === previousSignature) {
      return;
    }
    result.push(message);
    previousSignature = signature;
  });

  return result;
}

function renderChatMessages(messages = []) {
  if (!chatMessages) {
    return;
  }

  latestChatMessages = dedupeAdjacentChatMessages(Array.isArray(messages) ? messages : []);
  if (chatModal?.classList.contains("is-open")) {
    markLatestChatAsSeen();
  } else {
    syncChatUnreadIndicator();
  }

  if (!latestChatMessages.length) {
    chatMessages.innerHTML = `
      <article class="chat-message">
        <span class="chat-author">Salon</span>
        <p>Pa gen mesaj ankò. Ekri premye mesaj la.</p>
      </article>
    `;
    return;
  }

  chatMessages.innerHTML = latestChatMessages
    .map((message) => {
      const author = escapeHtml(message.username || "Jwe");
      const text = escapeHtml(message.text || "");
      const isOwn = Boolean(currentChatUser?.uid && message.uid === currentChatUser.uid);
      const isInvite = message.messageType === "match-invite" && message.invite?.code;
      const replyAuthor = escapeHtml(message.replyTo?.username || "");
      const replyText = escapeHtml(message.replyTo?.text || "");
      const replyMarkup = message.replyTo?.id
        ? `
          <div class="chat-message-reply">
            <strong>${replyAuthor}</strong>
            <span>${replyText}</span>
          </div>
        `
        : "";
      const inviteCode = escapeHtml(message.invite?.code || "");
      const rawInviteCode = String(message.invite?.code || "").trim().toUpperCase();
      const hostName = escapeHtml(message.invite?.hostUsername || message.username || "Jwe");
      const wagerCoins = Math.max(25, Math.floor(Number(message.invite?.wagerCoins || 25)));
      const isHostInvite = Boolean(currentChatUser?.uid && message.invite?.hostUid === currentChatUser.uid);
      const inviteStatus = String(message.invite?.status || "open");
      const joinedByMe = Boolean(currentChatUser?.uid && message.invite?.guestUid === currentChatUser.uid && !isHostInvite);
      const alreadyJoinedThisMatch = hasJoinedMatchCode(rawInviteCode) || joinedByMe;
      const inviteLocked = ["joined", "started", "finished", "closed"].includes(inviteStatus);
      const canJoinInvite = !alreadyJoinedThisMatch && !inviteLocked && !isHostInvite;
      const canHostEnter = !alreadyJoinedThisMatch && inviteStatus === "joined" && isHostInvite;
      const inviteButtonText = canHostEnter
        ? "Rejoindre le match"
        : alreadyJoinedThisMatch
          ? "Match rejoint"
          : inviteLocked
            ? "Invitation desactivee"
            : isHostInvite
              ? "Invitation envoyee"
              : "Rejoindre le match";
      const inviteActionMarkup = alreadyJoinedThisMatch
        ? `<span class="chat-invite-state">${inviteButtonText}</span>`
        : `
            <button
              class="chat-join-button"
              type="button"
              data-join-invite-code="${inviteCode}"
              data-join-message-id="${escapeHtml(message.id || "")}"
              data-join-host="${hostName}"
              data-host-enter="${canHostEnter ? "1" : "0"}"
              ${(canJoinInvite || canHostEnter) ? "" : "disabled"}
            >
              ${inviteButtonText}
            </button>
          `;
      const contentMarkup = isInvite
        ? `
          <div class="chat-invite-card">
            <span class="chat-invite-badge">Match Invite</span>
            <p>${text}</p>
            <p class="chat-invite-wager">Miz: ${wagerCoins} coins</p>
            ${inviteActionMarkup}
          </div>
        `
        : `<p>${text}</p>`;

      return `
        <article class="chat-message${isOwn ? " is-own" : ""}${isInvite ? " is-invite" : ""}">
          <button
            class="chat-reply-button"
            type="button"
            data-reply-id="${escapeHtml(message.id || "")}"
            data-reply-uid="${escapeHtml(message.uid || "")}"
            data-reply-author="${author}"
            data-reply-text="${text}"
            aria-label="Répondre à ce message"
          >
            <i data-lucide="reply" aria-hidden="true"></i>
          </button>
          <span class="chat-author">${author}</span>
          ${replyMarkup}
          ${contentMarkup}
        </article>
      `;
    })
    .join("");

  renderLucideIcons();
  scrollChatToBottom();
}

function setReplyTarget(replyTarget) {
  activeReplyTarget = replyTarget;

  if (!chatReplyPreview || !chatReplyPreviewAuthor || !chatReplyPreviewText) {
    return;
  }

  if (!replyTarget) {
    chatReplyPreview.classList.add("is-hidden");
    chatReplyPreviewAuthor.textContent = "";
    chatReplyPreviewText.textContent = "";
    return;
  }

  chatReplyPreview.classList.remove("is-hidden");
  chatReplyPreviewAuthor.textContent = replyTarget.username || "Jwe";
  chatReplyPreviewText.textContent = replyTarget.text || "";
  chatInput?.focus();
}

async function ensureChatSubscription() {
  if (chatUnsubscribe) {
    return;
  }

  await initFirebaseClient();
  chatUnsubscribe = listenToRecentChatMessages((messages) => {
    renderChatMessages(messages);
  });
}

function openChatModal() {
  if (!chatModal) {
    return;
  }

  chatModal.hidden = false;
  chatModal.classList.add("is-open");
  chatModal.setAttribute("aria-hidden", "false");
  startChatOnlineTicker();
  startChatPresence();
  startChatSimulationTicker();
  ensureChatSubscription().catch(() => {
    renderChatMessages([]);
  });
  markLatestChatAsSeen();
  scrollChatToBottom();
  window.setTimeout(() => chatInput?.focus(), 0);
}

function openPlayGuideModal() {
  if (!playGuideModal) {
    openChatModal();
    return;
  }

  playGuideModal.hidden = false;
  playGuideModal.classList.add("is-open");
  playGuideModal.setAttribute("aria-hidden", "false");
}

function closePlayGuideModal() {
  if (!playGuideModal) {
    return;
  }

  playGuideModal.classList.remove("is-open");
  playGuideModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!playGuideModal.classList.contains("is-open")) {
      playGuideModal.hidden = true;
    }
  }, 250);
}

function shouldSkipPlayGuide() {
  try {
    return window.localStorage.getItem(PLAY_GUIDE_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function hidePlayGuideForever() {
  try {
    window.localStorage.setItem(PLAY_GUIDE_STORAGE_KEY, "1");
  } catch (_) {
    // Ignore localStorage failures.
  }
}

function openWithdrawGuideModal() {
  if (!withdrawGuideModal) {
    setShopFilter("seller");
    openShopModal();
    return;
  }

  withdrawGuideModal.hidden = false;
  withdrawGuideModal.classList.add("is-open");
  withdrawGuideModal.setAttribute("aria-hidden", "false");
}

function closeWithdrawGuideModal() {
  if (!withdrawGuideModal) {
    return;
  }

  withdrawGuideModal.classList.remove("is-open");
  withdrawGuideModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!withdrawGuideModal.classList.contains("is-open")) {
      withdrawGuideModal.hidden = true;
    }
  }, 250);
}

function shouldSkipWithdrawGuide() {
  try {
    return window.localStorage.getItem(WITHDRAW_GUIDE_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function hideWithdrawGuideForever() {
  try {
    window.localStorage.setItem(WITHDRAW_GUIDE_STORAGE_KEY, "1");
  } catch (_) {
    // Ignore localStorage failures.
  }
}

function openSellerShopFlow() {
  setShopFilter("seller");
  openShopModal();
}

function handleEnterGame() {
  if (shouldSkipPlayGuide()) {
    openChatModal();
    return;
  }

  openPlayGuideModal();
}

function closeChatModal() {
  if (!chatModal) {
    return;
  }

  setReplyTarget(null);
  stopChatPresence();
  stopChatSimulationTicker();
  chatModal.classList.remove("is-open");
  chatModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!chatModal.classList.contains("is-open")) {
      chatModal.hidden = true;
    }
  }, 250);
}

function openInviteModal() {
  if (!inviteModal) {
    return;
  }

  inviteModal.hidden = false;
  inviteModal.classList.add("is-open");
  inviteModal.setAttribute("aria-hidden", "false");
  resetInvitePanels();
}

function closeInviteModal(immediate = false) {
  if (!inviteModal) {
    return;
  }

  inviteModal.classList.remove("is-open");
  inviteModal.setAttribute("aria-hidden", "true");
  if (immediate) {
    inviteModal.hidden = true;
    return;
  }

  window.setTimeout(() => {
    if (!inviteModal.classList.contains("is-open")) {
      inviteModal.hidden = true;
    }
  }, 250);
}

function openShopModal() {
  if (!shopModal) {
    return;
  }

  shopModal.hidden = false;
  shopModal.classList.add("is-open");
  shopModal.setAttribute("aria-hidden", "false");
}

function closeShopModal() {
  if (!shopModal) {
    return;
  }

  shopModal.classList.remove("is-open");
  shopModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!shopModal.classList.contains("is-open")) {
      shopModal.hidden = true;
    }
  }, 250);
}

function openSellCoinsModal(contact = null) {
  if (!sellCoinsModal) {
    return;
  }

  setSellCoinsFeedback("");
  activeSellContact = contact && typeof contact === "object"
    ? {
        name: String(contact.name || "").trim(),
        uid: String(contact.uid || "").trim(),
      }
    : null;

  if (sellCoinsAgent) {
    sellCoinsAgent.textContent = activeSellContact?.name
      ? `W ap vann coins ou bay ${activeSellContact.name}.`
      : "Chwazi kantite coins ou vle vann.";
  }

  sellCoinsModal.hidden = false;
  sellCoinsModal.classList.add("is-open");
  sellCoinsModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => sellCoinsAmountInput?.focus(), 0);
}

function closeSellCoinsModal() {
  if (!sellCoinsModal) {
    return;
  }

  activeSellContact = null;
  setSellCoinsFeedback("");
  sellCoinsModal.classList.remove("is-open");
  sellCoinsModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!sellCoinsModal.classList.contains("is-open")) {
      sellCoinsModal.hidden = true;
    }
  }, 250);
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

function openAuthModal(mode = "signup") {
  if (!authModal) {
    return;
  }

  setAuthMode(mode);
  authModal.hidden = false;
  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  focusAuthField(mode);
}

function closeAuthModal() {
  if (!authModal) {
    return;
  }

  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!authModal.classList.contains("is-open")) {
      authModal.hidden = true;
    }
  }, 250);
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const message = String(chatInput?.value || "").trim();
  if (!message) {
    chatInput?.focus();
    return;
  }

  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou voye mesaj nan group chat la.", "error");
      return;
    }

    if (chatInput) {
      chatInput.disabled = true;
    }

    const username = currentChatProfile?.username || user.displayName || "Jwe";
    await sendChatMessage({ user, text: message, username, replyTo: activeReplyTarget });
    await trimChatMessages(10);
    setReplyTarget(null);

    if (chatInput) {
      chatInput.value = "";
      chatInput.focus();
    }
  } catch (error) {
    console.error("Chat send failed:", { code: error?.code, message: error?.message });
    setFeedback("Nou pa rive voye mesaj la kounye a.", "error");
  } finally {
    if (chatInput) {
      chatInput.disabled = false;
    }
  }
}

async function handleSendGroupInvite() {
  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeInviteModal();
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou voye yon envitasyon nan group la.", "error");
      return;
    }

    if (!lastInviteCode) {
      lastInviteCode = generateInviteCode();
    }

    const wagerCoins = getInviteWagerAmount();
    await ensureUserCanCoverWager(user, wagerCoins);
    const username = currentChatProfile?.username || user.displayName || "Jwe";
    const inviteMessage = `${GROUP_MATCH_INVITE_TEXT} Fok ou gen ${wagerCoins} coins pou rantre.`;
    await createMatchRoom({
      code: lastInviteCode,
      hostUid: user.uid,
      hostUsername: username,
      isBot: false,
      wagerCoins,
    });
    const sentInviteMessage = await sendChatMessage({
      user,
      text: inviteMessage,
      username,
      messageType: "match-invite",
      invite: {
        code: lastInviteCode,
        hostUid: user.uid,
        hostUsername: username,
        wagerCoins,
        status: "open",
      },
    });
    scheduleBotJoinForInvite(lastInviteCode, sentInviteMessage?.id || "");
    await trimChatMessages(10);
    setInviteStatus("Envitasyon an voye nan group la.", "success");
    closeInviteModal(true);
  } catch (error) {
    console.error("Group invite failed:", { code: error?.code, message: error?.message });
    if ((error?.message || error?.code) === "insufficient-coins") {
      setInviteStatus(getInsufficientCoinsMessage(error, getInviteWagerAmount()).replace("rantre nan", "kreye"), "error");
      return;
    }
    setInviteStatus("Nou pa rive voye envitasyon an kounye a.", "error");
  }
}

async function handleGenerateInviteCode() {
  inviteCodePanel?.classList.remove("is-hidden");
  inviteCodeResult?.classList.add("is-hidden");
  haveCodeForm?.classList.add("is-hidden");
  syncInviteWagerInputs("primary");
  setInviteStatus("Chwazi miz match la avan nou kreye kod la.", "info");
  window.setTimeout(() => inviteCodeWagerInput?.focus(), 0);
}

async function handleConfirmGenerateInviteCode() {
  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeInviteModal();
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou kreye yon kod match.", "error");
      return;
    }

    syncInviteWagerInputs("code");
    lastInviteCode = generateInviteCode();
    if (inviteCodeOutput) {
      inviteCodeOutput.textContent = lastInviteCode;
    }
    const wagerCoins = Math.max(25, Math.floor(Number(inviteCodeWagerInput?.value || inviteWagerInput?.value || 25)));
    await ensureUserCanCoverWager(user, wagerCoins);
    const username = currentChatProfile?.username || user.displayName || "Jwe";
    await createMatchRoom({
      code: lastInviteCode,
      hostUid: user.uid,
      hostUsername: username,
      isBot: false,
      wagerCoins,
    });
    inviteCodeResult?.classList.remove("is-hidden");
    if (inviteCodeNote) {
      inviteCodeNote.textContent = `Miz match la se ${wagerCoins} coins. Pataje kod sa ak jwe ou vle envite a.`;
    }
    setInviteStatus(`Kod la pare. Miz la se ${wagerCoins} coins. Ou ka kopye li oswa rantre nan match la.`, "success");
    return;
  } catch (error) {
    if ((error?.message || error?.code) === "insufficient-coins") {
      const wagerCoins = Math.max(25, Math.floor(Number(inviteCodeWagerInput?.value || inviteWagerInput?.value || 25)));
      setInviteStatus(getInsufficientCoinsMessage(error, wagerCoins).replace("rantre nan", "kreye"), "error");
      return;
    }
    setInviteStatus("Kod la pare, men salle la pa kreye. Eseye anko.", "error");
    return;
  }
  setInviteStatus("Kòd la pare. Ou ka pataje li ak yon lòt jwè.", "success");
}

function handleShowHaveCode() {
  haveCodeForm?.classList.remove("is-hidden");
  inviteCodePanel?.classList.add("is-hidden");
  joinVerifiedCodeButton?.classList.add("is-hidden");
  setInviteStatus("Antre kod la pou kontinye.", "info");
  window.setTimeout(() => haveCodeInput?.focus(), 0);
  return;
  setInviteStatus("Antre kòd la pou kontinye.", "info");
  window.setTimeout(() => haveCodeInput?.focus(), 0);
}

async function handleVerifyInviteCode() {
  const code = String(haveCodeInput?.value || "").trim().toUpperCase();
  if (!code) {
    setInviteStatus("Antre yon kod envitasyon avan.", "error");
    haveCodeInput?.focus();
    return;
  }

  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeInviteModal();
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou verifye kod match la.", "error");
      return;
    }

    const room = await loadMatchRoom(code);
    if (!room || room.status !== "open" || room.gameState?.startedWithBothInGame || room.gameState?.gameOver) {
      setInviteStatus("Kod sa deja itilize oswa li pa existe.", "error");
      joinVerifiedCodeButton?.classList.add("is-hidden");
      return;
    }
    if (room.hostUid === user.uid) {
      setInviteStatus("Ou kreye kod sa. Klike Rejoindre le match nan kod ou a.", "error");
      joinVerifiedCodeButton?.classList.add("is-hidden");
      return;
    }

    const wagerCoins = Number(room.wagerCoins || 25);
    await ensureUserCanCoverWager(user, wagerCoins);
    setInviteStatus(`Kod la valide. Miz salle la se ${wagerCoins} coins.`, "success");
    if (joinVerifiedCodeButton) {
      joinVerifiedCodeButton.textContent = `Rejoindre le match (${wagerCoins} coins)`;
    }
    joinVerifiedCodeButton?.classList.remove("is-hidden");
  } catch (error) {
    if ((error?.message || error?.code) === "insufficient-coins") {
      setInviteStatus(getInsufficientCoinsMessage(error), "error");
      return;
    }
    setInviteStatus("Nou pa rive verifye kod la kounye a.", "error");
  }
}

async function handleHaveCodeSubmit(event) {
  event.preventDefault();

  const code = String(haveCodeInput?.value || "").trim().toUpperCase();
  if (!code) {
    setInviteStatus("Antre yon kod envitasyon avan.", "error");
    haveCodeInput?.focus();
    return;
  }
  if (hasJoinedMatchCode(code)) {
    setInviteStatus("Ou deja rantre nan match sa.", "error");
    return;
  }

  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      closeInviteModal();
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou rantre nan match la.", "error");
      return;
    }

    const roomPreview = await loadMatchRoom(code);
    if (!roomPreview) {
      setInviteStatus("Kod sa pa existe.", "error");
      return;
    }
    await ensureUserCanEnterRoom(user, roomPreview, "guest");

    const username = currentChatProfile?.username || user.displayName || "Jwe";
    const room = await joinMatchRoom({
      code,
      user,
      username,
    });
    rememberJoinedMatchCode(room.code || code);
    window.location.href = getJoinMatchUrl(room.code || code);
    return;
  } catch (error) {
    const errorCode = error?.message || error?.code || "";
    if (errorCode === "room-not-found") {
      setInviteStatus("Kod sa pa existe.", "error");
      return;
    }
    if (errorCode === "room-already-joined" || errorCode === "room-closed") {
      setInviteStatus("Kod sa deja itilize.", "error");
      return;
    }
    if (errorCode === "host-cannot-join-own-room") {
      setInviteStatus("Ou kreye kod sa. Klike Rejoindre le match pou rantre.", "error");
      return;
    }
    if (errorCode === "insufficient-coins") {
      setInviteStatus(getInsufficientCoinsMessage(error), "error");
      return;
    }
    setInviteStatus("Nou pa rive valide kod la kounye a.", "error");
    return;
  }

  if (!code) {
    setInviteStatus("Antre yon kòd envitasyon avan.", "error");
    haveCodeInput?.focus();
    return;
  }

  setInviteStatus(`Kòd ${code} anrejistre. Pale ak jwè a nan group la pou lanse match la.`, "success");
}

async function handleCopyInviteCode() {
  const code = String(lastInviteCode || inviteCodeOutput?.textContent || "").trim().toUpperCase();
  if (!code) {
    setInviteStatus("Pa gen kod pou kopye.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    setInviteStatus("Kod la kopye.", "success");
  } catch (_) {
    setInviteStatus(`Kod la: ${code}`, "info");
  }
}

function handleEnterGeneratedMatch() {
  const code = String(lastInviteCode || inviteCodeOutput?.textContent || "").trim().toUpperCase();
  enterHostMatchByCode(code, enterGeneratedMatchButton);
}

async function handleJoinMatchInvite(button) {
  const inviteCode = String(button?.dataset?.joinInviteCode || "").trim().toUpperCase();
  const isHostEnter = button?.dataset?.hostEnter === "1";
  const originalButtonText = button?.textContent || "";
  setChatFeedback("");
  if (button) {
    button.disabled = true;
    button.textContent = "Verification...";
  }

  if (isHostEnter && inviteCode) {
    try {
      const room = await loadMatchRoom(inviteCode);
      const user = currentChatUser || (await getCurrentUser().catch(() => null));
      if (!user) {
        if (button) {
          button.disabled = false;
          button.textContent = originalButtonText;
        }
        closeChatModal();
        openAuthModal("login");
        setFeedback("Konekte pou rantre nan match la.", "error");
        return;
      }
      if (isMatchRoomAlreadyUsed(room, "host")) {
        button.disabled = true;
        button.textContent = "Match deja itilize";
        rememberJoinedMatchCode(inviteCode);
        renderChatMessages(latestChatMessages);
        setChatFeedback("Ou deja antre nan match sa. Invitation an pa ka relanse menm match la.", "error");
        return;
      }
      await ensureUserCanEnterRoom(user, room, "host");

      rememberJoinedMatchCode(inviteCode);
      window.location.href = getJoinMatchUrl(inviteCode);
    } catch (error) {
      console.error("Host enter invite failed:", { code: error?.code, message: error?.message });
      if ((error?.message || error?.code) === "insufficient-coins") {
        if (button) {
          button.textContent = "Coins insuffisants";
        }
        setChatFeedback(getInsufficientCoinsMessage(error), "error");
        return;
      }
      setChatFeedback("Nou pa rive verifye match la kounye a.", "error");
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
    }
    return;
  }

  try {
    const user = currentChatUser || (await getCurrentUser().catch(() => null));
    if (!user) {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
      closeChatModal();
      openAuthModal("login");
      setFeedback("Konekte pou rejwenn match la.", "error");
      return;
    }

    const roomPreview = await loadMatchRoom(inviteCode);
    if (!roomPreview) {
      setChatFeedback("Invitation sa pa existe anko.", "error");
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
      return;
    }
    await ensureUserCanEnterRoom(user, roomPreview, "guest");

    const username = currentChatProfile?.username || user.displayName || "Jwe";
    const room = await joinMatchRoom({
      code: inviteCode,
      user,
      username,
      messageId: button?.dataset?.joinMessageId || "",
    });
    rememberJoinedMatchCode(room.code || inviteCode);
    window.location.href = getJoinMatchUrl(room.code || inviteCode);
  } catch (error) {
    console.error("Join invite failed:", { code: error?.code, message: error?.message });
    const code = error?.message || error?.code || "";
    if (code === "room-already-joined") {
      setChatFeedback("Yon lot jwè deja rantre nan match sa. Invitation an dezaktive.", "error");
      if (button) {
        button.textContent = "Invitation desactivee";
      }
      return;
    }
    if (code === "host-cannot-join-own-room") {
      setChatFeedback("Ou pa ka rantre nan pwop invitation ou avan yon lot jwè antre.", "error");
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
      return;
    }
    if (code === "insufficient-coins") {
      if (button) {
        button.textContent = "Coins insuffisants";
      }
      setChatFeedback(getInsufficientCoinsMessage(error), "error");
      return;
    }
    setChatFeedback("Nou pa rive rejwenn match la kounye a.", "error");
    if (button) {
      button.disabled = false;
      button.textContent = originalButtonText;
    }
  }
}

function getFieldValue(form, name) {
  const field = form?.elements?.namedItem(name);
  return typeof field?.value === "string" ? field.value : "";
}

function getFieldChecked(form, name) {
  const field = form?.elements?.namedItem(name);
  return Boolean(field?.checked);
}

function setBusy(form, isBusy) {
  if (!form) {
    return;
  }

  form.querySelectorAll("input, button").forEach((element) => {
    element.disabled = isBusy;
  });
}

function getAuthErrorMessage(error, fallbackMessage) {
  const code = error?.code || "";

  if (code === "auth/operation-not-allowed") {
    return "Aktive metod Email/Password nan Firebase Authentication pou kont yo ka kreye.";
  }
  if (code === "auth/email-already-in-use") {
    return "Non itilizate sa deja egziste.";
  }
  if (code === "auth/invalid-email") {
    return "Non itilizate sa pa valid. Eseye yon lot non.";
  }
  if (code === "auth/weak-password") {
    return "Modpas la two feb. Mete omwen 6 karakter.";
  }
  if (code === "auth/invalid-api-key") {
    return "Kle Firebase la pa valid. Verifye konfigirasyon Firebase la.";
  }
  if (code === "auth/network-request-failed") {
    return "Rezo a pa disponib. Verifye koneksyon an epi reeseye.";
  }

  return fallbackMessage;
}

function formatCoinBalance(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function setSignedInUI(user, profile = null) {
  const username = profile?.username || user?.displayName || "Jwe";
  const coins = profile?.coins;
  currentChatUser = user || null;
  currentChatProfile = profile || (user ? { username } : null);
  updateShopApplyLink();
  renderChatMessages(latestChatMessages);
  syncChatUnreadIndicator();
  if (chatModal?.classList.contains("is-open")) {
    refreshChatPresence();
  }

  if (user) {
    openAuthButton?.classList.add("is-hidden");
    headerUserLink?.classList.remove("is-hidden");
    if (headerUsername) {
      headerUsername.textContent = username;
    }
    if (coinBalance) {
      coinBalance.textContent = formatCoinBalance(coins);
    }
    if (shopBalance) {
      shopBalance.textContent = formatCoinBalance(coins);
    }
    return;
  }

  openAuthButton?.classList.remove("is-hidden");
  headerUserLink?.classList.add("is-hidden");
  if (headerUsername) {
    headerUsername.textContent = "Jwe";
  }
  if (coinBalance) {
    coinBalance.textContent = formatCoinBalance(0);
  }
  if (shopBalance) {
    shopBalance.textContent = formatCoinBalance(0);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  await initFirebaseClient();

  const form = event.currentTarget;
  const username = String(getFieldValue(form, "username")).trim();
  const password = String(getFieldValue(form, "password"));
  const confirmPassword = String(getFieldValue(form, "confirmPassword"));
  const age18 = getFieldChecked(form, "age18");
  const acceptTerms = getFieldChecked(form, "acceptTerms");
  const usernameKey = normalizeUsername(username);

  setFeedback("");

  if (!usernameKey || username.length < 3) {
    setFeedback("Chwazi yon non itilizate ki gen omwen 3 karakter.", "error");
    return;
  }
  if (password.length < 6) {
    setFeedback("Modpas la dwe gen omwen 6 karakter.", "error");
    return;
  }
  if (password !== confirmPassword) {
    setFeedback("Modpas yo pa menm.", "error");
    return;
  }
  if (!age18 || !acceptTerms) {
    setFeedback("Ou dwe konfime ou gen plis pase 18 an epi aksepte kondisyon yo.", "error");
    return;
  }

  setBusy(form, true);
  try {
    const user = await createAccount({ username, password });
    await saveUserProfile(user, { username, usernameKey, coins: 0 });
    setSignedInUI(user, { username, coins: 0 });
    setFeedback("Kont lan kreye ak sikse.", "success");
    closeAuthModal();
  } catch (error) {
    console.error("Firebase signup failed:", { code: error?.code, message: error?.message });
    setFeedback(getAuthErrorMessage(error, "Nou pa ka kreye kont lan kounye a."), "error");
  } finally {
    setBusy(form, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  await initFirebaseClient();

  const form = event.currentTarget;
  const username = String(getFieldValue(form, "username")).trim();
  const password = String(getFieldValue(form, "password"));

  setFeedback("");

  if (!username) {
    setFeedback("Antre non itilizate ou.", "error");
    return;
  }

  setBusy(form, true);
  try {
    const user = await loginWithUsername({ username, password });
    setSignedInUI(user, { username: user.displayName || username });
    setFeedback(`Byenvini ${user.displayName || username}.`, "success");
    closeAuthModal();
  } catch (error) {
    console.error("Firebase login failed:", { code: error?.code, message: error?.message });
    setFeedback(getAuthErrorMessage(error, "Non itilizate a oswa modpas la pa bon."), "error");
  } finally {
    setBusy(form, false);
  }
}

async function handleProfileEntry() {
  try {
    const { auth } = await initFirebaseClient();
    if (auth.currentUser) {
      window.location.href = "profil.html";
      return;
    }
  } catch (_) {
    // If Firebase is not ready we still fall back to auth modal.
  }

  openAuthModal("login");
}

function handlePlayGuideUnderstood() {
  closePlayGuideModal();
  window.setTimeout(() => {
    openChatModal();
  }, 180);
}

function handlePlayGuideDismissForever() {
  hidePlayGuideForever();
  closePlayGuideModal();
  window.setTimeout(() => {
    openChatModal();
  }, 180);
}

function handleWithdrawEntry() {
  if (shouldSkipWithdrawGuide()) {
    openSellerShopFlow();
    return;
  }

  openWithdrawGuideModal();
}

function handleWithdrawGuideUnderstood() {
  closeWithdrawGuideModal();
  window.setTimeout(() => {
    openSellerShopFlow();
  }, 180);
}

function handleWithdrawGuideDismissForever() {
  hideWithdrawGuideForever();
  closeWithdrawGuideModal();
  window.setTimeout(() => {
    openSellerShopFlow();
  }, 180);
}

async function handleSellCoinsSubmit(event) {
  event.preventDefault();
  setSellCoinsFeedback("");

  const amount = Number.parseInt(String(sellCoinsAmountInput?.value || "").trim(), 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    setSellCoinsFeedback("Mete yon kantite coin ki pi gran pase 0.", "error");
    sellCoinsAmountInput?.focus();
    return;
  }
  if (amount < 100) {
    setSellCoinsFeedback("Ou pa ka vann mwens pase 100 coins.", "error");
    setFeedback("Ou pa ka vann mwens pase 100 coins.", "error");
    sellCoinsAmountInput?.focus();
    return;
  }

  if (!activeSellContact?.uid) {
    setSellCoinsFeedback("Vendeur sa pa lye ak yon kont aktif.", "error");
    setFeedback("Vendeur sa pa lye ak yon kont aktif.", "error");
    return;
  }

  const user = currentChatUser || (await getCurrentUser().catch(() => null));
  if (!user) {
    setSellCoinsFeedback("Konekte avan ou vann coins ou yo.", "error");
    closeSellCoinsModal();
    openAuthModal("login");
    setFeedback("Konekte avan ou vann coins ou yo.", "error");
    return;
  }

  if (activeSellContact.uid === user.uid) {
    setSellCoinsFeedback("Ou pa ka vann coins ou yo bay pwop kont pa ou.", "error");
    setFeedback("Ou pa ka vann coins ou yo bay pwop kont pa ou.", "error");
    return;
  }

  setBusy(sellCoinsForm, true);
  try {
    const result = await sellCoinsToVendor({
      sellerUid: activeSellContact.uid,
      amount,
      user,
    });

    currentChatProfile = {
      ...(currentChatProfile || { username: user.displayName || "Jwe" }),
      coins: result.playerCoins,
    };
    setSignedInUI(user, currentChatProfile);

    setSellCoinsFeedback(`${formatCoinBalance(result.amount)} coins voye bay ${activeSellContact.name || result.sellerUsername}.`, "success");
    setFeedback(`${formatCoinBalance(result.amount)} coins voye bay ${activeSellContact.name || result.sellerUsername}.`, "success");
    if (activeShopFilter === "history") {
      shopHistoryItems = [];
      shopHistoryVisibleCount = 3;
      shopHistoryHasMore = false;
      renderShopHistory();
    }
    window.setTimeout(() => {
      closeSellCoinsModal();
    }, 900);
  } catch (error) {
    const code = error?.code || error?.message || "";
    if (code === "insufficient-player-coins") {
      setSellCoinsFeedback("Ou pa gen ase coins sou kont ou pou vann kantite sa.", "error");
      setFeedback("Ou pa gen ase coins sou kont ou pou vann kantite sa.", "error");
    } else if (code === "sell-minimum-not-reached") {
      setSellCoinsFeedback("Ou pa ka vann mwens pase 100 coins.", "error");
      setFeedback("Ou pa ka vann mwens pase 100 coins.", "error");
    } else if (code === "self-sell-forbidden") {
      setSellCoinsFeedback("Ou pa ka vann coins ou yo bay pwop kont pa ou.", "error");
      setFeedback("Ou pa ka vann coins ou yo bay pwop kont pa ou.", "error");
    } else if (code === "seller-not-found") {
      setSellCoinsFeedback("Kont vendeur la pa jwenn.", "error");
      setFeedback("Kont vendeur la pa jwenn.", "error");
    } else if (code === "permission-denied") {
      setSellCoinsFeedback("Firebase pa bay dwa pou fe tranzaksyon sa.", "error");
      setFeedback("Firebase pa bay dwa pou fe tranzaksyon sa.", "error");
    } else {
      setSellCoinsFeedback("Nou pa ka finalize vant sa kounye a.", "error");
      setFeedback("Nou pa ka finalize vant sa kounye a.", "error");
    }
  } finally {
    setBusy(sellCoinsForm, false);
  }
}

openAuthButton?.addEventListener("click", () => openAuthModal("signup"));
openChatButton?.addEventListener("click", openChatModal);
openWithdrawGuideButton?.addEventListener("click", handleWithdrawEntry);
openShopButton?.addEventListener("click", openShopModal);
openShopBalanceButton?.addEventListener("click", openShopModal);
openInviteModalButton?.addEventListener("click", openInviteModal);
enterGameButton?.addEventListener("click", handleEnterGame);
openGamesChatButton?.addEventListener("click", handleEnterGame);
openAuthBottomButton?.addEventListener("click", handleProfileEntry);
closeAuthButton?.addEventListener("click", closeAuthModal);
closeChatButton?.addEventListener("click", closeChatModal);
closeShopButton?.addEventListener("click", closeShopModal);
closeInviteModalButton?.addEventListener("click", closeInviteModal);
closeSellCoinsButton?.addEventListener("click", closeSellCoinsModal);
playGuideUnderstoodButton?.addEventListener("click", handlePlayGuideUnderstood);
playGuideDismissForeverButton?.addEventListener("click", handlePlayGuideDismissForever);
withdrawGuideUnderstoodButton?.addEventListener("click", handleWithdrawGuideUnderstood);
withdrawGuideDismissForeverButton?.addEventListener("click", handleWithdrawGuideDismissForever);
cancelChatReplyButton?.addEventListener("click", () => setReplyTarget(null));
sendGroupInviteButton?.addEventListener("click", handleSendGroupInvite);
generateInviteCodeButton?.addEventListener("click", handleGenerateInviteCode);
confirmGenerateInviteCodeButton?.addEventListener("click", handleConfirmGenerateInviteCode);
copyInviteCodeButton?.addEventListener("click", handleCopyInviteCode);
enterGeneratedMatchButton?.addEventListener("click", handleEnterGeneratedMatch);
showHaveCodeButton?.addEventListener("click", handleShowHaveCode);
verifyInviteCodeButton?.addEventListener("click", handleVerifyInviteCode);
haveCodeInput?.addEventListener("input", () => {
  joinVerifiedCodeButton?.classList.add("is-hidden");
  if (joinVerifiedCodeButton) {
    joinVerifiedCodeButton.textContent = "Rejoindre le match";
  }
});

authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeAuthModal();
  }
});

chatModal?.addEventListener("click", (event) => {
  if (event.target === chatModal) {
    closeChatModal();
  }
});

inviteModal?.addEventListener("click", (event) => {
  if (event.target === inviteModal) {
    closeInviteModal();
  }
});

shopModal?.addEventListener("click", (event) => {
  if (event.target === shopModal || event.target.classList.contains("shop-screen-backdrop")) {
    closeShopModal();
  }
});

sellCoinsModal?.addEventListener("click", (event) => {
  if (event.target === sellCoinsModal) {
    closeSellCoinsModal();
  }
});

shopFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setShopFilter(button.dataset.shopFilter || "seller");
  });
});

shopHistoryMoreButton?.addEventListener("click", () => {
  renderShopHistory({ append: true });
});

chatMessages?.addEventListener("click", (event) => {
  const joinButton = event.target.closest(".chat-join-button");
  if (joinButton) {
    handleJoinMatchInvite(joinButton);
    return;
  }

  const replyButton = event.target.closest(".chat-reply-button");
  if (!replyButton) {
    return;
  }

  setReplyTarget({
    id: replyButton.dataset.replyId || "",
    uid: replyButton.dataset.replyUid || "",
    username: replyButton.dataset.replyAuthor || "Jwe",
    text: replyButton.dataset.replyText || "",
  });
});

shopContactList?.addEventListener("click", (event) => {
  const sellButton = event.target.closest("[data-sell-contact]");
  if (!sellButton) {
    return;
  }

  openSellCoinsModal({
    name: sellButton.dataset.sellContact || "",
    uid: sellButton.dataset.sellUid || "",
  });
});

playGuideModal?.addEventListener("click", (event) => {
  if (event.target === playGuideModal) {
    closePlayGuideModal();
  }
});

withdrawGuideModal?.addEventListener("click", (event) => {
  if (event.target === withdrawGuideModal) {
    closeWithdrawGuideModal();
  }
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab || "login"));
});

authSwitchButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const nextMode = button.dataset.authSwitch || "login";
    setAuthMode(nextMode);
    focusAuthField(nextMode);
  });
});

passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

authLoginForm?.addEventListener("submit", handleLogin);
authSignupForm?.addEventListener("submit", handleSignup);
chatForm?.addEventListener("submit", handleChatSubmit);
haveCodeForm?.addEventListener("submit", handleHaveCodeSubmit);
sellCoinsForm?.addEventListener("submit", handleSellCoinsSubmit);

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (chatModal?.classList.contains("is-open")) {
    closeChatModal();
  }

  if (inviteModal?.classList.contains("is-open")) {
    closeInviteModal();
  }

  if (shopModal?.classList.contains("is-open")) {
    closeShopModal();
  }

  if (playGuideModal?.classList.contains("is-open")) {
    closePlayGuideModal();
  }

  if (withdrawGuideModal?.classList.contains("is-open")) {
    closeWithdrawGuideModal();
  }

  if (sellCoinsModal?.classList.contains("is-open")) {
    closeSellCoinsModal();
  }

  if (authModal?.classList.contains("is-open")) {
    closeAuthModal();
  }
});

window.addEventListener("beforeunload", () => {
  stopChatPresence();
});

renderLucideIcons();
setAuthMode("signup");
renderChatMessages([]);
setShopFilter("seller");
refreshShopDirectory();
setReplyTarget(null);
updateChatOnlineCount();

initFirebaseClient()
  .then(() => {
    ensureChatSubscription().catch(() => {});
    listenToAuthState(async (user) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      if (!user) {
        setSignedInUI(null);
        return;
      }

      const profile = await loadUserProfile(user.uid).catch(() => null);
      setSignedInUI(user, profile);
      profileUnsubscribe = await listenToUserProfile(user.uid, (nextProfile) => {
        setSignedInUI(user, nextProfile);
      }).catch(() => null);
    });
  })
  .catch(() => {
    setSignedInUI(null);
  });

const params = new URLSearchParams(window.location.search);
if (params.get("auth") === "login") {
  openAuthModal("login");
}

window.setTimeout(() => {
  splashScreen?.classList.add("is-hidden");
}, 3000);
