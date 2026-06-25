(function () {
  const DISMISS_KEY = "penal-lakay-pwa-install-dismissed";
  const INSTALLED_KEY = "penal-lakay-pwa-installed";
  let deferredPrompt = null;

  const installPill = document.getElementById("pwa-install-pill");
  const installModal = document.getElementById("pwa-install-modal");
  const installConfirm = document.getElementById("pwa-install-confirm");
  const installLater = document.getElementById("pwa-install-later");
  const installClose = document.getElementById("pwa-install-close");
  const installCopy = document.getElementById("pwa-install-copy");
  const iosSteps = document.getElementById("pwa-ios-steps");

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  }

  function wasDismissedRecently() {
    const dismissedAt = Number(window.localStorage?.getItem(DISMISS_KEY) || 0);
    return dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
  }

  function setDismissed() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (_) {
      // Ignore storage failures.
    }
  }

  function markInstalled() {
    try {
      window.localStorage.setItem(INSTALLED_KEY, "1");
    } catch (_) {
      // Ignore storage failures.
    }
  }

  function shouldOfferInstall() {
    if (isStandalone()) {
      markInstalled();
      return false;
    }
    if (window.localStorage?.getItem(INSTALLED_KEY) === "1") {
      return false;
    }
    return !wasDismissedRecently();
  }

  function setIosMode() {
    if (!installConfirm || !installCopy || !iosSteps) {
      return;
    }
    installConfirm.textContent = "Voir les etapes";
    installCopy.textContent = "Sur iPhone, l'installation se fait depuis Safari avec le bouton Partager.";
    iosSteps.innerHTML = `
      <li>Appuie sur le bouton Partager dans Safari.</li>
      <li>Choisis Ajouter a l'ecran d'accueil.</li>
      <li>Confirme avec Ajouter.</li>
    `;
    iosSteps.hidden = false;
  }

  function setManualMode() {
    if (!installConfirm || !installCopy || !iosSteps) {
      return;
    }
    installConfirm.textContent = "Compris";
    installCopy.textContent = "Si le bouton d'installation natif n'apparait pas, utilise le menu de ton navigateur.";
    iosSteps.innerHTML = `
      <li>Ouvre le menu du navigateur.</li>
      <li>Choisis Installer l'application ou Ajouter a l'ecran d'accueil.</li>
      <li>Confirme pour garder Penal Lakay sur ton appareil.</li>
    `;
    iosSteps.hidden = false;
  }

  function openInstallModal() {
    if (!installModal || !shouldOfferInstall()) {
      return;
    }
    if (isIos() && !deferredPrompt) {
      setIosMode();
    } else if (!deferredPrompt) {
      setManualMode();
    }
    installModal.hidden = false;
    installModal.classList.add("is-open");
    installModal.setAttribute("aria-hidden", "false");
    window.lucide?.createIcons?.();
  }

  function closeInstallModal({ dismiss = false } = {}) {
    if (!installModal) {
      return;
    }
    if (dismiss) {
      setDismissed();
    }
    installModal.classList.remove("is-open");
    installModal.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!installModal.classList.contains("is-open")) {
        installModal.hidden = true;
      }
    }, 220);
  }

  function showInstallPill() {
    if (!installPill || !shouldOfferInstall()) {
      return;
    }
    installPill.hidden = false;
    installPill.classList.add("is-visible");
    window.lucide?.createIcons?.();
  }

  async function installApp() {
    if (installConfirm?.textContent === "Compris" && !deferredPrompt) {
      closeInstallModal({ dismiss: true });
      return;
    }
    if (isIos() && !deferredPrompt) {
      setIosMode();
      return;
    }
    if (!deferredPrompt) {
      setManualMode();
      return;
    }

    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") {
      markInstalled();
      closeInstallModal();
      if (installPill) {
        installPill.hidden = true;
      }
      return;
    }
    setDismissed();
    closeInstallModal();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallPill();
    window.setTimeout(openInstallModal, 4500);
  });

  window.addEventListener("appinstalled", () => {
    markInstalled();
    closeInstallModal();
    if (installPill) {
      installPill.hidden = true;
    }
  });

  installPill?.addEventListener("click", openInstallModal);
  installConfirm?.addEventListener("click", installApp);
  installLater?.addEventListener("click", () => closeInstallModal({ dismiss: true }));
  installClose?.addEventListener("click", () => closeInstallModal({ dismiss: true }));
  installModal?.addEventListener("click", (event) => {
    if (event.target === installModal) {
      closeInstallModal({ dismiss: true });
    }
  });

  registerServiceWorker();

  window.setTimeout(() => {
    if (shouldOfferInstall()) {
      showInstallPill();
    }
  }, 2500);
})();
