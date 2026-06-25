const firebaseConfig = window.firebaseConfig || null;
const firebaseReady = Boolean(window.firebase && firebaseConfig);

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

export const GROUP_MATCH_INVITE_TEXT = "M ap chache yon jwè pou match la. Klike pou antre dirèkteman.";

export function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function usernameToEmail(username) {
  const key = normalizeUsername(username);
  return key ? `${key}@penallakay.com` : "";
}

export async function initFirebaseClient() {
  if (!firebaseReady) {
    throw new Error("firebase-not-ready");
  }

  if (!firebaseApp) {
    firebaseApp = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
    firebaseAuth = window.firebase.auth();
    firebaseDb = window.firebase.firestore();
    firebaseDb.settings({
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      useFetchStreams: false,
    });

    try {
      await firebaseAuth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    } catch (_) {
      // Local persistence fallback is acceptable here.
    }
  }

  return {
    app: firebaseApp,
    auth: firebaseAuth,
    db: firebaseDb,
  };
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirebaseDb() {
  return firebaseDb;
}

export function listenToAuthState(callback) {
  if (!firebaseAuth) {
    return () => {};
  }

  return firebaseAuth.onAuthStateChanged(callback);
}

export function listenToRecentChatMessages(callback) {
  if (!firebaseDb) {
    return () => {};
  }

  return firebaseDb
    .collection("globalChat")
    .orderBy("createdAt", "desc")
    .limit(10)
    .onSnapshot((snapshot) => {
      const messages = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .reverse();

      callback(messages);
    });
}

function getChatActivityRef(db) {
  return db.collection("chatMeta").doc("activity");
}

function getChatSimulationRef(db) {
  return db.collection("chatMeta").doc("simulation");
}

function getChatPresenceRef(db, sessionId) {
  return db.collection("chatPresence").doc(String(sessionId || ""));
}

function hashOnlineSeed(input) {
  let hash = 0;
  const value = String(input || "");
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

async function addChatMessage(db, payload) {
  const docRef = await db.collection("globalChat").add(payload);
  const now = Date.now();
  const activityPayload = {
    lastMessageAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageClientAt: now,
    lastMessageType: payload.messageType || "text",
    lastMessageUid: payload.uid || "",
  };

  if (!payload.simulated) {
    activityPayload.lastHumanMessageAt = window.firebase.firestore.FieldValue.serverTimestamp();
    activityPayload.lastHumanMessageClientAt = now;
  }

  await getChatActivityRef(db).set(activityPayload, { merge: true });
  return docRef;
}

export async function sendChatMessage({ user, text, username, replyTo = null, messageType = "text", invite = null }) {
  const { db } = await initFirebaseClient();
  if (!user?.uid) {
    throw new Error("not-authenticated");
  }

  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("empty-message");
  }

  const payload = {
    uid: user.uid,
    username: String(username || user.displayName || "Jwe").trim() || "Jwe",
    text: cleanText.slice(0, 220),
    messageType: String(messageType || "text"),
    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (replyTo?.id && replyTo?.text) {
    payload.replyTo = {
      id: String(replyTo.id),
      uid: String(replyTo.uid || ""),
      username: String(replyTo.username || "Jwe").trim() || "Jwe",
      text: String(replyTo.text || "").trim().slice(0, 160),
    };
  }

  if (messageType === "match-invite" && invite?.code) {
    payload.invite = {
      code: String(invite.code).trim().slice(0, 24),
      hostUid: String(invite.hostUid || user.uid),
      hostUsername: String(invite.hostUsername || payload.username).trim() || payload.username,
      wagerCoins: Math.max(25, Math.floor(Number(invite.wagerCoins || 25))),
      status: String(invite.status || "open"),
    };
  }

  const docRef = await addChatMessage(db, payload);
  return {
    id: docRef.id,
    ...payload,
  };
}

export async function createMatchRoom({ code, hostUid, hostUsername, isBot = false, wagerCoins = 25 }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanWager = Math.max(25, Math.floor(Number(wagerCoins || 25)));
  const cleanHostUid = String(hostUid || "");
  if (!cleanCode) {
    throw new Error("missing-code");
  }
  if (!isBot && cleanHostUid) {
    const hostSnapshot = await db.collection("users").doc(cleanHostUid).get();
    const hostProfile = hostSnapshot.exists ? hostSnapshot.data() || {} : {};
    const hostCoins = Number(hostProfile.coins || 0);
    if (hostCoins < cleanWager) {
      throw new Error("insufficient-coins");
    }
  }

  await db.collection("matchRooms").doc(cleanCode).set(
    {
      code: cleanCode,
      hostUid: cleanHostUid,
      hostUsername: String(hostUsername || "Jwe").trim() || "Jwe",
      isBot: Boolean(isBot),
      wagerCoins: cleanWager,
      status: "open",
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function joinMatchRoom({ code, user, username, messageId = "" }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }
  if (!user?.uid) {
    throw new Error("not-authenticated");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  const messageRef = messageId ? db.collection("globalChat").doc(String(messageId)) : null;

  return db.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = roomSnapshot.data() || {};
    if (room.status && room.status !== "open") {
      throw new Error("room-closed");
    }
    if (room.gameState?.startedWithBothInGame || room.gameState?.gameOver) {
      throw new Error("room-closed");
    }
    if (room.status === "joined" && room.guestUid && room.guestUid !== user.uid && room.hostUid !== user.uid) {
      throw new Error("room-already-joined");
    }
    if (room.hostUid && room.hostUid === user.uid) {
      throw new Error("host-cannot-join-own-room");
    }

    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || 25)));
    const wagerPayments = room.wagerPayments || {};
    const guestRef = db.collection("users").doc(user.uid);
    const guestSnapshot = await transaction.get(guestRef);
    const shouldDebitHost = Boolean(room.hostUid && !room.isBot && !wagerPayments.hostPaid);
    const hostRef = shouldDebitHost ? db.collection("users").doc(String(room.hostUid)) : null;
    const hostSnapshot = hostRef ? await transaction.get(hostRef) : null;
    const guestUsername = String(username || user.displayName || "Jwe").trim() || "Jwe";
    if (!wagerPayments.guestPaid) {
      const guestData = guestSnapshot.exists ? guestSnapshot.data() || {} : {};
      const guestCoins = Number(guestData.coins || 0);
      if (guestCoins < wagerCoins) {
        throw new Error("insufficient-coins");
      }
      transaction.set(guestRef, {
        ...guestData,
        username: guestData.username || guestUsername,
        coins: guestCoins - wagerCoins,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    if (hostRef) {
      const hostData = hostSnapshot?.exists ? hostSnapshot.data() || {} : {};
      const hostCoins = Number(hostData.coins || 0);
      if (hostCoins < wagerCoins) {
        throw new Error("insufficient-coins");
      }
      transaction.set(hostRef, {
        ...hostData,
        username: hostData.username || room.hostUsername || "Jwe",
        coins: hostCoins - wagerCoins,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    transaction.set(
      roomRef,
      {
        code: cleanCode,
        guestUid: user.uid,
        guestUsername,
        status: "joined",
        wagerPayments: {
          ...wagerPayments,
          guestPaid: true,
          ...(shouldDebitHost ? { hostPaid: true } : {}),
        },
        joinedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (messageRef) {
      transaction.set(
        messageRef,
        {
          invite: {
            ...room,
            code: cleanCode,
            hostUid: room.hostUid || "",
            hostUsername: room.hostUsername || "Jwe",
            guestUid: user.uid,
            guestUsername,
            status: "joined",
          },
        },
        { merge: true },
      );
    }

    return {
      code: cleanCode,
      ...room,
      guestUid: user.uid,
      guestUsername,
      status: "joined",
    };
  });
}

export async function autoJoinMatchRoomWithBot({ code, messageId = "" }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  const messageRef = messageId ? db.collection("globalChat").doc(String(messageId)) : null;
  const botNames = [
    "Mika", "Sonia", "Junior", "Lina", "Kervens", "Nath", "Djay", "Stevens", "Roro", "Manno",
    "Tania", "Wendy", "Chris", "Fabi", "Nico", "Kenny", "Sabrina", "Jojo", "Mitch", "Ludji",
  ];

  return db.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = roomSnapshot.data() || {};
    if (room.status && room.status !== "open") {
      return null;
    }
    if (room.guestUid || room.gameState?.startedWithBothInGame || room.gameState?.gameOver) {
      return null;
    }

    const seed = cleanCode.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const botName = botNames[Math.abs(seed) % botNames.length];
    const hostUid = String(room.hostUid || "").trim();
    const hostUsername = String(room.hostUsername || "Jwe").trim() || "Jwe";
    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || 25)));
    const shouldDebitHost = Boolean(hostUid && !room.wagerPayments?.hostPaid);
    const hostRef = shouldDebitHost ? db.collection("users").doc(hostUid) : null;
    const hostSnapshot = hostRef ? await transaction.get(hostRef) : null;

    if (hostRef) {
      const hostData = hostSnapshot?.exists ? hostSnapshot.data() || {} : {};
      const hostCoins = Number(hostData.coins || 0);
      if (hostCoins < wagerCoins) {
        throw new Error("insufficient-coins");
      }
      transaction.set(hostRef, {
        ...hostData,
        username: hostData.username || hostUsername,
        coins: hostCoins - wagerCoins,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    transaction.set(
      roomRef,
      {
        code: cleanCode,
        isBot: true,
        status: "joined",
        hostUid,
        hostUsername: botName,
        botGuestForHostUid: hostUid,
        botGuestForHostUsername: hostUsername,
        wagerPayments: {
          ...(room.wagerPayments || {}),
          ...(shouldDebitHost ? { hostPaid: true } : {}),
        },
        joinedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        botJoinedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (messageRef) {
      transaction.set(
        messageRef,
        {
          invite: {
            code: cleanCode,
            hostUid,
            hostUsername,
            guestUid: `bot-${cleanCode.toLowerCase()}`,
            guestUsername: botName,
            wagerCoins,
            status: "joined",
            isBot: true,
          },
        },
        { merge: true },
      );
    }

    return {
      code: cleanCode,
      hostUid,
      hostUsername: botName,
      status: "joined",
      isBot: true,
    };
  });
}

export async function loadMatchRoom(code) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    return null;
  }

  const snapshot = await db.collection("matchRooms").doc(cleanCode).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function markMatchParticipantInGame({ code, role, userUid = "" }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanRole = role === "guest" ? "guest" : "host";
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  const profileRef = userUid ? db.collection("users").doc(String(userUid)) : null;
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
    if (!snapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = snapshot.data() || {};
    const expectedUid = cleanRole === "host" ? room.hostUid : room.guestUid;
    if (profileRef && expectedUid && expectedUid !== userUid) {
      throw new Error("invalid-player");
    }
    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || 25)));
    const paidKey = cleanRole === "host" ? "hostPaid" : "guestPaid";
    const alreadyPaid = Boolean(room.wagerPayments?.[paidKey]);
    if (profileRef && !alreadyPaid) {
      const profileData = profileSnapshot?.exists ? profileSnapshot.data() || {} : {};
      const currentCoins = Number(profileData.coins || 0);
      if (currentCoins < wagerCoins) {
        throw new Error("insufficient-coins");
      }
      transaction.set(profileRef, {
        ...profileData,
        username: profileData.username || "Jwe",
        coins: currentCoins - wagerCoins,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    const now = Date.now();
    const gamePresence = {
      host: Boolean(room.gamePresence?.host),
      guest: Boolean(room.gamePresence?.guest),
      [cleanRole]: true,
    };
    const bothPlayersJoined = Boolean(room.hostUid && room.guestUid);
    const bothPlayersInGame = bothPlayersJoined && gamePresence.host && gamePresence.guest;
    const currentState = room.gameState || {};
    const shouldStartMatch = bothPlayersInGame && !currentState.startedWithBothInGame;
    const nextPayload = {
      gamePresence,
      wagerPayments: {
        ...(room.wagerPayments || {}),
        ...(profileRef && !alreadyPaid ? { [paidKey]: true } : {}),
      },
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (shouldStartMatch) {
      const firstShooterRole = Math.random() < 0.5 ? "host" : "guest";
      nextPayload.gameState = {
        phase: "collecting",
        turnId: 1,
        shooterRole: firstShooterRole,
        firstShooterRole,
        hostGoals: 0,
        guestGoals: 0,
        hostShots: [],
        guestShots: [],
        choices: { host: {}, guest: {} },
        resolveAt: now + 15000,
        gameOver: false,
        startedWithBothInGame: true,
        updatedClientAt: now,
      };
      nextPayload.status = "started";
    }

    transaction.set(roomRef, nextPayload, { merge: true });
    return {
      gamePresence,
      gameState: shouldStartMatch ? nextPayload.gameState : currentState,
    };
  });
}

export async function markMatchParticipantLeft({ code, role }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanRole = role === "guest" ? "guest" : "host";
  if (!cleanCode) {
    return;
  }

  await db.collection("matchRooms").doc(cleanCode).set(
    {
      [`gamePresence.${cleanRole}`]: false,
      [`gamePresence.${cleanRole}LeftAt`]: Date.now(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function requestMatchRematch({ code, role }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanRole = role === "guest" ? "guest" : "host";
  const otherRole = cleanRole === "host" ? "guest" : "host";
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = snapshot.data() || {};
    if (!room.gamePresence?.[otherRole]) {
      throw new Error("opponent-left");
    }

    const rematch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromRole: cleanRole,
      status: "pending",
      createdClientAt: Date.now(),
    };

    transaction.set(
      roomRef,
      {
        rematch,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return rematch;
  });
}

export async function acceptMatchRematch({ code, role, rematchId }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanRole = role === "guest" ? "guest" : "host";
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = snapshot.data() || {};
    const rematch = room.rematch || {};
    if (rematch.status !== "pending" || rematch.fromRole === cleanRole || (rematchId && rematch.id !== rematchId)) {
      throw new Error("invalid-rematch");
    }

    const now = Date.now();
    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || 25)));
    const hostRef = db.collection("users").doc(room.hostUid || "");
    const guestRef = db.collection("users").doc(room.guestUid || "");
    const hostSnapshot = await transaction.get(hostRef);
    const guestSnapshot = await transaction.get(guestRef);
    const hostData = hostSnapshot.exists ? hostSnapshot.data() || {} : {};
    const guestData = guestSnapshot.exists ? guestSnapshot.data() || {} : {};
    const hostCoins = Number(hostData.coins || 0);
    const guestCoins = Number(guestData.coins || 0);
    if (hostCoins < wagerCoins || guestCoins < wagerCoins) {
      throw new Error("insufficient-coins");
    }
    const firstShooterRole = Math.random() < 0.5 ? "host" : "guest";
    const gameState = {
      phase: "collecting",
      turnId: 1,
      shooterRole: firstShooterRole,
      firstShooterRole,
      hostGoals: 0,
      guestGoals: 0,
      hostShots: [],
      guestShots: [],
      choices: { host: {}, guest: {} },
      resolveAt: now + 15000,
      gameOver: false,
      startedWithBothInGame: true,
      updatedClientAt: now,
    };

    transaction.set(hostRef, {
      ...hostData,
      username: hostData.username || "Jwe",
      coins: hostCoins - wagerCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(guestRef, {
      ...guestData,
      username: guestData.username || "Jwe",
      coins: guestCoins - wagerCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(
      roomRef,
      {
        gameState,
        wagerPayments: {
          hostPaid: true,
          guestPaid: true,
        },
        rematch: {
          ...rematch,
          status: "accepted",
          acceptedByRole: cleanRole,
          acceptedClientAt: now,
        },
        gamePresence: {
          host: true,
          guest: true,
        },
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return gameState;
  });
}

export async function updateMatchRoomGameState({ code, state }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  await db.collection("matchRooms").doc(cleanCode).set(
    {
      gameState: {
        ...(state || {}),
        updatedClientAt: Date.now(),
      },
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function recordBotMatchResult({ code, userUid = "", didPlayerWin = false, settlement = null, finalState = null, botMode = "weak", botLevel = "weak" }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  const summaryRef = db.collection("botDashboardSummary").doc("global");

  return db.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = roomSnapshot.data() || {};
    const state = room.gameState || {};
    if (!room.isBot || state.botDashboardRecorded) {
      return null;
    }

    const sourceState = finalState || state;
    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || settlement?.wagerCoins || sourceState.wagerCoins || 25)));
    const payoutCoins = Math.max(0, Math.floor(Number(settlement?.payoutCoins || sourceState.payoutCoins || 0)));
    const playerGoals = Number(sourceState.playerGoals || 0);
    const botGoals = Number(sourceState.cpuGoals || 0);
    const botDidWin = !Boolean(didPlayerWin);
    const botCoinsWon = botDidWin ? wagerCoins : 0;
    const botCoinsLost = botDidWin ? 0 : wagerCoins;
    const endedClientAt = Date.now();
    const resultId = `${cleanCode}-${endedClientAt}`;
    const resultRef = db.collection("botMatchResults").doc(resultId);
    const payload = {
      id: resultId,
      matchCode: cleanCode,
      playerUid: String(userUid || room.botGuestForHostUid || room.hostUid || ""),
      playerUsername: String(room.botGuestForHostUsername || "Jwe"),
      botName: String(room.hostUsername || "Bot"),
      botMode: String(botMode || "weak"),
      botLevel: String(botLevel || botMode || "weak"),
      playerGoals,
      botGoals,
      playerDidWin: Boolean(didPlayerWin),
      botDidWin,
      wagerCoins,
      payoutCoins,
      botCoinsWon,
      botCoinsLost,
      botNetCoins: botCoinsWon - botCoinsLost,
      playerShots: Array.isArray(sourceState.playerShots) ? sourceState.playerShots : [],
      botShots: Array.isArray(sourceState.cpuShots) ? sourceState.cpuShots : [],
      endedClientAt,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(resultRef, payload, { merge: true });
    transaction.set(summaryRef, {
      matchesPlayed: window.firebase.firestore.FieldValue.increment(1),
      botWins: window.firebase.firestore.FieldValue.increment(botDidWin ? 1 : 0),
      botLosses: window.firebase.firestore.FieldValue.increment(botDidWin ? 0 : 1),
      botCoinsWon: window.firebase.firestore.FieldValue.increment(botCoinsWon),
      botCoinsLost: window.firebase.firestore.FieldValue.increment(botCoinsLost),
      botNetCoins: window.firebase.firestore.FieldValue.increment(botCoinsWon - botCoinsLost),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedClientAt: endedClientAt,
    }, { merge: true });
    transaction.set(roomRef, {
      gameState: {
        ...state,
        playerGoals,
        cpuGoals: botGoals,
        playerShots: Array.isArray(sourceState.playerShots) ? sourceState.playerShots : state.playerShots,
        cpuShots: Array.isArray(sourceState.cpuShots) ? sourceState.cpuShots : state.cpuShots,
        gameOver: true,
        botDashboardRecorded: true,
        botDashboardResultId: resultId,
      },
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return payload;
  });
}

export async function loadBotDashboardStats(limit = 80) {
  const { db } = await initFirebaseClient();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 80));
  const [summarySnapshot, resultsSnapshot, settingsSnapshot] = await Promise.all([
    db.collection("botDashboardSummary").doc("global").get(),
    db.collection("botMatchResults").orderBy("endedClientAt", "desc").limit(safeLimit).get(),
    db.collection("botSettings").doc("global").get(),
  ]);

  return {
    summary: summarySnapshot.exists ? summarySnapshot.data() || {} : {},
    settings: settingsSnapshot.exists ? settingsSnapshot.data() || {} : {},
    matches: resultsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
}

export async function loadBotSettings() {
  const { db } = await initFirebaseClient();
  const snapshot = await db.collection("botSettings").doc("global").get();
  return snapshot.exists ? snapshot.data() || {} : {};
}

export async function saveBotSettings(settings = {}) {
  const { db } = await initFirebaseClient();
  const cleanMode = ["weak", "strong", "auto"].includes(settings.mode) ? settings.mode : "weak";
  const autoStrongBelowNet = Math.floor(Number(settings.autoStrongBelowNet ?? -250));
  const autoWeakAboveNet = Math.floor(Number(settings.autoWeakAboveNet ?? 500));
  const payload = {
    mode: cleanMode,
    autoStrongBelowNet,
    autoWeakAboveNet,
    updatedClientAt: Date.now(),
    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("botSettings").doc("global").set(payload, { merge: true });
  return payload;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function recordSiteVisit(page = "site") {
  const { db } = await initFirebaseClient();
  const cleanPage = String(page || "site").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 32) || "site";
  const dateKey = getLocalDateKey();
  const storageKey = `penal-lakay-visit:${dateKey}:${cleanPage}`;

  try {
    if (window.localStorage.getItem(storageKey)) {
      return null;
    }
    window.localStorage.setItem(storageKey, String(Date.now()));
  } catch (_) {
    // If localStorage is unavailable, still record the visit.
  }

  const payload = {
    dateKey,
    totalVisits: window.firebase.firestore.FieldValue.increment(1),
    [`pages.${cleanPage}`]: window.firebase.firestore.FieldValue.increment(1),
    updatedClientAt: Date.now(),
    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("siteVisitStats").doc(dateKey).set(payload, { merge: true });
  return payload;
}

export async function submitMatchTurnChoice({ code, role, choiceType, zone }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanRole = role === "guest" ? "guest" : "host";
  const cleanChoiceType = choiceType === "keeper" ? "keeper" : "shot";
  const cleanZone = String(zone || "center").trim() || "center";
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = snapshot.data() || {};
    const now = Date.now();
    const state = room.gameState || {};
    const turnId = Number(state.turnId || 1);
    const shooterRole = state.shooterRole === "guest" ? "guest" : "host";
    const phase = state.phase || "waiting";
    const choices = {
      host: { ...(state.choices?.host || {}) },
      guest: { ...(state.choices?.guest || {}) },
    };

    if (phase !== "collecting") {
      return state;
    }

    choices[cleanRole][cleanChoiceType] = cleanZone;

    const nextState = {
      ...state,
      phase: "collecting",
      turnId,
      shooterRole,
      resolveAt: Number(state.resolveAt || now + 15000),
      choices,
      updatedBy: cleanRole,
      updatedClientAt: now,
    };

    transaction.set(
      roomRef,
      {
        gameState: nextState,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return nextState;
  });
}

function getShootoutDecision({ hostGoals, guestGoals, hostShots, guestShots }) {
  const regularShots = 5;
  const hostTaken = hostShots.length;
  const guestTaken = guestShots.length;
  const hostRemaining = Math.max(0, regularShots - hostTaken);
  const guestRemaining = Math.max(0, regularShots - guestTaken);
  const regularPhaseActive = hostTaken <= regularShots && guestTaken <= regularShots;

  if (regularPhaseActive && hostGoals > guestGoals + guestRemaining) {
    return { gameOver: true, winnerRole: "host", reason: "unreachable" };
  }

  if (regularPhaseActive && guestGoals > hostGoals + hostRemaining) {
    return { gameOver: true, winnerRole: "guest", reason: "unreachable" };
  }

  if (hostTaken === regularShots && guestTaken === regularShots) {
    if (hostGoals !== guestGoals) {
      return {
        gameOver: true,
        winnerRole: hostGoals > guestGoals ? "host" : "guest",
        reason: "regular",
      };
    }
  }

  if (hostTaken === guestTaken && hostTaken > regularShots) {
    const lastHostShot = hostShots[hostShots.length - 1];
    const lastGuestShot = guestShots[guestShots.length - 1];
    if (lastHostShot !== lastGuestShot) {
      return {
        gameOver: true,
        winnerRole: lastHostShot === "goal" ? "host" : "guest",
        reason: "sudden-death",
      };
    }
  }

  return { gameOver: false, winnerRole: "", reason: "" };
}

export async function resolveMatchTurn({ code }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  const playableZones = ["top-left", "top-right", "middle-center", "bottom-left", "bottom-right"];
  const pickZone = () => playableZones[Math.floor(Math.random() * playableZones.length)] || "center";
  const roomRef = db.collection("matchRooms").doc(cleanCode);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = snapshot.data() || {};
    const state = room.gameState || {};
    if (state.phase !== "collecting" || state.phase === "resolved") {
      return state;
    }

    const now = Date.now();
    const turnId = Number(state.turnId || 1);
    const shooterRole = state.shooterRole === "guest" ? "guest" : "host";
    const defenderRole = shooterRole === "host" ? "guest" : "host";
    const choices = {
      host: { ...(state.choices?.host || {}) },
      guest: { ...(state.choices?.guest || {}) },
    };
    const shooterChoice = choices[shooterRole]?.shot || pickZone();
    const defenderChoice = choices[defenderRole]?.keeper || pickZone();
    const isSave = shooterChoice === defenderChoice;
    const hostGoals = Number(state.hostGoals || 0) + (shooterRole === "host" && !isSave ? 1 : 0);
    const guestGoals = Number(state.guestGoals || 0) + (shooterRole === "guest" && !isSave ? 1 : 0);
    const hostShots = Array.isArray(state.hostShots) ? [...state.hostShots] : [];
    const guestShots = Array.isArray(state.guestShots) ? [...state.guestShots] : [];
    const shotResult = isSave ? "save" : "goal";

    if (shooterRole === "host") {
      hostShots.push(shotResult);
    } else {
      guestShots.push(shotResult);
    }

    const decision = getShootoutDecision({ hostGoals, guestGoals, hostShots, guestShots });
    const gameOver = decision.gameOver;
    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || 25)));
    const systemFeeCoins = 5;
    const payoutCoins = Math.max(0, wagerCoins * 2 - systemFeeCoins);
    const nextShooterRole = shooterRole === "host" ? "guest" : "host";
    const nextState = {
      ...state,
      phase: "resolved",
      turnId,
      shooterRole,
      nextShooterRole,
      shotZone: shooterChoice,
      keeperZone: defenderChoice,
      shotResult,
      hostGoals,
      guestGoals,
      hostShots,
      guestShots,
      gameOver,
      winnerRole: decision.winnerRole,
      endReason: decision.reason,
      wagerCoins,
      systemFeeCoins,
      payoutCoins,
      payoutSettled: Boolean(state.payoutSettled),
      resolvedAt: now,
      updatedBy: "resolver",
      updatedClientAt: now,
    };

    const winnerUid = decision.winnerRole === "host" ? room.hostUid : decision.winnerRole === "guest" ? room.guestUid : "";
    if (gameOver && winnerUid && !state.payoutSettled) {
      const winnerRef = db.collection("users").doc(winnerUid);
      const winnerSnapshot = await transaction.get(winnerRef);
      const winnerData = winnerSnapshot.exists ? winnerSnapshot.data() || {} : {};
      const winnerCoins = Number(winnerData.coins || 0);
      transaction.set(winnerRef, {
        ...winnerData,
        username: winnerData.username || "Jwe",
        coins: winnerCoins + payoutCoins,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      nextState.payoutSettled = true;
      nextState.payoutWinnerUid = winnerUid;
    }

    transaction.set(
      roomRef,
      {
        gameState: nextState,
        ...(gameOver ? { status: "finished" } : {}),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return nextState;
  });
}

export async function settleMatchWagerForPlayer({ code, userUid, role = "", didWin }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanUid = String(userUid || "").trim();
  const cleanRole = role === "host" || role === "guest" ? role : "";
  if (!cleanCode || !cleanUid) {
    return null;
  }

  const roomRef = db.collection("matchRooms").doc(cleanCode);
  const profileRef = db.collection("users").doc(cleanUid);

  return db.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    const profileSnapshot = await transaction.get(profileRef);
    if (!roomSnapshot.exists) {
      throw new Error("room-not-found");
    }

    const room = roomSnapshot.data() || {};
    const state = room.gameState || {};
    if (state.playerWagerSettled?.[cleanUid]) {
      return state.playerWagerSettled[cleanUid];
    }

    const wagerCoins = Math.max(25, Math.floor(Number(room.wagerCoins || state.wagerCoins || 25)));
    const systemFeeCoins = 5;
    const payoutCoins = Math.max(0, wagerCoins * 2 - systemFeeCoins);
    const profileData = profileSnapshot.exists ? profileSnapshot.data() || {} : {};
    const currentCoins = Number(profileData.coins || 0);
    const paidKey = cleanRole === "host" ? "hostPaid" : cleanRole === "guest" ? "guestPaid" : "";
    const alreadyPaid = paidKey
      ? Boolean(room.wagerPayments?.[paidKey])
      : Boolean(room.wagerPayments?.guestPaid || room.wagerPayments?.hostPaid);
    const nextCoins = currentCoins - (alreadyPaid ? 0 : wagerCoins) + (didWin ? payoutCoins : 0);
    const settlement = {
      wagerCoins,
      systemFeeCoins,
      payoutCoins: didWin ? payoutCoins : 0,
      didWin: Boolean(didWin),
      settledClientAt: Date.now(),
    };

    transaction.set(profileRef, {
      ...profileData,
      username: profileData.username || "Jwe",
      coins: nextCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(roomRef, {
      status: "finished",
      gameState: {
        ...state,
        gameOver: true,
        wagerCoins,
        systemFeeCoins,
        payoutCoins,
        playerWagerSettled: {
          ...(state.playerWagerSettled || {}),
          [cleanUid]: settlement,
        },
      },
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return settlement;
  });
}

export async function advanceMatchTurn({ code, nextState }) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("missing-code");
  }

  await db.collection("matchRooms").doc(cleanCode).set(
    {
      gameState: {
        ...(nextState || {}),
        phase: "collecting",
        choices: { host: {}, guest: {} },
        resolveAt: Date.now() + 15000,
        startedWithBothInGame: true,
        updatedClientAt: Date.now(),
      },
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listenMatchRoom(code, callback) {
  const { db } = await initFirebaseClient();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode || typeof callback !== "function") {
    return () => {};
  }

  return db.collection("matchRooms").doc(cleanCode).onSnapshot((snapshot) => {
    callback(snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null);
  });
}

export async function updateChatPresence({ sessionId, user = null, username = "Jwe" }) {
  const { db } = await initFirebaseClient();
  if (!sessionId) {
    return;
  }

  await getChatPresenceRef(db, sessionId).set(
    {
      sessionId: String(sessionId),
      uid: user?.uid || "",
      username: String(username || user?.displayName || "Jwe").trim() || "Jwe",
      inChat: true,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedClientAt: Date.now(),
    },
    { merge: true },
  );
}

export async function clearChatPresence(sessionId) {
  const { db } = await initFirebaseClient();
  if (!sessionId) {
    return;
  }

  await getChatPresenceRef(db, sessionId).set(
    {
      inChat: false,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedClientAt: Date.now(),
    },
    { merge: true },
  );
}

export async function maybeSendSimulatedChatMessage({ idleMs = 7000, minOpenMs = 7000, simulationOwnerId = "" } = {}) {
  const { db } = await initFirebaseClient();
  const now = Date.now();
  const ownerId = String(simulationOwnerId || "").trim() || "default";
  const presenceSnapshot = await db
    .collection("chatPresence")
    .where("updatedClientAt", ">", now - 30000)
    .get();

  const activeViewers = presenceSnapshot.docs.map((doc) => doc.data()).filter((viewer) => viewer.inChat);
  if (!activeViewers.length) {
    return false;
  }

  const hasViewerReady = activeViewers.some((viewer) => now - Number(viewer.updatedClientAt || 0) >= minOpenMs);
  if (!hasViewerReady) {
    return false;
  }

  const activityRef = getChatActivityRef(db);
  const simulationRef = getChatSimulationRef(db);
  const simulationPlan = [
    { username: "Mika", text: "Gen moun kap jwe la?", type: "text" },
    { username: "Sonia", text: "Oui, mwen la. Voye invitation.", type: "text" },
    { username: "Junior", text: "M ap chache yon jwè pou match la. Klike pou antre dirèkteman.", type: "match-invite" },
    { username: "Lina", text: "Mwen dispo pou yon match rapid.", type: "text" },
    { username: "Kervens", text: "M ap chache yon jwè pou match la. Klike pou antre dirèkteman.", type: "match-invite" },
  ];

  const simulatedNames = [
    "Mika", "Sonia", "Junior", "Lina", "Kervens", "Nath", "Djay", "Stevens", "Roro", "Manno", "Tania", "Wendy",
    "Chris", "Fabi", "Nico", "Kenny", "Sabrina", "Jojo", "Mitch", "Ludji", "Berto", "Fanfan", "Samy", "Ruth",
    "Valdo", "Mendy", "Andy", "Daph", "Tico", "Lele", "Nana", "Gaby", "Marco", "Tasha", "Ced", "Wil",
  ];
  const simulatedChatLines = [
    "Gen moun kap jwe la?",
    "Mwen disponib pou yon match rapid.",
    "Ki moun ki vle tire penal?",
    "Mwen sou app la, nap jwe?",
    "Banm yon moun serye pou match la.",
    "Mwen pare, map tann yon envitasyon.",
    "Gen moun online ki vle jwe?",
    "Mwen sot fini yon match, mwen ka rejwe.",
    "Voye invitation si ou pare.",
    "Mwen pa vle tann twop, ann jwe vit.",
    "Kiyes ki dispo kounye a?",
    "Mwen bezwen yon adversaire la.",
    "Map antre si gen invitation.",
    "Gen moun ki vle fe best of 3?",
    "Mwen la pou yon match selman.",
    "Nou ap jwe oubyen nou ap gade?",
    "Mwen konekte, voye invite.",
    "Kote jwe yo ye la?",
    "Mwen dispo pandan 10 minit.",
    "Mwen vle teste chans mwen.",
    "Si gen moun pare, voye match la.",
    "Mwen bezwen yon match rapid avan m ale.",
    "Ann fe yon ti game.",
    "Mwen pare pou tire.",
  ];
  const simulatedReplies = [
    "Oui, mwen la.",
    "Voye invitation.",
    "Mwen kapab jwe.",
    "Antre la, mwen pare.",
    "Ok, map tann ou.",
    "Mwen dispo tou.",
    "Ann ale.",
    "Mwen la wi.",
    "Pa pran tan, voye invite.",
    "Mwen ap vini.",
    "Dako, voye match la.",
    "Mwen pare depi kounye a.",
    "Mwen bezwen yon match tou.",
    "Map join si ou voye.",
  ];
  const simulatedInvites = [GROUP_MATCH_INVITE_TEXT];

  let nextMessage = null;
  await db.runTransaction(async (transaction) => {
    const [activityDoc, simulationDoc] = await Promise.all([transaction.get(activityRef), transaction.get(simulationRef)]);
    const activity = activityDoc.exists ? activityDoc.data() : {};
    const simulation = simulationDoc.exists ? simulationDoc.data() : {};
    const lockUntil = Number(simulation?.lockUntil || 0);
    const lockOwner = String(simulation?.lockOwner || "");
    const lastHumanMessageClientAt = Number(activity?.lastHumanMessageClientAt || activity?.lastMessageClientAt || 0);
    const nextAllowedAt = Number(simulation?.nextAllowedAt || 0);

    if (now - lastHumanMessageClientAt < idleMs || now < nextAllowedAt) {
      return;
    }
    if (lockUntil > now) {
      return;
    }

    const lastSignature = String(simulation?.lastSignature || "");
    let sequence = Number(simulation?.sequence || 0);
    let attempt = 0;

    while (attempt < 4 && !nextMessage) {
      const mode = sequence % 5;
      const nameIndex = (hashOnlineSeed(`name-${sequence}`) + sequence) % simulatedNames.length;
      const username = simulatedNames[nameIndex];
      const textPool = mode === 2 || mode === 4 ? simulatedInvites : mode === 1 ? simulatedReplies : simulatedChatLines;
      const text = textPool[hashOnlineSeed(`text-${sequence}-${username}`) % textPool.length];
      const signature = `${username}|${text}`;
      if (signature !== lastSignature) {
        nextMessage = {
          username,
          text,
          type: mode === 2 || mode === 4 ? "match-invite" : "text",
          sequence,
          signature,
        };
      }
      sequence += 1;
      attempt += 1;
    }

    if (!nextMessage) {
      return;
    }

    transaction.set(
      simulationRef,
      {
        lockOwner: ownerId,
        lockUntil: now + 12000,
        sequence,
        lastSignature: nextMessage.signature,
        nextAllowedAt: now + 7000 + ((sequence % 4) * 3000),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  if (!nextMessage) {
    return false;
  }

  const botId = `sim-${normalizeUsername(nextMessage.username) || "bot"}`;
  const payload = {
    uid: botId,
    username: nextMessage.username,
    text: nextMessage.text,
    messageType: nextMessage.type,
    simulated: true,
    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (nextMessage.type === "match-invite") {
    const code = `SIM-${now.toString(36).toUpperCase()}`;
    const simulatedWagerOptions = [
      25, 25, 25,
      50, 50, 50,
      75, 75,
      100, 100,
      150, 200, 250, 300, 400, 500, 750, 1000,
    ];
    const wagerCoins = simulatedWagerOptions[hashOnlineSeed(`wager-${nextMessage.sequence}`) % simulatedWagerOptions.length];
    nextMessage.text = `${nextMessage.text} Miz la se ${wagerCoins} coins.`;
    payload.text = nextMessage.text;
    payload.invite = {
      code,
      hostUid: botId,
      hostUsername: nextMessage.username,
      isBot: true,
      wagerCoins,
      status: "open",
    };
    await createMatchRoom({
      code,
      hostUid: botId,
      hostUsername: nextMessage.username,
      isBot: true,
      wagerCoins,
    });
  }

  await addChatMessage(db, payload);
  return true;
}

export async function trimChatMessages(maxMessages = 10) {
  const { db } = await initFirebaseClient();
  const safeLimit = Math.max(1, Number(maxMessages) || 10);
  const snapshot = await db.collection("globalChat").orderBy("createdAt", "desc").limit(safeLimit + 20).get();

  if (snapshot.size <= safeLimit) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.slice(safeLimit).forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function createAccount({ username, password }) {
  const { auth } = await initFirebaseClient();
  const email = usernameToEmail(username);
  const credential = await auth.createUserWithEmailAndPassword(email, password);
  await credential.user.updateProfile({ displayName: username });
  return credential.user;
}

export async function loginWithUsername({ username, password }) {
  const { auth } = await initFirebaseClient();
  const email = usernameToEmail(username);
  const credential = await auth.signInWithEmailAndPassword(email, password);
  return credential.user;
}

export async function saveUserProfile(user, profile) {
  const { db } = await initFirebaseClient();

  const payload = {
    uid: user.uid,
    username: profile.username,
    usernameKey: profile.usernameKey,
    coins: typeof profile.coins === "number" ? profile.coins : 0,
    termsAccepted: true,
    ageConfirmed: true,
    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(user.uid).set(payload, { merge: true });
}

export async function getCurrentUser() {
  const { auth } = await initFirebaseClient();
  return auth.currentUser;
}

export async function signOutUser() {
  const { auth } = await initFirebaseClient();
  await auth.signOut();
}

export async function updateUserPassword(nextPassword) {
  const { auth } = await initFirebaseClient();
  if (!auth.currentUser) {
    throw new Error("not-authenticated");
  }

  await auth.currentUser.updatePassword(nextPassword);
}

export async function loadUserProfile(uid) {
  const { db } = await initFirebaseClient();
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function listenToUserProfile(uid, callback) {
  const { db } = await initFirebaseClient();
  return db.collection("users").doc(uid).onSnapshot((snapshot) => {
    callback(snapshot.exists ? snapshot.data() : null);
  });
}

export async function findUserProfileByUsername(username) {
  const { db } = await initFirebaseClient();
  const usernameKey = normalizeUsername(username);
  if (!usernameKey) {
    return null;
  }

  const snapshot = await db.collection("users").where("usernameKey", "==", usernameKey).limit(1).get();
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

export async function creditUserCoins({ targetUid, amount, vendorUser }) {
  const { db } = await initFirebaseClient();
  const safeAmount = Math.floor(Number(amount));
  const MIN_VENDOR_CREDIT_COINS = 90;

  if (!vendorUser?.uid) {
    throw new Error("not-authenticated");
  }
  if (!targetUid) {
    throw new Error("missing-target");
  }
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("invalid-amount");
  }
  if (safeAmount < MIN_VENDOR_CREDIT_COINS) {
    throw new Error("credit-minimum-not-reached");
  }

  if (targetUid === vendorUser.uid) {
    throw new Error("self-credit-forbidden");
  }

  const vendorRef = db.collection("users").doc(vendorUser.uid);
  const targetRef = db.collection("users").doc(targetUid);
  const historyRef = db.collection("vendorTransactions").doc();
  return db.runTransaction(async (transaction) => {
    const vendorSnapshot = await transaction.get(vendorRef);
    const targetSnapshot = await transaction.get(targetRef);

    if (!vendorSnapshot.exists) {
      throw new Error("vendor-not-found");
    }
    if (!targetSnapshot.exists) {
      throw new Error("target-not-found");
    }

    const vendorProfile = vendorSnapshot.data() || {};
    const targetProfile = targetSnapshot.data() || {};
    const vendorCoins = Number(vendorProfile.coins) || 0;
    const currentCoins = Number(targetProfile.coins) || 0;

    if (vendorCoins < safeAmount) {
      throw new Error("insufficient-vendor-coins");
    }

    const nextVendorCoins = vendorCoins - safeAmount;
    const nextCoins = currentCoins + safeAmount;

    transaction.update(vendorRef, {
      coins: nextVendorCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(targetRef, {
      coins: nextCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(historyRef, {
      vendorUid: vendorUser.uid,
      vendorUsername: String(vendorProfile.username || vendorUser.displayName || "").trim() || "Vendeur",
      targetUid,
      targetUsername: String(targetProfile.username || "").trim() || "User",
      amount: safeAmount,
      vendorBeforeCoins: vendorCoins,
      vendorAfterCoins: nextVendorCoins,
      beforeCoins: currentCoins,
      afterCoins: nextCoins,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    return {
      coins: nextCoins,
      amount: safeAmount,
      vendorCoins: nextVendorCoins,
    };
  });
}

export async function sellCoinsToVendor({ sellerUid, amount, user }) {
  const { db } = await initFirebaseClient();
  const safeAmount = Math.floor(Number(amount));
  const MIN_SELL_COINS = 100;

  if (!user?.uid) {
    throw new Error("not-authenticated");
  }
  if (!sellerUid) {
    throw new Error("missing-seller");
  }
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("invalid-amount");
  }
  if (safeAmount < MIN_SELL_COINS) {
    throw new Error("sell-minimum-not-reached");
  }
  if (sellerUid === user.uid) {
    throw new Error("self-sell-forbidden");
  }

  const playerRef = db.collection("users").doc(user.uid);
  const sellerRef = db.collection("users").doc(sellerUid);
  const historyRef = db.collection("coinSellTransactions").doc();

  return db.runTransaction(async (transaction) => {
    const playerSnapshot = await transaction.get(playerRef);
    const sellerSnapshot = await transaction.get(sellerRef);

    if (!playerSnapshot.exists) {
      throw new Error("player-not-found");
    }
    if (!sellerSnapshot.exists) {
      throw new Error("seller-not-found");
    }

    const playerProfile = playerSnapshot.data() || {};
    const sellerProfile = sellerSnapshot.data() || {};
    const playerCoins = Number(playerProfile.coins) || 0;
    const sellerCoins = Number(sellerProfile.coins) || 0;

    if (playerCoins < safeAmount) {
      throw new Error("insufficient-player-coins");
    }

    const nextPlayerCoins = playerCoins - safeAmount;
    const nextSellerCoins = sellerCoins + safeAmount;

    transaction.update(playerRef, {
      coins: nextPlayerCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(sellerRef, {
      coins: nextSellerCoins,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(historyRef, {
      playerUid: user.uid,
      playerUsername: String(playerProfile.username || user.displayName || "").trim() || "Jwe",
      sellerUid,
      sellerUsername: String(sellerProfile.username || "").trim() || "Vendeur",
      amount: safeAmount,
      playerBeforeCoins: playerCoins,
      playerAfterCoins: nextPlayerCoins,
      sellerBeforeCoins: sellerCoins,
      sellerAfterCoins: nextSellerCoins,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    return {
      amount: safeAmount,
      playerCoins: nextPlayerCoins,
      sellerCoins: nextSellerCoins,
      sellerUsername: String(sellerProfile.username || "").trim() || "Vendeur",
    };
  });
}

export async function loadVendorTransactions({ vendorUid, limitCount = 5, lastDoc = null }) {
  const { db } = await initFirebaseClient();

  if (!vendorUid) {
    throw new Error("missing-vendor");
  }

  let query = db
    .collection("vendorTransactions")
    .where("vendorUid", "==", vendorUid)
    .orderBy("createdAt", "desc")
    .limit(Math.max(1, Number(limitCount) || 5) + 1);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const safeLimit = Math.max(1, Number(limitCount) || 5);
  const hasMore = docs.length > safeLimit;
  const visibleDocs = hasMore ? docs.slice(0, safeLimit) : docs;

  return {
    items: visibleDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
    hasMore,
    lastDoc: visibleDocs.length ? visibleDocs[visibleDocs.length - 1] : lastDoc,
  };
}

function getTimestampMs(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

export async function loadUserTransferHistory(uid, limitCount = 12) {
  const { db } = await initFirebaseClient();
  if (!uid) {
    throw new Error("missing-user");
  }

  const [receivedFromVendors, sentToVendors, vendorSent, vendorReceived] = await Promise.all([
    db.collection("vendorTransactions").where("targetUid", "==", uid).get(),
    db.collection("coinSellTransactions").where("playerUid", "==", uid).get(),
    db.collection("vendorTransactions").where("vendorUid", "==", uid).get(),
    db.collection("coinSellTransactions").where("sellerUid", "==", uid).get(),
  ]);

  const items = [
    ...receivedFromVendors.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        type: "received-from-vendor",
        direction: "received",
        amount: Number(data.amount) || 0,
        partyName: data.vendorUsername || "Vendeur",
        beforeCoins: Number(data.beforeCoins) || 0,
        afterCoins: Number(data.afterCoins) || 0,
        createdAt: data.createdAt || null,
        createdAtMs: getTimestampMs(data.createdAt),
      };
    }),
    ...sentToVendors.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        type: "sent-to-vendor",
        direction: "sent",
        amount: Number(data.amount) || 0,
        partyName: data.sellerUsername || "Vendeur",
        beforeCoins: Number(data.playerBeforeCoins) || 0,
        afterCoins: Number(data.playerAfterCoins) || 0,
        createdAt: data.createdAt || null,
        createdAtMs: getTimestampMs(data.createdAt),
      };
    }),
    ...vendorSent.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        type: "vendor-sent",
        direction: "sent",
        amount: Number(data.amount) || 0,
        partyName: data.targetUsername || "Joueur",
        beforeCoins: Number(data.vendorBeforeCoins) || 0,
        afterCoins: Number(data.vendorAfterCoins) || 0,
        createdAt: data.createdAt || null,
        createdAtMs: getTimestampMs(data.createdAt),
      };
    }),
    ...vendorReceived.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        type: "vendor-received",
        direction: "received",
        amount: Number(data.amount) || 0,
        partyName: data.playerUsername || "Joueur",
        beforeCoins: Number(data.sellerBeforeCoins) || 0,
        afterCoins: Number(data.sellerAfterCoins) || 0,
        createdAt: data.createdAt || null,
        createdAtMs: getTimestampMs(data.createdAt),
      };
    }),
  ];

  return items
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, Math.max(1, Number(limitCount) || 12));
}

export async function loadShopDirectoryContacts() {
  const { db } = await initFirebaseClient();
  const snapshot = await db.collection("shopDirectory").where("isVerified", "==", true).get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((left, right) => {
      const leftTime = left.updatedAt?.toMillis instanceof Function ? left.updatedAt.toMillis() : 0;
      const rightTime = right.updatedAt?.toMillis instanceof Function ? right.updatedAt.toMillis() : 0;
      return rightTime - leftTime;
    });
}

export async function loadUserCoinSellHistory({ uid, limitCount = 3, lastDoc = null }) {
  const { db } = await initFirebaseClient();
  if (!uid) {
    throw new Error("missing-user");
  }

  let query = db
    .collection("coinSellTransactions")
    .where("playerUid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(Math.max(1, Number(limitCount) || 3) + 1);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const safeLimit = Math.max(1, Number(limitCount) || 3);
  const hasMore = docs.length > safeLimit;
  const visibleDocs = hasMore ? docs.slice(0, safeLimit) : docs;

  return {
    items: visibleDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
    hasMore,
    lastDoc: visibleDocs.length ? visibleDocs[visibleDocs.length - 1] : lastDoc,
  };
}
