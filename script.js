import {
  acceptMatchRematch,
  advanceMatchTurn,
  getCurrentUser,
  initFirebaseClient,
  listenMatchRoom,
  loadMatchRoom,
  loadUserProfile,
  markMatchParticipantInGame,
  markMatchParticipantLeft,
  requestMatchRematch,
  resolveMatchTurn,
  settleMatchWagerForPlayer,
  submitMatchTurnChoice,
  updateMatchRoomGameState,
} from "./auth-client.js";

const gameStage = document.querySelector(".game-stage");
const gameWrapper = document.querySelector(".game-wrapper");
const ball = document.getElementById("ball");
const ballWrapper = document.querySelector(".ball-wrapper");
const keeper = document.getElementById("keeper");
const opponentKeeper = document.getElementById("opponent-keeper");
const openChatButton = document.getElementById("open-chat");
const splashScreen = document.getElementById("splash-screen");
const enterGameButton = document.getElementById("enter-game");
const openAuthButton = document.getElementById("open-auth");
const openAuthBottomButton = document.getElementById("open-auth-bottom");
const closeAuthButton = document.getElementById("close-auth");
const authModal = document.getElementById("auth-modal");
const authTabs = Array.from(document.querySelectorAll(".auth-tab"));
const authLoginForm = document.getElementById("auth-login-form");
const authSignupForm = document.getElementById("auth-signup-form");
const playCtaArrow = document.querySelector(".play-cta-arrow");
const bottomNavIcons = Array.from(document.querySelectorAll(".bottom-nav-icon"));
const shotMap = document.querySelector(".shot-map");
const shotTargets = Array.from(document.querySelectorAll(".shot-target"));
const decorFrame = document.querySelector(".decor-frame");
const decorFrameSource = document.querySelector(".decor-frame source");
const decorFrameImage = document.querySelector(".decor-frame img");
const aimTarget = document.getElementById("aim-target");
const goalMouth = document.getElementById("goal-mouth");
const statusText = document.getElementById("status-text");
const stadiumAudio = document.getElementById("stadium-audio");
const bg2Audio = document.getElementById("bg2-audio");
const shootAudio = document.getElementById("shoot-audio");
const goalAudio = document.getElementById("goal-audio");
const saveAudio = document.getElementById("save-audio");
const playerScore = document.getElementById("player-score");
const cpuScore = document.getElementById("cpu-score");
const playerScoreMain = document.getElementById("player-score-main");
const cpuScoreMain = document.getElementById("cpu-score-main");
const playerTrackDots = Array.from(document.querySelectorAll("#player-track .track-dot"));
const cpuTrackDots = Array.from(document.querySelectorAll("#cpu-track .track-dot"));
const roundLabel = document.getElementById("round-label");
const turnLabel = document.getElementById("turn-label");
const opponentNameLabel = document.getElementById("opponent-name-label");
const gameCoinBalance = document.getElementById("game-coin-balance");
const turnCountdown = document.getElementById("turn-countdown");
const turnCountdownValue = document.getElementById("turn-countdown-value");
const matchResultModal = document.getElementById("match-result-modal");
const matchResultKicker = document.getElementById("match-result-kicker");
const matchResultTitle = document.getElementById("match-result-title");
const matchResultMessage = document.getElementById("match-result-message");
const requestRematchButton = document.getElementById("request-rematch-button");
const acceptRematchButton = document.getElementById("accept-rematch-button");
const closeResultModalButton = document.getElementById("close-result-modal");
const DEFAULT_OPPONENT_NAME = "Adversaire";

const gsapApi = window.gsap;
const pageMode = document.body?.dataset?.page || "home";
const isGamePage = pageMode === "game";
let statusHideTimeout = null;
let audioContext = null;
let stadiumAudioStarted = false;
let bg2AudioStarted = false;
let decorRole = "player";
const uiState = {
  phase: "splash",
  authMode: "login",
};

const matchContext = {
  code: "",
  opponentName: DEFAULT_OPPONENT_NAME,
  isBot: false,
  playerUid: "",
  role: "local",
  isMultiplayer: false,
  opponentInGame: false,
  activeRematchId: "",
  handledRematchId: "",
};

let matchRoomUnsubscribe = null;
let lastSyncedStateSignature = "";
let applyingRemoteState = false;
let matchResolveTimer = null;
let countdownAnimationFrame = null;
let lastAnimatedTurnId = 0;
let resultModalShownForTurnId = 0;
let advancingTurn = false;
let localTurnResolveAt = 0;
let botReactionTimeout = null;

const shootoutState = {
  playerGoals: 0,
  cpuGoals: 0,
  playerShots: [],
  cpuShots: [],
  turn: "player-shoot",
  roundNumber: 1,
  gameOver: false,
  actionLocked: false,
};

const aimState = {
  active: false,
  x: 0,
  y: 0,
  layout: "",
};

const keeperPlacementState = {
  active: false,
  x: 0,
  y: 0,
  layout: "",
  zone: "center",
};

const keeperTargets = {
  "top-left": { rotation: -16, scaleX: 0.98 },
  "top-center": { rotation: -4, scaleX: 1.02 },
  "top-right": { rotation: 16, scaleX: 0.98 },
  "middle-left": { rotation: -10, scaleX: 1 },
  "middle-center": { rotation: 0, scaleX: 1.02 },
  "middle-right": { rotation: 10, scaleX: 1 },
  "bottom-left": { rotation: -8, scaleX: 1 },
  "bottom-center": { rotation: 0, scaleX: 1 },
  "bottom-right": { rotation: 8, scaleX: 1 },
  center: { rotation: 0, scaleX: 1.02 },
};

const keeperDiveAnchors = {
  "top-left": { x: 0.14, y: 0.14 },
  "top-center": { x: 0.5, y: 0.13 },
  "top-right": { x: 0.86, y: 0.14 },
  "middle-left": { x: 0.18, y: 0.5 },
  "middle-center": { x: 0.5, y: 0.5 },
  "middle-right": { x: 0.82, y: 0.5 },
  "bottom-left": { x: 0.2, y: 0.82 },
  "bottom-center": { x: 0.5, y: 0.84 },
  "bottom-right": { x: 0.8, y: 0.82 },
  center: { x: 0.5, y: 0.5 },
};

const zoneAnchors = {
  "top-left": { x: 0.14, y: 0.14 },
  "top-right": { x: 0.86, y: 0.14 },
  "middle-center": { x: 0.5, y: 0.5 },
  "bottom-left": { x: 0.2, y: 0.82 },
  "bottom-right": { x: 0.8, y: 0.82 },
  center: { x: 0.5, y: 0.5 },
};

const keeperDecorZones = [
  "top-left",
  "top-right",
  "middle-center",
  "bottom-left",
  "bottom-right",
];

const decorLayouts = {
  phone: {
    width: 916,
    height: 1717,
    goal: { x: 145, y: 818, width: 575, height: 310 },
  },
  desktop: {
    width: 1672,
    height: 941,
    goal: { x: 458, y: 250, width: 451, height: 353 },
  },
};

const decorAssets = {
  player: {
    phone: "assets/images/decorphone.png",
    desktop: "assets/images/decordesktop.png",
  },
  opponent: {
    phone: "assets/images/decorphoneadversaire.png",
    desktop: "assets/images/decordesktopadversaire.png",
  },
};

const playerKeeperDecorAssets = {
  phone: {
    topLeft: "assets/images/decorphonelucarnegauche.png",
    topRight: "assets/images/decorphonelucarnedroite.png",
    middle: "assets/images/decorphonemillieu.png",
    bottomLeft: "assets/images/decorphonecoinbasgauche.png",
    bottomRight: "assets/images/decorphonecoinbasdroite.png",
  },
  desktop: {
    topLeft: "assets/images/decordesktoplucarnegauche.png",
    topRight: "assets/images/decordesktoplucarnedroite.png",
    middle: "assets/images/decordesktopmillieu.png",
    bottomLeft: "assets/images/decordesktopcoinbasgauche.png",
    bottomRight: "assets/images/decordesktopcoinbasdroite.png",
  },
};

const opponentKeeperDecorAssets = {
  phone: {
    topLeft: "assets/images/decorphoneadversairelucarnegauche.png",
    topRight: "assets/images/decorphoneadversairelucarnedroite.png",
    middle: "assets/images/decorphoneadversairemilieu.png",
    bottomLeft: "assets/images/decorphoneadversairebasgauche.png",
    bottomRight: "assets/images/decorphoneadversairebasdroite.png",
  },
  desktop: {
    topLeft: "assets/images/decordesktopadversairelucarnegauche.png",
    topRight: "assets/images/decordesktopadversairelucarnedroite.png",
    middle: "assets/images/decordesktopadversairemillieu.png",
    bottomLeft: "assets/images/decordesktopadversairecoinbasgauche.png",
    bottomRight: "assets/images/decordesktopadversairecoinbasdroite.png",
  },
};

const shotTargetAnchors = {
  "top-left": { x: 0.14, y: 0.18 },
  "top-right": { x: 0.94, y: 0.18 },
  "middle-center": { x: 0.56, y: 0.58 },
  "bottom-left": { x: 0.14, y: 0.93 },
  "bottom-right": { x: 0.94, y: 0.93 },
};

const desktopShotTargetAnchors = {
  "top-left": { x: 0.0, y: 0.14 },
  "top-right": { x: 1.34, y: 0.14 },
  "middle-center": { x: 0.68, y: 0.54 },
  "bottom-left": { x: 0.0, y: 0.9 },
  "bottom-right": { x: 1.34, y: 0.9 },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtor();
  }

  return audioContext;
}

function unlockAudio() {
  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }

  startStadiumAudio();
}

function startStadiumAudio() {
  if (stadiumAudio && !stadiumAudioStarted) {
    stadiumAudio.volume = 0.22;
    stadiumAudioStarted = true;
    stadiumAudio.play().catch(() => {
      stadiumAudioStarted = false;
    });
  }

  if (bg2Audio && !bg2AudioStarted) {
    bg2Audio.volume = 0.14;
    bg2AudioStarted = true;
    bg2Audio.play().catch(() => {
      bg2AudioStarted = false;
    });
  }
}

function playTone({
  frequency,
  type = "sine",
  duration = 0.12,
  volume = 0.18,
  attack = 0.01,
  decay = 0.12,
  slideTo,
}) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.01, decay));

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playKickSound() {
  if (shootAudio) {
    shootAudio.currentTime = 0;
    shootAudio.play().catch(() => {});
    return;
  }

  playTone({
    frequency: 180,
    type: "triangle",
    duration: 0.14,
    volume: 0.22,
    attack: 0.003,
    decay: 0.12,
    slideTo: 92,
  });
}

function playSaveSound() {
  if (saveAudio) {
    saveAudio.currentTime = 0;
    saveAudio.play().catch(() => {});
    return;
  }

  playTone({
    frequency: 220,
    type: "square",
    duration: 0.09,
    volume: 0.15,
    attack: 0.002,
    decay: 0.08,
    slideTo: 180,
  });
  window.setTimeout(() => {
    playTone({
      frequency: 160,
      type: "square",
      duration: 0.1,
      volume: 0.12,
      attack: 0.002,
      decay: 0.09,
      slideTo: 120,
    });
  }, 55);
}

function playGoalSound() {
  if (goalAudio) {
    goalAudio.currentTime = 0;
    goalAudio.play().catch(() => {});
    return;
  }

  playTone({
    frequency: 520,
    type: "triangle",
    duration: 0.16,
    volume: 0.16,
    attack: 0.004,
    decay: 0.14,
    slideTo: 660,
  });
  window.setTimeout(() => {
    playTone({
      frequency: 660,
      type: "triangle",
      duration: 0.18,
      volume: 0.13,
      attack: 0.004,
      decay: 0.16,
      slideTo: 880,
    });
  }, 90);
}

function getStageConfig() {
  const isPhone = window.matchMedia("(max-width: 767px)").matches;

  return {
    width: gameWrapper.clientWidth,
    height: gameWrapper.clientHeight,
    stageClass: isPhone ? "is-phone" : "is-desktop",
    aimDefault: { x: 0.5, y: isPhone ? 0.43 : 0.38 },
  };
}

function isPhoneLayout() {
  return gameStage.classList.contains("is-phone");
}

function setDecorFrameSource(src) {
  if (decorFrameSource) {
    decorFrameSource.srcset = src;
  }

  if (decorFrameImage) {
    decorFrameImage.src = src;
  }
}

function preloadImage(src) {
  if (!src) {
    return Promise.resolve();
  }

  const image = new Image();
  image.src = src;

  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  if (typeof image.decode === "function") {
    return image.decode().catch(() => {});
  }

  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function getKeeperDecorSrc(role, zoneKey) {
  const layoutAssets = isPhoneLayout()
    ? (role === "player" ? opponentKeeperDecorAssets.phone : playerKeeperDecorAssets.phone)
    : (role === "player" ? opponentKeeperDecorAssets.desktop : playerKeeperDecorAssets.desktop);

  if (zoneKey === "top-left") {
    return layoutAssets.topLeft;
  }

  if (zoneKey === "top-right") {
    return layoutAssets.topRight;
  }

  if (zoneKey === "bottom-left") {
    return layoutAssets.bottomLeft;
  }

  if (zoneKey === "bottom-right") {
    return layoutAssets.bottomRight;
  }

  return layoutAssets.middle;
}

function playKeeperDecorAnimation(role, zoneKey) {
  if (!gsapApi || !decorFrameImage) {
    return;
  }

  const keeperSrc = getKeeperDecorSrc(role, zoneKey);
  if (!keeperSrc) {
    return;
  }

  preloadImage(keeperSrc).then(() => {
    if (shotMap) {
      shotMap.classList.add("is-hidden");
    }

    gsapApi.killTweensOf(decorFrameImage);
    gsapApi.fromTo(
      decorFrameImage,
      { opacity: 1, scale: 1 },
      {
        opacity: 0.98,
        scale: 1.006,
        duration: 0.08,
        ease: "power2.out",
        onComplete: () => {
          setDecorFrameSource(keeperSrc);
          gsapApi.fromTo(
            decorFrameImage,
            { opacity: 0.98, scale: 1.006 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.16,
              ease: "power2.out",
            },
          );
        },
      },
    );
  });
}

function stopPhoneDecorAnimation() {
  return;
}

function syncDecorForTurn(animate = false) {
  const opponentView = shootoutState.turn === "cpu-shoot";
  const assetSet = opponentView ? decorAssets.opponent : decorAssets.player;
  const decorSrc = isPhoneLayout() ? assetSet.phone : assetSet.desktop;
  decorRole = opponentView ? "opponent" : "player";

  const applyDecorSrc = () => {
    setDecorFrameSource(decorSrc);
  };

  if (!animate || !gsapApi || !decorFrameImage || !decorFrame) {
    applyDecorSrc();
    return;
  }

  const outgoingDecor = decorFrameImage.cloneNode(false);
  outgoingDecor.removeAttribute("id");
  outgoingDecor.alt = "";
  outgoingDecor.setAttribute("aria-hidden", "true");
  outgoingDecor.draggable = false;
  outgoingDecor.src = decorFrameImage.currentSrc || decorFrameImage.src;
  outgoingDecor.className = decorFrameImage.className;
  outgoingDecor.style.position = "absolute";
  outgoingDecor.style.inset = "0";
  outgoingDecor.style.width = "100%";
  outgoingDecor.style.height = "100%";
  outgoingDecor.style.objectFit = "cover";
  outgoingDecor.style.objectPosition = "center center";
  outgoingDecor.style.pointerEvents = "none";
  outgoingDecor.style.willChange = "transform, opacity";
  outgoingDecor.style.zIndex = "2";
  decorFrame.appendChild(outgoingDecor);

  gsapApi.killTweensOf(decorFrameImage);
  applyDecorSrc();
  gsapApi.set(decorFrameImage, {
    opacity: 0,
    scale: 0.992,
    x: 0,
    y: 0,
    filter: "blur(1.5px)",
    transformOrigin: "center center",
  });
  gsapApi.set(outgoingDecor, {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
    transformOrigin: "center center",
  });

  gsapApi.timeline({
    onComplete: () => {
      outgoingDecor.remove();
    },
  })
    .to(outgoingDecor, {
      opacity: 0,
      scale: 1.01,
      x: opponentView ? -10 : 10,
      duration: 0.52,
      ease: "power2.inOut",
    }, 0)
    .to(outgoingDecor, {
      filter: "blur(3px)",
      duration: 0.52,
      ease: "power2.inOut",
    }, 0)
    .to(decorFrameImage, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      duration: 0.56,
      delay: 0.07,
      ease: "power3.out",
    }, 0.04);
}

function animateShotTargetSelection(button, onComplete) {
  if (!button) {
    if (onComplete) {
      onComplete();
    }
    return;
  }

  shotTargets.forEach((target) => {
    if (target !== button) {
      target.classList.remove("is-picked");
    }
  });
  button.classList.add("is-picked");

  if (!gsapApi) {
    if (onComplete) {
      window.setTimeout(onComplete, 60);
    }
    return;
  }

  const ring = button.querySelector(".shot-target-ring");
  const dot = button.querySelector(".shot-target-dot");
  gsapApi.killTweensOf([button, ring, dot, shotMap]);
  button.style.transform = "translate(-50%, -50%)";
  if (ring) {
    gsapApi.set(ring, { opacity: 1, scale: 1 });
  }
  if (dot) {
    gsapApi.set(dot, { scale: 1 });
  }

  const tl = gsapApi.timeline({
    onComplete: () => {
      button.style.transform = "translate(-50%, -50%)";
      if (onComplete) {
        onComplete();
      }
    },
  });

  if (ring) {
    tl.to(
      ring,
      {
        scale: 1.72,
        opacity: 0.96,
        duration: 0.18,
        ease: "back.out(2.4)",
      },
      0,
    );
  }

  tl.to(
    button,
    {
      scale: 1.18,
      duration: 0.16,
      ease: "back.out(2)",
    },
    0,
  );

  if (dot) {
    tl.to(
      dot,
      {
        scale: 2.35,
        duration: 0.14,
        ease: "back.out(2.8)",
      },
      0,
    );
  }

  if (shotMap) {
    tl.fromTo(
      shotMap,
      { filter: "brightness(1)" },
      {
        filter: "brightness(1.65)",
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      },
      0,
    );
  }

  if (ring) {
    tl.to(
      ring,
      {
        scale: 1.08,
        opacity: 1,
        duration: 0.2,
        ease: "elastic.out(1, 0.48)",
      },
      ">",
    );
  }

  if (dot) {
    tl.to(
      dot,
      {
        scale: 1.2,
        duration: 0.18,
        ease: "elastic.out(1, 0.45)",
      },
      "<",
    );
  }

  tl.to(
    button,
    {
      scale: 1,
      duration: 0.16,
      ease: "power2.out",
    },
    "<",
  );
}

function clearPickedShotTargets() {
  shotTargets.forEach((target) => {
    const ring = target.querySelector(".shot-target-ring");
    const dot = target.querySelector(".shot-target-dot");
    target.classList.remove("is-picked");
    if (gsapApi) {
      gsapApi.killTweensOf([target, ring, dot]);
      gsapApi.set(target, { clearProps: "scale" });
      if (ring) {
        gsapApi.set(ring, { clearProps: "scale,opacity" });
      }
      if (dot) {
        gsapApi.set(dot, { clearProps: "scale" });
      }
    }
  });
}

function markPickedShotZone(zone) {
  const target = shotTargets.find((button) => normalizeMatchZone(button.dataset.zone || "") === normalizeMatchZone(zone));
  if (target) {
    target.classList.add("is-picked");
  }
}

function restoreSubmittedChoice(choice) {
  if (!choice) {
    return;
  }

  if (choice.shot) {
    markPickedShotZone(choice.shot);
    aimTarget.classList.add("is-choice-locked");
  }
  if (choice.keeper) {
    markPickedShotZone(choice.keeper);
    keeper.classList.add("is-choice-locked");
  }
}

function animateKeeperChoice() {
  if (!keeper) {
    return;
  }

  keeper.classList.add("is-choice-locked");
  if (!gsapApi) {
    return;
  }

  gsapApi.killTweensOf(keeper);
  gsapApi.fromTo(
    keeper,
    { scale: 1, filter: "drop-shadow(0 0 0 rgba(105, 240, 177, 0))" },
    {
      scale: 1.16,
      filter: "drop-shadow(0 0 24px rgba(105, 240, 177, 0.95))",
      duration: 0.16,
      yoyo: true,
      repeat: 3,
      ease: "power2.out",
      onComplete: () => {
        gsapApi.set(keeper, { clearProps: "scale,filter" });
      },
    },
  );
}

function animateAimChoice() {
  if (!aimTarget) {
    return;
  }

  aimTarget.classList.add("is-choice-locked");
  if (!gsapApi) {
    return;
  }

  gsapApi.killTweensOf(aimTarget);
  gsapApi.fromTo(
    aimTarget,
    { scale: 1, filter: "drop-shadow(0 0 0 rgba(255, 212, 99, 0))" },
    {
      scale: 1.24,
      filter: "drop-shadow(0 0 26px rgba(255, 212, 99, 0.98))",
      duration: 0.14,
      yoyo: true,
      repeat: 3,
      ease: "power2.out",
      onComplete: () => {
        gsapApi.set(aimTarget, { clearProps: "scale,filter" });
      },
    },
  );
}

function getActiveKeeper() {
  if (shootoutState.turn === "player-shoot") {
    return opponentKeeper;
  }

  return keeper;
}

function getInactiveKeeper() {
  if (shootoutState.turn === "player-shoot") {
    return keeper;
  }

  return opponentKeeper;
}

function getGoalArea() {
  const goalRect = shotMap ? shotMap.getBoundingClientRect() : goalMouth.getBoundingClientRect();
  const stageRect = gameStage.getBoundingClientRect();

  return {
    left: ((goalRect.left - stageRect.left) / stageRect.width) * gameStage.clientWidth,
    top: ((goalRect.top - stageRect.top) / stageRect.height) * gameStage.clientHeight,
    width: (goalRect.width / stageRect.width) * gameStage.clientWidth,
    height: (goalRect.height / stageRect.height) * gameStage.clientHeight,
  };
}

function getDecorLayout() {
  return isPhoneLayout() ? decorLayouts.phone : decorLayouts.desktop;
}

function syncShotMapLayout() {
  if (!shotMap) {
    return;
  }

  const layout = getDecorLayout();
  const stageRect = gameStage.getBoundingClientRect();
  const scale = Math.max(stageRect.width / layout.width, stageRect.height / layout.height);
  const displayWidth = layout.width * scale;
  const displayHeight = layout.height * scale;
  const offsetX = (stageRect.width - displayWidth) / 2;
  const offsetY = (stageRect.height - displayHeight) / 2;
  const goal = layout.goal;
  const mapShiftX = isPhoneLayout() ? 0 : stageRect.width * 0.05;
  const mapShiftY = isPhoneLayout() ? 0 : stageRect.height * 0.085;

  shotMap.style.left = `${offsetX + goal.x * scale + mapShiftX}px`;
  shotMap.style.top = `${offsetY + goal.y * scale + mapShiftY}px`;
  shotMap.style.width = `${goal.width * scale}px`;
  shotMap.style.height = `${goal.height * scale}px`;
  shotMap.style.opacity = "1";

  shotTargets.forEach((target) => {
    const anchorSet = isPhoneLayout() ? shotTargetAnchors : desktopShotTargetAnchors;
    const anchor = anchorSet[target.dataset.zone] || anchorSet["middle-center"];
    target.style.left = `${anchor.x * 100}%`;
    target.style.top = `${anchor.y * 100}%`;
  });
}

function getKeeperStartPosition() {
  const goalArea = getGoalArea();

  return {
    x: goalArea.left + goalArea.width / 2,
    y: goalArea.top + goalArea.height * 0.84,
  };
}

function placeVisualKeeper(targetKeeper, x, y) {
  targetKeeper.style.bottom = "auto";
  targetKeeper.style.left = `${x}px`;
  targetKeeper.style.top = `${y}px`;
  targetKeeper.style.transform = "translate(-50%, -50%)";
}

function getAimBounds() {
  const stageWidth = gameStage.clientWidth;
  const stageHeight = gameStage.clientHeight;
  const halfWidth = (aimTarget.offsetWidth || 0) / 2;
  const halfHeight = (aimTarget.offsetHeight || 0) / 2;

  return {
    left: halfWidth,
    right: Math.max(halfWidth, stageWidth - halfWidth),
    top: halfHeight,
    bottom: Math.max(halfHeight, stageHeight - halfHeight),
  };
}

function placeAimTarget(x, y) {
  const bounds = getAimBounds();
  const nextX = clamp(x, bounds.left, bounds.right);
  const nextY = clamp(y, bounds.top, bounds.bottom);

  aimState.x = nextX;
  aimState.y = nextY;
  aimTarget.style.left = `${nextX}px`;
  aimTarget.style.top = `${nextY}px`;
}

function syncAimTarget(forceReset = false) {
  const stageConfig = getStageConfig();
  const layoutChanged = aimState.layout !== stageConfig.stageClass;
  aimState.layout = stageConfig.stageClass;

  if (forceReset || layoutChanged || !aimState.x || !aimState.y) {
    placeAimTarget(
      gameStage.clientWidth * stageConfig.aimDefault.x,
      gameStage.clientHeight * stageConfig.aimDefault.y,
    );
    return;
  }

  placeAimTarget(aimState.x, aimState.y);
}

function getKeeperBounds() {
  const goalArea = getGoalArea();
  const keeperWidth = keeper.offsetWidth || 0;
  const keeperHeight = keeper.offsetHeight || 0;

  return {
    left: goalArea.left + keeperWidth * 0.25,
    right: goalArea.left + goalArea.width - keeperWidth * 0.25,
    top: goalArea.top + keeperHeight * 0.35,
    bottom: goalArea.top + goalArea.height + keeperHeight * 0.12,
  };
}

function placeKeeper(x, y) {
  const bounds = getKeeperBounds();
  const nextX = clamp(x, bounds.left, bounds.right);
  const nextY = clamp(y, bounds.top, bounds.bottom);

  keeperPlacementState.x = nextX;
  keeperPlacementState.y = nextY;
  placeVisualKeeper(keeper, nextX, nextY);
}

function syncKeeperPosition(forceReset = false) {
  const layout = gameStage.classList.contains("is-phone") ? "is-phone" : "is-desktop";
  const layoutChanged = keeperPlacementState.layout !== layout;
  keeperPlacementState.layout = layout;

  if (forceReset || layoutChanged || !keeperPlacementState.x || !keeperPlacementState.y) {
    const start = getKeeperStartPosition();
    placeKeeper(start.x, start.y);
    return;
  }

  placeKeeper(keeperPlacementState.x, keeperPlacementState.y);
}

function syncOpponentKeeperPosition() {
  if (!opponentKeeper) {
    return;
  }

  const start = getKeeperStartPosition();
  opponentKeeper.style.width = keeper.style.width || window.getComputedStyle(keeper).width;
  placeVisualKeeper(opponentKeeper, start.x, start.y);
}

function resetKeepersToGoalCenter() {
  clearPickedShotTargets();
  aimTarget.classList.remove("is-choice-locked");
  keeper.classList.remove("is-choice-locked");
  const start = getKeeperStartPosition();
  keeperPlacementState.zone = "center";
  placeKeeper(start.x, start.y);
  if (!opponentKeeper) {
    return;
  }

  opponentKeeper.style.width = keeper.style.width || window.getComputedStyle(keeper).width;
  placeVisualKeeper(opponentKeeper, start.x, start.y);
}

function resizeGame() {
  const stageConfig = getStageConfig();
  gameStage.style.width = `${stageConfig.width}px`;
  gameStage.style.height = `${stageConfig.height}px`;
  gameStage.classList.remove("is-phone", "is-desktop");
  gameStage.classList.add(stageConfig.stageClass);
  gameStage.style.transform = "none";

  syncDecorForTurn(false);
  syncShotMapLayout();
  syncAimTarget();
  resetKeepersToGoalCenter();
}

function setStatus(message) {
  statusText.textContent = message;

  if (statusHideTimeout) {
    window.clearTimeout(statusHideTimeout);
    statusHideTimeout = null;
  }

  if (!gsapApi) {
    statusText.style.opacity = "1";
    statusText.style.transform = "translateX(-50%) translateY(0)";
    statusHideTimeout = window.setTimeout(() => {
      statusText.style.opacity = "0";
      statusText.style.transform = "translateX(-50%) translateY(-8px)";
    }, 3000);
    return;
  }

  gsapApi.killTweensOf(statusText);
  gsapApi.set(statusText, {
    opacity: 0,
    y: -8,
  });
  gsapApi.to(statusText, {
    opacity: 1,
    y: 0,
    duration: 0.22,
    ease: "power2.out",
  });

  statusHideTimeout = window.setTimeout(() => {
    gsapApi.to(statusText, {
      opacity: 0,
      y: -8,
      duration: 0.22,
      ease: "power2.in",
    });
  }, 3000);
}

function setOpponentName(name) {
  const cleanName = String(name || "").trim() || DEFAULT_OPPONENT_NAME;
  matchContext.opponentName = cleanName;
  if (opponentNameLabel) {
    opponentNameLabel.textContent = cleanName;
  }
}

function formatGameCoins(value) {
  return String(Math.floor(Number(value || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function refreshGameCoinBalance() {
  if (!gameCoinBalance || !matchContext.playerUid) {
    return;
  }

  try {
    const profile = await loadUserProfile(matchContext.playerUid);
    gameCoinBalance.textContent = formatGameCoins(profile?.coins || 0);
  } catch (_) {
    gameCoinBalance.textContent = "0";
  }
}

function setLocalTurnDeadline(resolveAt = 0) {
  localTurnResolveAt = Number(resolveAt || 0);
}

function syncBotTurnStatus() {
  if (shootoutState.gameOver) {
    stopTurnCountdown();
    setStatus(shootoutState.playerGoals > shootoutState.cpuGoals ? "Victoire." : "Defaite.");
    return;
  }

  setStatus(
    shootoutState.turn === "player-shoot"
      ? "A toi de tirer. Ou gen 15 segond."
      : `${matchContext.opponentName} tire. Choisis la plongee. Ou gen 15 segond.`,
  );
  startTurnCountdown(localTurnResolveAt || (Date.now() + 15000));
}

function clearBotReactionTimeout() {
  if (botReactionTimeout) {
    window.clearTimeout(botReactionTimeout);
    botReactionTimeout = null;
  }
}

function initializeBotMatchState() {
  setLocalTurnDeadline(Date.now() + 15000);
  syncDecorForTurn(false);
  resetKeepersToGoalCenter();
  updateRoundNumber();
  updateScoreboard();
  updateControls();
  syncBotTurnStatus();
  publishShootoutState("hydrate");
}

async function hydrateMatchContext() {
  if (!isGamePage) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const inviteCode = String(params.get("invite") || params.get("code") || "").trim().toUpperCase();
  if (!inviteCode) {
    setOpponentName(DEFAULT_OPPONENT_NAME);
    return;
  }

  matchContext.code = inviteCode;

  try {
    await initFirebaseClient();
    const [room, user] = await Promise.all([
      loadMatchRoom(inviteCode),
      getCurrentUser().catch(() => null),
    ]);

    if (!room) {
      setOpponentName(DEFAULT_OPPONENT_NAME);
      setStatus("Salle introuvable, match local contre adversaire.");
      return;
    }

    if (room.isBot) {
      const isHostPlayer = Boolean(user?.uid && room.hostUid === user.uid);
      setOpponentName(room.hostUsername || DEFAULT_OPPONENT_NAME);
      matchContext.isBot = true;
      matchContext.role = isHostPlayer ? "host" : "guest";
      matchContext.playerUid = user?.uid || "";
      refreshGameCoinBalance();
      setStatus(`Match contre ${room.hostUsername || DEFAULT_OPPONENT_NAME}.`);
      await startMatchRoomSync();
      await markCurrentPlayerInGame();
      if (!room.gameState) {
        initializeBotMatchState();
      }
      return;
    }

    if (user?.uid && room.hostUid === user.uid) {
      setOpponentName(room.guestUsername || "Adversaire");
      matchContext.playerUid = user.uid;
      matchContext.role = "host";
      refreshGameCoinBalance();
      matchContext.isMultiplayer = Boolean(room.guestUid);
      matchContext.opponentInGame = Boolean(room.gamePresence?.guest);
      shootoutState.actionLocked = true;
      updateControls();
      setStatus(matchContext.opponentInGame ? `${room.guestUsername || "Adversaire"} est entre. Tu peux commencer.` : "Nap tann adversaire la antre nan match la.");
      await startMatchRoomSync();
      await markCurrentPlayerInGame();
      return;
    }

    if (user?.uid && room.guestUid === user.uid) {
      setOpponentName(room.hostUsername || "Adversaire");
      matchContext.playerUid = user.uid;
      matchContext.role = "guest";
      refreshGameCoinBalance();
      matchContext.isMultiplayer = true;
      matchContext.opponentInGame = Boolean(room.gamePresence?.host);
      shootoutState.actionLocked = true;
      updateControls();
      setStatus(matchContext.opponentInGame ? `Match contre ${room.hostUsername || "Adversaire"}.` : "Nap tann adversaire la antre nan match la.");
      await startMatchRoomSync();
      await markCurrentPlayerInGame();
      return;
    }

    setOpponentName(room.guestUsername || room.hostUsername || "Adversaire");
    await startMatchRoomSync();
  } catch (_) {
    setOpponentName(DEFAULT_OPPONENT_NAME);
  }
}

function getShootoutSyncState(reason = "update") {
  return {
    playerGoals: shootoutState.playerGoals,
    cpuGoals: shootoutState.cpuGoals,
    playerShots: [...shootoutState.playerShots],
    cpuShots: [...shootoutState.cpuShots],
    turn: shootoutState.turn,
    roundNumber: shootoutState.roundNumber,
    gameOver: shootoutState.gameOver,
    resolveAt: Number(localTurnResolveAt || (Date.now() + 15000)),
    reason,
    updatedBy: matchContext.playerUid || "local",
  };
}

function getSyncSignature(state) {
  return JSON.stringify({
    playerGoals: state?.playerGoals || 0,
    cpuGoals: state?.cpuGoals || 0,
    playerShots: state?.playerShots || [],
    cpuShots: state?.cpuShots || [],
    turn: state?.turn || "player-shoot",
    gameOver: Boolean(state?.gameOver),
    updatedBy: state?.updatedBy || "",
  });
}

function applyRemoteShootoutState(state) {
  if (!state || (state.updatedBy === matchContext.playerUid && !matchContext.isBot)) {
    return;
  }

  const signature = getSyncSignature(state);
  if (signature === lastSyncedStateSignature) {
    return;
  }

  applyingRemoteState = true;
  lastSyncedStateSignature = signature;
  shootoutState.playerGoals = Number(state.playerGoals || 0);
  shootoutState.cpuGoals = Number(state.cpuGoals || 0);
  shootoutState.playerShots = Array.isArray(state.playerShots) ? [...state.playerShots] : [];
  shootoutState.cpuShots = Array.isArray(state.cpuShots) ? [...state.cpuShots] : [];
  shootoutState.turn = state.turn === "cpu-shoot" ? "cpu-shoot" : "player-shoot";
  shootoutState.roundNumber = Number(state.roundNumber || 1);
  shootoutState.gameOver = Boolean(state.gameOver);
  setLocalTurnDeadline(Number(state.resolveAt || 0));
  shootoutState.actionLocked = false;
  updateRoundNumber();
  syncDecorForTurn(false);
  resetKeepersToGoalCenter();
  updateScoreboard();
  updateControls();
  if (shootoutState.gameOver) {
    stopTurnCountdown();
    setStatus(shootoutState.playerGoals > shootoutState.cpuGoals ? "Victoire." : "Defaite.");
  } else if (matchContext.isBot) {
    syncBotTurnStatus();
  } else {
    stopTurnCountdown();
    setStatus(shootoutState.turn === "player-shoot" ? "A toi de tirer." : `${matchContext.opponentName} tire. Choisis la plongee.`);
  }
  applyingRemoteState = false;
}

async function publishShootoutState(reason = "update") {
  if (!matchContext.code || matchContext.isMultiplayer || applyingRemoteState) {
    return;
  }

  const state = getShootoutSyncState(reason);
  lastSyncedStateSignature = getSyncSignature(state);
  try {
    await updateMatchRoomGameState({ code: matchContext.code, state });
  } catch (_) {
    setStatus("Connexion match instable. Le jeu continue localement.");
  }
}

async function startMatchRoomSync() {
  if (!matchContext.code || matchRoomUnsubscribe) {
    return;
  }

  matchRoomUnsubscribe = await listenMatchRoom(matchContext.code, (room) => {
    if (!room) {
      return;
    }

    if (room.isBot && room.hostUsername) {
      setOpponentName(room.hostUsername);
    } else if (matchContext.role === "host" && room.guestUsername) {
      setOpponentName(room.guestUsername);
    } else if (matchContext.role === "guest" && room.hostUsername) {
      setOpponentName(room.hostUsername);
    }

    if (!room.isBot && (matchContext.role === "host" || matchContext.role === "guest")) {
      matchContext.isMultiplayer = Boolean(room.hostUid && room.guestUid);
      const opponentRole = matchContext.role === "host" ? "guest" : "host";
      matchContext.opponentInGame = Boolean(room.gamePresence?.[opponentRole]);
      if (!matchContext.isMultiplayer || !matchContext.opponentInGame || !room.gamePresence?.host || !room.gamePresence?.guest) {
        stopTurnCountdown();
        shootoutState.actionLocked = true;
        updateControls();
        setStatus("Nap tann adversaire la antre nan match la.");
        return;
      }
    }

    if (matchContext.isMultiplayer) {
      const bothPlayersInGame = Boolean(room.gamePresence?.host && room.gamePresence?.guest);
      const opponentRole = matchContext.role === "host" ? "guest" : "host";
      matchContext.opponentInGame = Boolean(room.gamePresence?.[opponentRole]);
      handleRoomRematch(room.rematch);
      if (!bothPlayersInGame) {
        stopTurnCountdown();
        shootoutState.actionLocked = true;
        updateControls();
        setStatus("Nap tann dezyem jwè a antre nan match la.");
        return;
      }

      applyMultiplayerRoomState(room.gameState);
      return;
    }

    applyRemoteShootoutState(room.gameState);
  });
}

async function markCurrentPlayerInGame() {
  if (!matchContext.code || !matchContext.role || matchContext.role === "local") {
    return;
  }

  try {
    await markMatchParticipantInGame({
      code: matchContext.code,
      role: matchContext.role,
      userUid: matchContext.playerUid,
    });
    refreshGameCoinBalance();
  } catch (error) {
    if ((error?.message || error?.code) === "insufficient-coins") {
      shootoutState.actionLocked = true;
      updateControls();
      setStatus("Ou pa gen ase coins pou antre nan match sa.");
      return;
    }
    setStatus("Connexion match instable. Nap tann senkronizasyon an.");
  }
}

function openMatchResultModal({ title, kicker = "Match fini", message, mode = "result", rematchId = "" }) {
  if (!matchResultModal) {
    return;
  }

  matchContext.activeRematchId = rematchId || "";
  if (matchResultKicker) {
    matchResultKicker.textContent = kicker;
  }
  if (matchResultTitle) {
    matchResultTitle.textContent = title;
  }
  if (matchResultMessage) {
    matchResultMessage.textContent = message;
  }
  if (requestRematchButton) {
    requestRematchButton.hidden = mode !== "result" || (!matchContext.isMultiplayer && !matchContext.isBot);
  }
  if (acceptRematchButton) {
    acceptRematchButton.hidden = mode !== "request";
  }

  matchResultModal.hidden = false;
  matchResultModal.classList.add("is-open");
  matchResultModal.setAttribute("aria-hidden", "false");
}

function closeMatchResultModal() {
  if (!matchResultModal) {
    return;
  }

  matchResultModal.classList.remove("is-open");
  matchResultModal.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!matchResultModal.classList.contains("is-open")) {
      matchResultModal.hidden = true;
    }
  }, 180);
}

function showGameOverModal(turnId = 0, state = null) {
  if (turnId && resultModalShownForTurnId === turnId) {
    return;
  }

  resultModalShownForTurnId = turnId || resultModalShownForTurnId || Date.now();
  const didWin = shootoutState.playerGoals > shootoutState.cpuGoals;
  const wagerCoins = Math.max(0, Math.floor(Number(state?.wagerCoins || 0)));
  const systemFeeCoins = Math.max(0, Math.floor(Number(state?.systemFeeCoins || 5)));
  const payoutCoins = Math.max(0, Math.floor(Number(state?.payoutCoins || (wagerCoins ? wagerCoins * 2 - systemFeeCoins : 0))));
  const message = wagerCoins
    ? didWin
      ? `Ou fek genyen ${wagerCoins} coins plis sa ou te mize a ki fe ${wagerCoins * 2} coins, mwens fre systeme ${systemFeeCoins} coins. Ou resevwa ${payoutCoins} coins.`
      : `Ou pedi ${wagerCoins} coins.`
    : (matchContext.isMultiplayer || matchContext.isBot) ? "Ou ka mande yon revanche." : "Match la fini.";
  openMatchResultModal({
    title: didWin ? "Ou genyen" : "Ou pedi",
    message,
    mode: "result",
  });
}

function settleFinishedLocalMatch(didWin) {
  if (!matchContext.code || !matchContext.playerUid || matchContext.isMultiplayer) {
    showGameOverModal();
    return;
  }

  settleMatchWagerForPlayer({
    code: matchContext.code,
    userUid: matchContext.playerUid,
    role: matchContext.role,
    didWin,
  })
    .then((settlement) => {
      refreshGameCoinBalance();
      showGameOverModal(0, settlement);
    })
    .catch(() => {
      showGameOverModal();
    });
}

function resetLocalMatchForRematch() {
  stopTurnCountdown();
  clearBotReactionTimeout();
  clearPickedShotTargets();
  aimTarget.classList.remove("is-choice-locked");
  keeper.classList.remove("is-choice-locked");
  shootoutState.playerGoals = 0;
  shootoutState.cpuGoals = 0;
  shootoutState.playerShots = [];
  shootoutState.cpuShots = [];
  shootoutState.turn = "player-shoot";
  shootoutState.roundNumber = 1;
  shootoutState.gameOver = false;
  shootoutState.actionLocked = false;
  setLocalTurnDeadline(Date.now() + 15000);
  lastAnimatedTurnId = 0;
  resultModalShownForTurnId = 0;
  syncDecorForTurn(false);
  updateScoreboard();
  updateControls();
  resetKeepersToGoalCenter();
  resetBall(true);
  if (matchContext.isBot) {
    syncBotTurnStatus();
  }
}

async function handleRequestRematch() {
  if (matchContext.isBot) {
    resetLocalMatchForRematch();
    closeMatchResultModal();
    setStatus("Revanche lanse. Nou rekomanse.");
    publishShootoutState("rematch");
    return;
  }

  if (!matchContext.code || !matchContext.isMultiplayer) {
    return;
  }

  try {
    await requestMatchRematch({
      code: matchContext.code,
      role: matchContext.role,
    });
    openMatchResultModal({
      title: "Revanche voye",
      message: `Nap tann ${matchContext.opponentName} aksepte.`,
      mode: "waiting",
    });
  } catch (error) {
    const message = error?.message === "opponent-left"
      ? "Jwe a gentan ale."
      : "Demann revanche la pa pase. Eseye anko.";
    openMatchResultModal({
      title: "Revanche pa disponib",
      message,
      mode: "waiting",
    });
  }
}

async function handleAcceptRematch() {
  if (!matchContext.code || !matchContext.activeRematchId) {
    return;
  }

  try {
    await acceptMatchRematch({
      code: matchContext.code,
      role: matchContext.role,
      rematchId: matchContext.activeRematchId,
    });
    closeMatchResultModal();
  } catch (_) {
    openMatchResultModal({
      title: "Revanche pa pase",
      message: "Demann nan pa disponib anko.",
      mode: "waiting",
    });
  }
}

function markCurrentPlayerLeft() {
  if (!matchContext.code || !matchContext.isMultiplayer || !matchContext.role || matchContext.role === "local") {
    return;
  }

  markMatchParticipantLeft({
    code: matchContext.code,
    role: matchContext.role,
  }).catch(() => {});
}

function handleRoomRematch(rematch) {
  if (!rematch?.id || !matchContext.isMultiplayer) {
    return;
  }

  if (rematch.status === "pending" && rematch.fromRole !== matchContext.role) {
    openMatchResultModal({
      title: "Revanche?",
      kicker: "Demann revanche",
      message: `${matchContext.opponentName} mande yon revanche.`,
      mode: "request",
      rematchId: rematch.id,
    });
    return;
  }

  if (rematch.status === "accepted") {
    if (matchContext.handledRematchId === rematch.id) {
      return;
    }

    matchContext.handledRematchId = rematch.id;
    closeMatchResultModal();
    resetLocalMatchForRematch();
    setStatus("Revanche aksepte. Nou rekomanse.");
  }
}

function getInitialMultiplayerState() {
  return {
    phase: "waiting",
    turnId: 1,
    shooterRole: "host",
    hostGoals: 0,
    guestGoals: 0,
    hostShots: [],
    guestShots: [],
    choices: { host: {}, guest: {} },
    resolveAt: 0,
    gameOver: false,
  };
}

function getLocalTurnFromShooter(shooterRole) {
  return shooterRole === matchContext.role ? "player-shoot" : "cpu-shoot";
}

function applyCanonicalScore(state) {
  const hostGoals = Number(state?.hostGoals || 0);
  const guestGoals = Number(state?.guestGoals || 0);
  const hostShots = Array.isArray(state?.hostShots) ? [...state.hostShots] : [];
  const guestShots = Array.isArray(state?.guestShots) ? [...state.guestShots] : [];

  if (matchContext.role === "guest") {
    shootoutState.playerGoals = guestGoals;
    shootoutState.cpuGoals = hostGoals;
    shootoutState.playerShots = guestShots;
    shootoutState.cpuShots = hostShots;
  } else {
    shootoutState.playerGoals = hostGoals;
    shootoutState.cpuGoals = guestGoals;
    shootoutState.playerShots = hostShots;
    shootoutState.cpuShots = guestShots;
  }

  shootoutState.gameOver = Boolean(state?.gameOver);
  updateRoundNumber();
  updateScoreboard();
}

function scheduleMultiplayerResolve(state) {
  if (!matchContext.isMultiplayer || state?.phase !== "collecting") {
    return;
  }

  if (matchResolveTimer) {
    window.clearTimeout(matchResolveTimer);
  }

  const shooterRole = state.shooterRole === "guest" ? "guest" : "host";
  const defenderRole = shooterRole === "host" ? "guest" : "host";
  const shooterReady = Boolean(state.choices?.[shooterRole]?.shot);
  const defenderReady = Boolean(state.choices?.[defenderRole]?.keeper);
  const delay = shooterReady && defenderReady ? 250 : Math.max(0, Number(state.resolveAt || Date.now()) - Date.now());

  matchResolveTimer = window.setTimeout(() => {
    resolveMatchTurn({ code: matchContext.code }).catch(() => {});
  }, delay);
}

function stopTurnCountdown() {
  if (countdownAnimationFrame) {
    window.cancelAnimationFrame(countdownAnimationFrame);
    countdownAnimationFrame = null;
  }
  if (turnCountdown) {
    turnCountdown.hidden = true;
    turnCountdown.classList.remove("is-urgent");
    turnCountdown.style.setProperty("--countdown-progress", "1");
  }
}

function startTurnCountdown(resolveAt) {
  if (!turnCountdown || !turnCountdownValue) {
    return;
  }

  if (countdownAnimationFrame) {
    window.cancelAnimationFrame(countdownAnimationFrame);
  }

  const endAt = Number(resolveAt || Date.now() + 15000);
  const totalMs = Math.max(1000, endAt - Date.now());
  let lastSecond = null;
  turnCountdown.hidden = false;

  const tick = () => {
    const remainingMs = Math.max(0, endAt - Date.now());
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
    turnCountdownValue.textContent = String(seconds);
    turnCountdown.style.setProperty("--countdown-progress", progress.toFixed(3));
    turnCountdown.classList.toggle("is-urgent", seconds <= 2);

    if (gsapApi && seconds !== lastSecond) {
      lastSecond = seconds;
      gsapApi.to(turnCountdown, {
        scale: seconds <= 2 ? 1.08 : 1,
        duration: 0.16,
        yoyo: true,
        repeat: 1,
        overwrite: "auto",
        ease: "power2.out",
      });
    }

    if (remainingMs > 0) {
      countdownAnimationFrame = window.requestAnimationFrame(tick);
      return;
    }

    stopTurnCountdown();
  };

  tick();
}

function applyMultiplayerRoomState(state) {
  const safeState = state?.phase ? state : getInitialMultiplayerState();
  if (safeState.phase !== "collecting" && safeState.phase !== "resolved") {
    stopTurnCountdown();
    shootoutState.actionLocked = true;
    updateControls();
    setStatus("Nap tann de jwe yo antre nan match la.");
    return;
  }

  if (safeState.phase === "resolved") {
    stopTurnCountdown();
    animateResolvedMultiplayerTurn(safeState);
    return;
  }

  applyCanonicalScore(safeState);
  const shooterRole = safeState.shooterRole === "guest" ? "guest" : "host";
  const myChoice = safeState.choices?.[matchContext.role] || {};
  shootoutState.turn = getLocalTurnFromShooter(shooterRole);
  shootoutState.actionLocked = shootoutState.turn === "player-shoot" ? Boolean(myChoice.shot) : Boolean(myChoice.keeper);
  syncDecorForTurn(false);
  resetKeepersToGoalCenter();
  restoreSubmittedChoice(myChoice);
  updateControls();

  if (shootoutState.turn === "player-shoot") {
    setStatus(myChoice.shot ? "Tir chwazi. Nap tann lot jwe a." : "Chwazi kote ou vle tire. Ou gen 15 segond.");
  } else {
    setStatus(myChoice.keeper ? "Arret chwazi. Nap tann lot jwe a." : `${matchContext.opponentName} ap tire. Chwazi kote gardien an plonje. Ou gen 15 segond.`);
  }

  scheduleMultiplayerResolve(safeState);
  startTurnCountdown(safeState.resolveAt);
}

function getStateBeforeResolvedTurn(state) {
  const previousState = {
    ...state,
    hostGoals: Number(state.hostGoals || 0),
    guestGoals: Number(state.guestGoals || 0),
    hostShots: Array.isArray(state.hostShots) ? [...state.hostShots] : [],
    guestShots: Array.isArray(state.guestShots) ? [...state.guestShots] : [],
    gameOver: false,
  };

  const shooterRole = state.shooterRole === "guest" ? "guest" : "host";
  const shotResult = state.shotResult || "save";
  if (shooterRole === "host") {
    previousState.hostShots.pop();
    if (shotResult === "goal") {
      previousState.hostGoals = Math.max(0, previousState.hostGoals - 1);
    }
  } else {
    previousState.guestShots.pop();
    if (shotResult === "goal") {
      previousState.guestGoals = Math.max(0, previousState.guestGoals - 1);
    }
  }

  return previousState;
}

function animateResolvedMultiplayerTurn(state) {
  const turnId = Number(state.turnId || 1);
  if (!turnId || lastAnimatedTurnId === turnId) {
    return;
  }

  lastAnimatedTurnId = turnId;
  applyingRemoteState = true;
  clearPickedShotTargets();
  aimTarget.classList.remove("is-choice-locked");
  keeper.classList.remove("is-choice-locked");
  const shooterRole = state.shooterRole === "guest" ? "guest" : "host";
  applyCanonicalScore(getStateBeforeResolvedTurn(state));
  shootoutState.turn = getLocalTurnFromShooter(shooterRole);
  shootoutState.actionLocked = false;
  updateControls();

  if (shootoutState.turn === "player-shoot") {
    launchPlayerShot(state.shotZone || "center", state.keeperZone || "center");
  } else {
    launchCpuShot(state.keeperZone || "center", state.shotZone || "center");
  }

  window.setTimeout(() => {
    applyingRemoteState = false;
    if (state.gameOver) {
      applyCanonicalScore(state);
      updateControls();
      refreshGameCoinBalance();
      showGameOverModal(turnId, state);
    }
    advanceResolvedMultiplayerTurn(state);
  }, 1700);
}

async function advanceResolvedMultiplayerTurn(state) {
  if (advancingTurn || state.gameOver || matchContext.role !== "host") {
    return;
  }

  advancingTurn = true;
  try {
    await advanceMatchTurn({
      code: matchContext.code,
      nextState: {
        turnId: Number(state.turnId || 1) + 1,
        shooterRole: state.nextShooterRole === "guest" ? "guest" : "host",
        hostGoals: Number(state.hostGoals || 0),
        guestGoals: Number(state.guestGoals || 0),
        hostShots: Array.isArray(state.hostShots) ? [...state.hostShots] : [],
        guestShots: Array.isArray(state.guestShots) ? [...state.guestShots] : [],
        gameOver: Boolean(state.gameOver),
      },
    });
  } catch (_) {
    setStatus("Connexion match instable. Nap reessayer.");
  } finally {
    advancingTurn = false;
  }
}

async function submitMultiplayerChoice(choiceType, zone) {
  if (!matchContext.isMultiplayer || shootoutState.gameOver || shootoutState.actionLocked) {
    return false;
  }

  shootoutState.actionLocked = true;
  updateControls();
  setStatus("Chwa ou voye. Nap tann lot jwè a.");
  try {
    await submitMatchTurnChoice({
      code: matchContext.code,
      role: matchContext.role,
      choiceType,
      zone,
    });
  } catch (_) {
    shootoutState.actionLocked = false;
    updateControls();
    setStatus("Chwa a pa pase. Eseye anko.");
  }
  return true;
}

function updateTrack(dots, history) {
  dots.forEach((dot, index) => {
    dot.classList.remove("is-goal", "is-save");
    const shot = history[index];
    if (shot === "goal") {
      dot.classList.add("is-goal");
    }
    if (shot === "save") {
      dot.classList.add("is-save");
    }
  });
}

function updateScoreboard() {
  playerScore.textContent = String(shootoutState.playerGoals);
  cpuScore.textContent = String(shootoutState.cpuGoals);
  playerScoreMain.textContent = String(shootoutState.playerGoals);
  cpuScoreMain.textContent = String(shootoutState.cpuGoals);

  updateTrack(playerTrackDots, shootoutState.playerShots);
  updateTrack(cpuTrackDots, shootoutState.cpuShots);

  const totalShots = shootoutState.playerShots.length + shootoutState.cpuShots.length;
  roundLabel.textContent = `Tir ${Math.floor(totalShots / 2) + 1}`;
  turnLabel.textContent = shootoutState.turn === "player-shoot" ? "Ton tir" : `Arret vs ${matchContext.opponentName}`;
}

function isWaitingForMatchOpponent() {
  return Boolean(
    matchContext.code
      && !matchContext.isBot
      && (matchContext.role === "host" || matchContext.role === "guest")
      && !matchContext.opponentInGame,
  );
}

function updateControls() {
  const waitingForOpponent = isWaitingForMatchOpponent();
  const canPlaceKeeper = shootoutState.turn === "cpu-shoot" && !shootoutState.gameOver && !shootoutState.actionLocked && !waitingForOpponent;
  keeper.classList.toggle("is-editable", canPlaceKeeper);
  if (shotMap) {
    shotMap.classList.toggle("is-hidden", uiState.phase !== "game" || shootoutState.gameOver || waitingForOpponent);
    shotMap.classList.toggle("is-keeper-turn", canPlaceKeeper);
  }
  aimTarget.hidden = true;
  syncKeeperVisibility();
}

function syncKeeperVisibility() {
  if (!keeper) {
    return;
  }

  if (uiState.phase !== "game") {
    keeper.classList.remove("is-hidden");
    if (!gsapApi) {
      keeper.style.opacity = "1";
      return;
    }

    gsapApi.killTweensOf(keeper);
    gsapApi.to(keeper, {
      opacity: 1,
      duration: 0.22,
      ease: "power2.out",
    });
    return;
  }

  keeper.classList.add("is-hidden");

  if (!gsapApi) {
    keeper.style.opacity = "0";
    return;
  }

  gsapApi.killTweensOf(keeper);
  gsapApi.to(keeper, {
    opacity: 0,
    duration: 0.22,
    ease: "power2.out",
  });
}

function getAimCenter() {
  const rect = aimTarget.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function inferPlayerShotZone() {
  const goalArea = getGoalArea();
  const normalizedX = (aimState.x - goalArea.left) / goalArea.width;
  const normalizedY = (aimState.y - goalArea.top) / goalArea.height;

  if (normalizedY <= 0.38) {
    if (normalizedX < 0.4) {
      return "top-left";
    }
    if (normalizedX > 0.6) {
      return "top-right";
    }
    return "center";
  }

  if (normalizedX < 0.46) {
    return "left";
  }

  if (normalizedX > 0.54) {
    return "right";
  }

  return "center";
}

function normalizeMatchZone(zone) {
  if (zone === "left") {
    return "bottom-left";
  }
  if (zone === "right") {
    return "bottom-right";
  }
  if (zone === "center") {
    return "middle-center";
  }
  return zone || "middle-center";
}

function inferKeeperZoneFromPlacement() {
  const goalArea = getGoalArea();
  const normalizedX = (keeperPlacementState.x - goalArea.left) / Math.max(1, goalArea.width);
  const normalizedY = (keeperPlacementState.y - goalArea.top) / Math.max(1, goalArea.height);

  if (normalizedY <= 0.36) {
    if (normalizedX < 0.36) {
      return "top-left";
    }
    if (normalizedX > 0.64) {
      return "top-right";
    }
    return "center";
  }

  if (normalizedX < 0.46) {
    return "left";
  }

  if (normalizedX > 0.54) {
    return "right";
  }

  return "center";
}

function getZonePoint(zoneKey) {
  const target = shotTargets.find((button) => button.dataset.zone === zoneKey);
  if (target) {
    const mapRect = shotMap.getBoundingClientRect();
    const stageRect = gameStage.getBoundingClientRect();
    const xPercent = parseFloat(target.style.left || "50") / 100;
    const yPercent = parseFloat(target.style.top || "50") / 100;
    const viewportX = mapRect.left + mapRect.width * xPercent;
    const viewportY = mapRect.top + mapRect.height * yPercent;

    return {
      x: ((viewportX - stageRect.left) / stageRect.width) * gameStage.clientWidth,
      y: ((viewportY - stageRect.top) / stageRect.height) * gameStage.clientHeight,
      viewportX,
      viewportY,
    };
  }

  const anchor = zoneAnchors[zoneKey] || zoneAnchors.center;
  const goalArea = getGoalArea();

  return {
    x: goalArea.left + goalArea.width * anchor.x,
    y: goalArea.top + goalArea.height * anchor.y,
  };
}

function getPlayableShotZones() {
  const zones = shotTargets
    .map((target) => target.dataset.zone)
    .filter(Boolean);

  return zones.length ? zones : Object.keys(shotTargetAnchors);
}

function getKeeperDivePoint(zoneKey) {
  const anchor = keeperDiveAnchors[zoneKey] || keeperDiveAnchors.center;
  const goalArea = getGoalArea();

  return {
    x: goalArea.left + goalArea.width * anchor.x,
    y: goalArea.top + goalArea.height * anchor.y,
  };
}

function resetBall(animated = true) {
  if (!ballWrapper) {
    if (animated && gsapApi) {
      gsapApi.to(ball, {
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        duration: 0.55,
        ease: "power3.out",
        clearProps: "transform",
      });
    } else {
      ball.style.transform = "";
    }
    return;
  }

  const homePoint = getBallHomePoint();

  if (animated && gsapApi) {
    gsapApi.killTweensOf([ballWrapper, ball]);
    gsapApi.to(ballWrapper, {
      left: `${homePoint.x}px`,
      top: `${homePoint.y}px`,
      bottom: "auto",
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      duration: 0.55,
      ease: "power3.out",
      onComplete: () => {
        gsapApi.set(ballWrapper, { clearProps: "left,top,bottom,xPercent,yPercent,scale,transform" });
      },
    });
    gsapApi.to(ball, {
      rotate: 0,
      duration: 0.55,
      ease: "power3.out",
      clearProps: "transform",
    });
  } else {
    ballWrapper.style.left = "";
    ballWrapper.style.top = "";
    ballWrapper.style.bottom = "";
    ballWrapper.style.transform = "";
    ball.style.transform = "";
  }
}

function animateKeeperDive(zoneKey) {
  if (!gsapApi) {
    return;
  }

  const activeKeeper = getActiveKeeper();
  if (!activeKeeper) {
    return;
  }

  const target = keeperTargets[zoneKey];
  const targetPoint = getKeeperDivePoint(zoneKey);
  const startX = parseFloat(activeKeeper.style.left) || getKeeperStartPosition().x;
  const startY = parseFloat(activeKeeper.style.top) || getKeeperStartPosition().y;
  gsapApi.killTweensOf(activeKeeper);
  gsapApi.set(activeKeeper, {
    left: `${startX}px`,
    top: `${startY}px`,
    xPercent: -50,
    yPercent: -50,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    transformOrigin: "center bottom",
  });
  gsapApi.timeline()
    .to(activeKeeper, {
      left: `${targetPoint.x}px`,
      top: `${targetPoint.y}px`,
      rotation: target.rotation,
      scaleX: target.scaleX,
      duration: 0.34,
      ease: "power3.out"
    })
    .to(activeKeeper, {
      left: `${startX}px`,
      top: `${startY}px`,
      rotation: 0,
      scaleX: 1,
      duration: 0.4,
      ease: "power2.inOut",
      delay: 0.16,
    });
}

function getBallHomePoint() {
  const wrapperRect = ballWrapper.getBoundingClientRect();
  const stageRect = gameStage.getBoundingClientRect();
  const bottom = parseFloat(window.getComputedStyle(ballWrapper).bottom) || 0;

  return {
    x: gameStage.clientWidth / 2,
    y: gameStage.clientHeight - bottom - wrapperRect.height / 2,
    viewportX: stageRect.left + gameStage.clientWidth / 2,
    viewportY: stageRect.top + gameStage.clientHeight - bottom - wrapperRect.height / 2,
  };
}

function getBallCenterPoint() {
  const wrapperRect = ballWrapper.getBoundingClientRect();
  const stageRect = gameStage.getBoundingClientRect();

  return {
    x: ((wrapperRect.left + wrapperRect.width / 2 - stageRect.left) / stageRect.width) * gameStage.clientWidth,
    y: ((wrapperRect.top + wrapperRect.height / 2 - stageRect.top) / stageRect.height) * gameStage.clientHeight,
  };
}

function createShotVector(targetPoint) {
  const normalizedHeight = targetPoint.y / gameStage.clientHeight;
  const scale = clamp(0.58 - normalizedHeight * 0.26, 0.28, 0.5);

  return {
    x: targetPoint.x,
    y: targetPoint.y,
    scale,
  };
}

function updateRoundNumber() {
  const completedPairs = Math.min(shootoutState.playerShots.length, shootoutState.cpuShots.length);
  shootoutState.roundNumber = completedPairs + 1;
}

function checkShootoutEnd() {
  const playerTaken = shootoutState.playerShots.length;
  const cpuTaken = shootoutState.cpuShots.length;
  const maxRegularShots = 5;

  const playerRemaining = Math.max(0, maxRegularShots - playerTaken);
  const cpuRemaining = Math.max(0, maxRegularShots - cpuTaken);
  const regularPhaseActive = playerTaken <= maxRegularShots && cpuTaken <= maxRegularShots;
  const playerUnreachable = regularPhaseActive && shootoutState.cpuGoals > shootoutState.playerGoals + playerRemaining;
  const cpuUnreachable = regularPhaseActive && shootoutState.playerGoals > shootoutState.cpuGoals + cpuRemaining;
  const regularFinishedWithWinner = playerTaken === maxRegularShots
    && cpuTaken === maxRegularShots
    && shootoutState.playerGoals !== shootoutState.cpuGoals;
  const suddenDeathPairComplete = playerTaken === cpuTaken && playerTaken > maxRegularShots;
  const suddenDeathWinner = suddenDeathPairComplete
    && shootoutState.playerShots[playerTaken - 1] !== shootoutState.cpuShots[cpuTaken - 1];

  if (playerUnreachable || cpuUnreachable || regularFinishedWithWinner || suddenDeathWinner) {
    shootoutState.gameOver = true;
    const didWin = shootoutState.playerGoals > shootoutState.cpuGoals;
    setStatus(didWin ? "Victoire." : "Defaite.");
    if (!matchContext.isMultiplayer) {
      settleFinishedLocalMatch(didWin);
    }
    return true;
  }

  return false;
}

function finishTurn() {
  shootoutState.actionLocked = false;
  updateRoundNumber();
  updateScoreboard();
  if (checkShootoutEnd()) {
    setLocalTurnDeadline(0);
    stopTurnCountdown();
    updateControls();
    if (!matchContext.isBot) {
      publishShootoutState("game-over");
    }
    return;
  }

  shootoutState.turn = shootoutState.turn === "player-shoot" ? "cpu-shoot" : "player-shoot";
  setLocalTurnDeadline(Date.now() + 15000);
  syncDecorForTurn(true);
  resetKeepersToGoalCenter();
  if (matchContext.isBot) {
    syncBotTurnStatus();
  } else {
    setStatus(shootoutState.turn === "player-shoot" ? "A toi de tirer." : `${matchContext.opponentName} tire. Choisis la plongee.`);
  }
  syncKeeperVisibility();
  updateScoreboard();
  updateControls();
  publishShootoutState("turn-finished");
}

function resolvePlayerShot(keeperZone, shotZone) {
  const isSave = keeperZone === shotZone;

  shootoutState.playerShots.push(isSave ? "save" : "goal");
  if (!isSave) {
    shootoutState.playerGoals += 1;
  }

  if (isSave) {
    playSaveSound();
  } else {
    playGoalSound();
  }
  setStatus(isSave ? "Le gardien adverse arrete." : "But pour toi.");
}

function resolveCpuShot(shotZone) {
  const keeperZone = keeperPlacementState.zone || inferKeeperZoneFromPlacement();
  const isSave = keeperZone === shotZone;

  shootoutState.cpuShots.push(isSave ? "save" : "goal");
  if (!isSave) {
    shootoutState.cpuGoals += 1;
  }

  if (isSave) {
    playSaveSound();
  } else {
    playGoalSound();
  }
  setStatus(isSave ? "Bel arret." : `But pour ${matchContext.opponentName}.`);
}

function launchPlayerShot(shotZone = "center", forcedKeeperZone = "") {
  if (isWaitingForMatchOpponent() || shootoutState.turn !== "player-shoot" || shootoutState.gameOver || shootoutState.actionLocked) {
    return;
  }

  unlockAudio();
  const keeperOptions = keeperDecorZones;
  const keeperZone = forcedKeeperZone || keeperOptions[Math.floor(Math.random() * keeperOptions.length)];

  shootoutState.actionLocked = true;
  updateControls();
  if (matchContext.isBot) {
    setStatus("L adversaire ap reflechi...");
  }

  clearBotReactionTimeout();
  botReactionTimeout = window.setTimeout(() => {
    botReactionTimeout = null;
    playKickSound();
    syncShotMapLayout();
    const shotPoint = getZonePoint(shotZone);
    if (shotMap) {
      shotMap.classList.add("is-hidden");
    }
    const shotVector = createShotVector(shotPoint);

    animateKeeperDive(keeperZone);
    window.setTimeout(() => {
      playKeeperDecorAnimation("opponent", keeperZone);
    }, 120);

    if (!gsapApi) {
      resolvePlayerShot(keeperZone, shotZone);
      finishTurn();
      return;
    }

    const ballStartPoint = getBallCenterPoint();
    gsapApi.killTweensOf([ballWrapper, ball]);
    gsapApi.set(ballWrapper, {
      left: `${ballStartPoint.x}px`,
      top: `${ballStartPoint.y}px`,
      bottom: "auto",
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      transformOrigin: "50% 50%",
    });
    gsapApi.set(ball, {
      rotate: 0,
      transformOrigin: "50% 50%",
    });
    gsapApi.timeline({
      onComplete: () => {
        resolvePlayerShot(keeperZone, shotZone);
        gsapApi.delayedCall(0.62, () => {
          resetBall(true);
          finishTurn();
        });
      },
    })
      .to(ballWrapper, {
        left: `${shotVector.x}px`,
        top: `${shotVector.y}px`,
        scale: shotVector.scale,
        duration: 0.72,
        ease: "power3.out",
        transformOrigin: "50% 50%",
      }, 0)
      .to(ball, {
        rotate: shotVector.x > ballStartPoint.x ? 180 : -180,
        duration: 0.72,
        ease: "power3.out",
        transformOrigin: "50% 50%",
      }, 0);
  }, matchContext.isBot ? 3000 : 0);
}

function launchCpuShot(keeperZone = "center", forcedShotZone = "") {
  if (isWaitingForMatchOpponent() || shootoutState.turn !== "cpu-shoot" || shootoutState.gameOver || shootoutState.actionLocked) {
    return;
  }

  unlockAudio();
  playKickSound();
  syncShotMapLayout();
  const keeperPoint = getZonePoint(keeperZone);
  const shotOptions = getPlayableShotZones();
  const shotZone = forcedShotZone || shotOptions[Math.floor(Math.random() * shotOptions.length)];
  const shotPoint = getZonePoint(shotZone);
  const shotVector = createShotVector(shotPoint);
  if (shotMap) {
    shotMap.classList.add("is-hidden");
  }
  keeperPlacementState.zone = keeperZone;
  keeperPlacementState.x = keeperPoint.x;
  keeperPlacementState.y = keeperPoint.y;
  window.setTimeout(() => {
    playKeeperDecorAnimation("player", keeperZone);
  }, 120);

  if (!gsapApi) {
    resolveCpuShot(shotZone);
    finishTurn();
    return;
  }

  shootoutState.actionLocked = true;
  updateControls();
  const ballStartPoint = getBallCenterPoint();
  gsapApi.killTweensOf([ballWrapper, ball]);
  gsapApi.set(ballWrapper, {
    left: `${ballStartPoint.x}px`,
    top: `${ballStartPoint.y}px`,
    bottom: "auto",
    xPercent: -50,
    yPercent: -50,
    scale: 1,
    transformOrigin: "50% 50%",
  });
  gsapApi.set(ball, {
    rotate: 0,
    transformOrigin: "50% 50%",
  });
  gsapApi.timeline({
    onComplete: () => {
      resolveCpuShot(shotZone);
      gsapApi.delayedCall(0.62, () => {
        resetBall(true);
        finishTurn();
      });
    },
  })
    .to(ballWrapper, {
      left: `${shotVector.x}px`,
      top: `${shotVector.y}px`,
      scale: shotVector.scale,
      duration: 0.72,
      ease: "power3.out",
      transformOrigin: "50% 50%",
    }, 0)
    .to(ball, {
      rotate: shotVector.x > ballStartPoint.x ? 180 : -180,
      duration: 0.72,
      ease: "power3.out",
      transformOrigin: "50% 50%",
    }, 0);
}

function updateAimTargetFromPointer(clientX, clientY) {
  const stageRect = gameStage.getBoundingClientRect();
  const stageX = ((clientX - stageRect.left) / stageRect.width) * gameStage.clientWidth;
  const stageY = ((clientY - stageRect.top) / stageRect.height) * gameStage.clientHeight;
  placeAimTarget(stageX, stageY);
}

function updateKeeperFromPointer(clientX, clientY) {
  const stageRect = gameStage.getBoundingClientRect();
  const stageX = ((clientX - stageRect.left) / stageRect.width) * gameStage.clientWidth;
  const stageY = ((clientY - stageRect.top) / stageRect.height) * gameStage.clientHeight;
  placeKeeper(stageX, stageY);
}

function onAimPointerDown(event) {
  if (isWaitingForMatchOpponent() || shootoutState.turn !== "player-shoot" || shootoutState.gameOver || shootoutState.actionLocked) {
    return;
  }

  unlockAudio();
  aimState.active = true;
  aimTarget.classList.add("is-dragging");
  aimTarget.setPointerCapture(event.pointerId);
  updateAimTargetFromPointer(event.clientX, event.clientY);
}

function onAimPointerMove(event) {
  if (!aimState.active || shootoutState.turn !== "player-shoot") {
    return;
  }

  updateAimTargetFromPointer(event.clientX, event.clientY);
}

function onAimPointerUp(event) {
  if (!aimState.active) {
    return;
  }

  aimState.active = false;
  aimTarget.classList.remove("is-dragging");
  if (aimTarget.hasPointerCapture(event.pointerId)) {
    aimTarget.releasePointerCapture(event.pointerId);
  }

  updateAimTargetFromPointer(event.clientX, event.clientY);
  if (matchContext.isMultiplayer) {
    animateAimChoice();
    submitMultiplayerChoice("shot", normalizeMatchZone(inferPlayerShotZone()));
    return;
  }

  launchPlayerShot();
}

function onShotTargetClick(event) {
  const button = event.currentTarget;
  if (!button || button.hidden || isWaitingForMatchOpponent()) {
    return;
  }

  const zone = button.dataset.zone || "center";
  if (matchContext.isMultiplayer) {
    const choiceType = shootoutState.turn === "player-shoot" ? "shot" : "keeper";
    animateShotTargetSelection(button, () => submitMultiplayerChoice(choiceType, normalizeMatchZone(zone)));
    return;
  }

  if (shootoutState.turn === "player-shoot") {
    animateShotTargetSelection(button, () => launchPlayerShot(zone));
    return;
  }

  if (shootoutState.turn === "cpu-shoot") {
    animateShotTargetSelection(button, () => launchCpuShot(zone));
  }
}

function onKeeperPointerDown(event) {
  if (isWaitingForMatchOpponent() || shootoutState.turn !== "cpu-shoot" || shootoutState.gameOver || shootoutState.actionLocked) {
    return;
  }

  unlockAudio();
  keeperPlacementState.active = true;
  keeper.classList.add("is-dragging");
  keeper.setPointerCapture(event.pointerId);
  updateKeeperFromPointer(event.clientX, event.clientY);
}

function onKeeperPointerMove(event) {
  if (!keeperPlacementState.active || shootoutState.turn !== "cpu-shoot" || shootoutState.gameOver || shootoutState.actionLocked) {
    return;
  }

  updateKeeperFromPointer(event.clientX, event.clientY);
}

function onKeeperPointerUp(event) {
  if (!keeperPlacementState.active) {
    return;
  }

  keeperPlacementState.active = false;
  keeper.classList.remove("is-dragging");
  if (keeper.hasPointerCapture(event.pointerId)) {
    keeper.releasePointerCapture(event.pointerId);
  }

  updateKeeperFromPointer(event.clientX, event.clientY);
  if (shootoutState.turn === "cpu-shoot" && !shootoutState.gameOver && !shootoutState.actionLocked) {
    if (matchContext.isMultiplayer) {
      animateKeeperChoice();
      submitMultiplayerChoice("keeper", normalizeMatchZone(keeperPlacementState.zone || "center"));
      return;
    }

    launchCpuShot(keeperPlacementState.zone || "center");
  }
}

function runIntroAnimations() {
  if (!gsapApi || uiState.phase !== "game") {
    return;
  }

  gsapApi.from(".scoreboard, .status-banner, .shot-map, .ball-wrapper", {
    y: 18,
    opacity: 0,
    duration: 0.7,
    stagger: 0.05,
    ease: "power2.out",
  });
}

function setAppPhase(nextPhase) {
  uiState.phase = nextPhase;

  if (gameWrapper) {
    gameWrapper.classList.toggle("is-home", nextPhase === "home" || nextPhase === "splash");
    gameWrapper.classList.toggle("is-game", nextPhase === "game");
  }

  if (splashScreen) {
    splashScreen.classList.toggle("is-hidden", nextPhase !== "splash");
  }

  updateControls();
}

function openAuthModal() {
  if (!authModal) {
    return;
  }

  authModal.hidden = false;
  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
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

function setAuthMode(mode) {
  uiState.authMode = mode;
  authTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.authTab === mode);
  });
  if (authLoginForm) {
    authLoginForm.classList.toggle("is-hidden", mode !== "login");
  }
  if (authSignupForm) {
    authSignupForm.classList.toggle("is-hidden", mode !== "signup");
  }
}

function initLucideIcons() {
  if (openChatButton) {
    openChatButton.innerHTML = '<i data-lucide="message-circle" aria-hidden="true"></i>';
  }

  if (openAuthButton) {
    openAuthButton.innerHTML = '<i data-lucide="user-round" aria-hidden="true"></i><span class="profile-dot" aria-hidden="true"></span>';
  }

  if (openAuthBottomButton) {
    openAuthBottomButton.innerHTML = '<span class="bottom-nav-icon" aria-hidden="true"><i data-lucide="user-round"></i></span><span>Profil</span>';
  }

  if (playCtaArrow) {
    playCtaArrow.innerHTML = '<i data-lucide="arrow-right" aria-hidden="true"></i>';
  }

  if (bottomNavIcons[0]) {
    bottomNavIcons[0].innerHTML = '<i data-lucide="house" aria-hidden="true"></i>';
  }
  if (bottomNavIcons[1]) {
    bottomNavIcons[1].innerHTML = '<i data-lucide="dribbble" aria-hidden="true"></i>';
  }
  if (bottomNavIcons[2]) {
    bottomNavIcons[2].innerHTML = '<i data-lucide="trophy" aria-hidden="true"></i>';
  }
  if (bottomNavIcons[3]) {
    bottomNavIcons[3].innerHTML = '<i data-lucide="shopping-cart" aria-hidden="true"></i>';
  }
  if (bottomNavIcons[4]) {
    bottomNavIcons[4].innerHTML = '<i data-lucide="user-round" aria-hidden="true"></i>';
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function enterGameMode() {
  setAppPhase("game");
  updateScoreboard();
  updateControls();
  if (gsapApi) {
    gsapApi.fromTo(
      [".scoreboard", ".status-banner", ".shot-map", ".ball-wrapper"],
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: "power2.out" },
    );
  }
}

aimTarget.addEventListener("pointerdown", onAimPointerDown);
aimTarget.addEventListener("pointermove", onAimPointerMove);
aimTarget.addEventListener("pointerup", onAimPointerUp);
aimTarget.addEventListener("pointercancel", onAimPointerUp);
shotTargets.forEach((button) => {
  button.addEventListener("click", onShotTargetClick);
});
keeper.addEventListener("pointerdown", onKeeperPointerDown);
keeper.addEventListener("pointermove", onKeeperPointerMove);
keeper.addEventListener("pointerup", onKeeperPointerUp);
keeper.addEventListener("pointercancel", onKeeperPointerUp);
window.addEventListener("resize", resizeGame);
window.addEventListener("load", resizeGame);
if (decorFrameImage) {
  decorFrameImage.addEventListener("load", syncShotMapLayout);
}

if (enterGameButton) {
  enterGameButton.addEventListener("click", enterGameMode);
}
if (openAuthButton) {
  openAuthButton.addEventListener("click", openAuthModal);
}
if (openAuthBottomButton) {
  openAuthBottomButton.addEventListener("click", openAuthModal);
}
if (closeAuthButton) {
  closeAuthButton.addEventListener("click", closeAuthModal);
}
if (authModal) {
  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });
}
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab || "login"));
});
if (authLoginForm) {
  authLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeAuthModal();
  });
}
if (authSignupForm) {
  authSignupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeAuthModal();
  });
}
if (requestRematchButton) {
  requestRematchButton.addEventListener("click", handleRequestRematch);
}
if (acceptRematchButton) {
  acceptRematchButton.addEventListener("click", handleAcceptRematch);
}
if (closeResultModalButton) {
  closeResultModalButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}
if (matchResultModal) {
  matchResultModal.addEventListener("click", (event) => {
    if (event.target === matchResultModal) {
      closeMatchResultModal();
    }
  });
}
window.addEventListener("pagehide", markCurrentPlayerLeft);
window.addEventListener("beforeunload", markCurrentPlayerLeft);

initLucideIcons();
if (isGamePage) {
  setAppPhase("game");
  resizeGame();
  resetKeepersToGoalCenter();
  updateScoreboard();
  updateControls();
  runIntroAnimations();
  hydrateMatchContext().finally(() => {
    if (!matchContext.code) {
      setStatus("A toi de tirer.");
    }
    updateScoreboard();
  });
}
