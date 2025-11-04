import { RTC_CONFIG, getAthenaBase, DEFAULT_CHARACTER, VISA_PROFILE, getClientId } from "./config.js";
import { DC } from "./dc.js";

/** Debug toggles */
const DEBUG_MEDIA_PROBE = false;
const DEBUG_VIDEO_EVENTS = false;

// ===== DOM refs =====
const statusEl = document.getElementById("status");
const overlay = document.getElementById('loadingOverlay');
const logEl = document.getElementById("log");
const pill = document.getElementById("statePill");
const stateBadge = document.getElementById("stateBadge");
const turnBadge = document.getElementById("turnBadge");

const transcriptFinalEl = document.getElementById("final_text");
const transcriptInterimEl = document.getElementById("interim_text");

const avatarVideo = document.getElementById("avatarVideo");
const overlayVideo = document.getElementById("overlayVideo");
const videoStatus = document.getElementById("videoStatus");
const replyTextEl = document.getElementById("characterReplyText");

const reportCardEl = document.getElementById("reportCard");
const reportStatusText = document.getElementById("reportStatusText");
const reportProgressFill = document.getElementById("reportProgressFill");
const reportProgressRing = document.getElementById("reportProgressRing");
const reportProgressLabel = document.getElementById("reportProgressLabel");
const reportProgressInfo = document.getElementById("reportProgressInfo");
const reportResultEl = document.getElementById("reportResult");
const reportSummaryEl = document.getElementById("reportSummary");
const reportSectionsEl = document.getElementById("reportSections");
const reportRecordingsEl = document.getElementById("reportRecordings");

const btnConnect = document.getElementById("btnConnect");
const btnMicOn = document.getElementById("btnMicOn");
const btnMicOff = document.getElementById("btnMicOff");
const btnBye = document.getElementById("btnBye");
const sessionTimerEl = document.getElementById("sessionTimer");

// ===== Audio visualization state =====
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const sensitivitySlider = document.getElementById('sensitivity');
const sensValue = document.getElementById('sensValue');

let audioCtx;
let analyser = null;
let dataArray = null;
let sensitivity = 1.0;
let currentState = "unknown";

// ===== Session timer state =====
let sessionStartTime = null;
let timerInterval = null;

// ===== WebRTC state =====
let pc = null;
let dc = null;
let dcClient = null;
let localStream = null;
let remoteStream = null;
let audioSender = null;
let videoSender = null;
let clientId = null;
let sessionId = null;

let overlayClipId = null;
let overlayTimeout = null;
let overlayMediaToken = null;

let lastSttIdx = -1;
let interimBuffer = "";

const reportState = {
  progress: 0,
  data: null,
};

const REPORT_DEFAULT_INFO = "Awaiting report generation…";
const REPORT_STORAGE_KEY = "voyage_latest_report";
let reportRedirectTimer = null;
let reportCompleteHandled = false;

// ===== Dynamic configuration from query params =====
const urlParams = new URLSearchParams(window.location.search);

const BEND_URL = urlParams.get("bend_url") || getAthenaBase();
const FEND_URL = urlParams.get("fend_url") || window.location.origin;
let VISA_PROFILE_Q;
try {
  const visaParam = urlParams.get("visa_profile");
  VISA_PROFILE_Q = visaParam ? JSON.parse(visaParam) : VISA_PROFILE;
} catch (err) {
  console.warn("Invalid visa_profile JSON in query params:", err);
  VISA_PROFILE_Q = VISA_PROFILE;
}
const CHARACTER_Q = urlParams.get("character") || DEFAULT_CHARACTER;
const GIF_LINK_Q = urlParams.get("gif_link") || 'https://novawebbusiness.com/wp-content/uploads/2022/12/Wow-gif.gif';

function getDynamicAthenaBase() {
  return BEND_URL?.trim().replace(/\/$/, "");
}

const ACTIVE_CHARACTER = CHARACTER_Q;
const ACTIVE_VISA_PROFILE = VISA_PROFILE_Q;

const apiAthenaInput = document.getElementById("apiAthena");
if (apiAthenaInput && BEND_URL) {
  apiAthenaInput.value = BEND_URL;
}

console.log("[Config] Loaded from query:", {
  bend_url: BEND_URL,
  fend_url: FEND_URL,
  visa_profile: ACTIVE_VISA_PROFILE,
  character: ACTIVE_CHARACTER,
  gif_link: GIF_LINK_Q
});

// ===== Audio Visualization Functions =====
if (sensitivitySlider) {
  sensitivitySlider.addEventListener('input', () => {
    sensitivity = parseFloat(sensitivitySlider.value);
    if (sensValue) sensValue.textContent = sensitivity.toFixed(1);
  });
}

let currentAudioSource = null;
async function setupAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!analyser) {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  // Connect to localStream if available
  if (localStream) {
    try {
      const source = audioCtx.createMediaStreamSource(localStream);
      source.connect(analyser);
      log("[audio viz] Connected to RTC localStream");
      draw();
    } catch (err) {
      log(`[audio viz] Failed to connect to localStream: ${err.message}`, "warn");
    }
  }
}

let lastBeat = 0;
function detectBeat() {
  const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const energy = avg / 128.0;
  const now = Date.now();
  if (energy > 1.2 * sensitivity && now - lastBeat > 300) {
    lastBeat = now;
    return true;
  }
  return false;
}

function draw() {
  requestAnimationFrame(draw);
  if (!analyser || !dataArray) return;

  analyser.getByteTimeDomainData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bufferLength = dataArray.length;
  const centerY = canvas.height / 2;

  const isBeat = detectBeat();

  const lineConfigs = [
    { color: '#1db954', freq: 0.5, amp: 1.0 },
    { color: '#00d9ff', freq: 1.0, amp: 0.8 },
    { color: '#ff0044', freq: 1.5, amp: 0.6 }
  ];

  lineConfigs.forEach(cfg => {
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = cfg.color;
    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const beatBoost = isBeat ? 1.5 : 1.0;
      const y = centerY + (v - 1) * 40 * cfg.amp * sensitivity * beatBoost * Math.sin(i * 0.01 * cfg.freq);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  });

  if (isBeat) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function createThreeDotAnimation() {
  const container = document.createElement('center');
  container.id = 'threeDotsLoader';
  container.style.cssText = `
    position: fixed;
    bottom: 85px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
    display: none;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #threeDotsLoader {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
    }
    
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffffff;
      opacity: 0.6;
      box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
      transform: scale(0.85);
      transition: 
        background 0.45s ease,
        transform 0.45s ease,
        opacity 0.45s ease,
        box-shadow 0.45s ease;
    }

    .dot.active {
     background: #ffffff;
      
      background-blend-mode: overlay;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
      transform: scale(1.2);
      opacity: 1;
    }

    @keyframes bounceSync {
      0%, 80%, 100% {
        transform: scale(0.85);
        opacity: 0.6;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }
  `;

  document.head.appendChild(style);

  container.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  document.body.appendChild(container);

  const dots = container.querySelectorAll('.dot');
  let activeIndex = 0;

  function updateDots() {
    dots.forEach((dot, i) => {
      if (i === activeIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
    activeIndex = (activeIndex + 1) % dots.length;
  }

  setInterval(updateDots, 450);

  return container;
}

let threeDotsLoader = null;

function showThreeDots() {
  if (!threeDotsLoader) {
    threeDotsLoader = createThreeDotAnimation();
  }
  threeDotsLoader.style.display = 'flex';
}

function hideThreeDots() {
  if (threeDotsLoader) {
    threeDotsLoader.style.display = 'none';
  }
}

// ===== utils =====
function extractTokenFromUrl(url) {
  try {
    const u = new URL(url, location.origin);
    const last = (u.pathname.split("/").pop() || "");
    return last.split(".")[0] || null;
  } catch { return null; }
}

function log(line, cls) {
  const time = new Date().toLocaleTimeString();
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = `[${time}] ${line}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function setPill(text, cls = "warn") {
  pill.textContent = text;
  pill.className = `pill ${cls}`;
}

function setStateBadge(state) {
  const normalized = (state || "unknown").toLowerCase();
  const variant = ["listening", "thinking", "speaking"].includes(normalized) ? normalized : "unknown";
  const clsMap = { listening: "ok", thinking: "warn", speaking: "info", unknown: "warn" };
  stateBadge.textContent = `state: ${variant}`;
  stateBadge.className = `pill ${clsMap[variant] || ""}`.trim();
}

function applyStateUpdate(state) {
  if (typeof state !== "string") return;
  setStateBadge(state);

  const s = state.toLowerCase();
  currentState = s;

  if (s === "thinking") {
    setVideoStatus("", false);
    replyTextEl.textContent = "Thinking";
    showVideoLoadingGif();
    showThreeDots();
    canvas.style.display = 'none';

  }
  else if (s === "speaking") {
    setVideoStatus("", false);
    replyTextEl.textContent = "Speaking";
    hideThreeDots();
    sensitivity = 0.0;
    canvas.style.display = 'flex';

  }
  else if (s === "listening") {
    setVideoStatus("", false);
    replyTextEl.textContent = "Listening";
    hideThreeDots();
    //here here
    sensitivity = 2.0;
    canvas.style.display = 'flex';
  }
}

function setTurnBadge(text) {
  turnBadge.textContent = `turn: ${text}`;
  turnBadge.className = "pill";
}

function setVideoStatus(text, show = true) {
  if (!videoStatus) return;
  videoStatus.textContent = text || "";
  videoStatus.classList.toggle("hidden", !show);
}

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  const base = (getAthenaBase() || "").trim();
  if (!base) return path;
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  if (path.startsWith("/")) return `${normalized}${path}`;
  return `${normalized}/${path}`;
}

function clamp(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function startSessionTimer() {
  if (timerInterval) return;
  sessionStartTime = Date.now();
  if (sessionTimerEl) sessionTimerEl.style.display = 'flex';

  timerInterval = setInterval(() => {
    if (!sessionStartTime) return;
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    if (sessionTimerEl) {
      sessionTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

function stopSessionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  sessionStartTime = null;
  if (sessionTimerEl) {
    sessionTimerEl.style.display = 'none';
    sessionTimerEl.textContent = '00:00';
  }
}

function resetReportUI({ keepStatus = false } = {}) {
  if (reportRedirectTimer) {
    clearTimeout(reportRedirectTimer);
    reportRedirectTimer = null;
  }
  reportState.progress = 0;
  reportState.data = null;
  if (reportProgressFill) reportProgressFill.style.width = "0%";
  if (reportProgressRing) reportProgressRing.setAttribute("stroke-dasharray", "0, 100");
  if (reportProgressLabel) reportProgressLabel.textContent = "0%";
  if (reportProgressInfo) reportProgressInfo.textContent = REPORT_DEFAULT_INFO;
  if (!keepStatus && reportStatusText) reportStatusText.textContent = "Report not requested yet.";
  if (reportResultEl) reportResultEl.classList.add("is-hidden");
  if (reportSummaryEl) reportSummaryEl.innerHTML = "";
  if (reportSectionsEl) reportSectionsEl.innerHTML = "";
  if (reportRecordingsEl) reportRecordingsEl.innerHTML = "";
}

function updateReportProgress(progress, info = "") {
  if (!reportCardEl) return;

  reportCardEl.style.display = 'flex';
  const safeProgress = clamp(progress, 0, 100);
  reportState.progress = safeProgress;
  const infoText = (info || "").toString().trim() || REPORT_DEFAULT_INFO;

  if (reportProgressFill) reportProgressFill.style.width = `${safeProgress}%`;
  if (reportProgressRing) {
    const dash = `${safeProgress}, 100`;
    reportProgressRing.setAttribute("stroke-dasharray", dash);
  }
  if (reportProgressLabel) reportProgressLabel.textContent = `${safeProgress.toFixed(0)}%`;
  if (reportProgressInfo) reportProgressInfo.textContent = infoText;

  if (reportStatusText) {
    if (safeProgress >= 100) {
      reportStatusText.textContent = reportState.data ? "Report ready" : "Finalizing report…";
    } else if (safeProgress > 0) {
      reportStatusText.textContent = "Generating interview report…";
    }
    else reportStatusText.textContent = "Report not requested yet.";
  }
}

function isNgrokUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes("ngrok");
  } catch { return false; }
}

async function fetchVideoAsBlob(url) {
  const headers = {};
  if (isNgrokUrl(url)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  const res = await fetch(url, { headers, mode: "cors", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (ctype.includes("text/html")) {
    throw new Error(`ngrok warning page (content-type ${ctype})`);
  }
  return await res.blob();
}

async function probeMedia(url) {
  if (!DEBUG_MEDIA_PROBE) return;
  try {
    const headers = {};
    if (isNgrokUrl(url)) headers["ngrok-skip-browser-warning"] = "true";
    log(`[probe] ${url}`);
    const res = await fetch(url, { headers, mode: "cors", cache: "no-store" });
    log(`[probe] status=${res.status} (${res.statusText || ""})`);
    const ct = res.headers.get("content-type") || "(n/a)";
    const ar = res.headers.get("accept-ranges") || "(n/a)";
    const cl = res.headers.get("content-length") || "(n/a)";
    const server = res.headers.get("server") || "(n/a)";
    const cache = res.headers.get("cache-control") || "(n/a)";
    log(`[probe] content-type=${ct} accept-ranges=${ar} content-length=${cl} cache=${cache} server=${server}`);
    try { res.body?.cancel?.(); } catch { }
    if (ct && !ct.startsWith("video/") && ct !== "application/octet-stream") {
      log("[media] WARNING: content-type looks non-video: " + ct);
    }
    if (ar !== "bytes") {
      log('[media] NOTE: accept-ranges is not "bytes" — some browsers prefer ranged playback');
    }
  } catch (e) {
    log(`[probe] failed: ${e.message}`, "warn");
  }
}

function createVideoLoadingOverlay() {
  let loadingOverlay = document.querySelector('.video-loading-overlay');
  if (loadingOverlay) return loadingOverlay;

  loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'video-loading-overlay';

  const gifImg = document.createElement('img');
  gifImg.className = 'video-loading-gif';
  gifImg.src = GIF_LINK_Q;
  gifImg.alt = 'Loading...';

  loadingOverlay.appendChild(gifImg);

  const videoShell = document.querySelector('.video-shell');
  if (videoShell) {
    videoShell.appendChild(loadingOverlay);
  }

  return loadingOverlay;
}

function showVideoLoadingGif() {
  const overlay = createVideoLoadingOverlay();
  overlay.classList.remove('hidden');
  log('[loading] Showing GIF');
}

function hideVideoLoadingGif() {
  const overlay = document.querySelector('.video-loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    log('[loading] Hiding GIF - video ready');
  }
}

function ensureGifVisible() {
  const overlay = createVideoLoadingOverlay();
  overlay.classList.remove('hidden');
}

function clearOverlay() {
  if (!overlayVideo) return;
  overlayClipId = null;
  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
    overlayTimeout = null;
  }
  try { overlayVideo.pause(); } catch { }
  if (overlayVideo.dataset.objectUrl) {
    try { URL.revokeObjectURL(overlayVideo.dataset.objectUrl); } catch { }
    delete overlayVideo.dataset.objectUrl;
  }
  delete overlayVideo.dataset.mediaToken;
  overlayMediaToken = null;
  overlayVideo.removeAttribute("src");
  overlayVideo.load();
  overlayVideo.classList.remove("active");

  showVideoLoadingGif();
}

function scheduleOverlayTeardown(durationMs) {
  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
    overlayTimeout = null;
  }
  if (durationMs > 0) {
    overlayTimeout = window.setTimeout(() => {
      clearOverlay();
    }, durationMs);
  }
}

async function playOverlayClip(payload) {
  if (!overlayVideo) return;
  const url = resolveMediaUrl(payload?.url);
  if (!url) return;

  if (overlayClipId && overlayClipId !== (payload?.clip_id || null)) {
    clearOverlay();
  }

  overlayClipId = payload?.clip_id || null;
  const tokenFromPayload = payload?.media_token || payload?.extras?.media_token || null;
  overlayMediaToken = tokenFromPayload || extractTokenFromUrl(url);
  if (overlayMediaToken) overlayVideo.dataset.mediaToken = overlayMediaToken;

  ensureGifVisible();

  {
    const pageIsHttps = window.isSecureContext || location.protocol === "https:";
    log(`[diag] page.origin=${location.origin} secure=${window.isSecureContext} pageIsHttps=${pageIsHttps}`);
    const base = (getAthenaBase() || "").trim();
    if (base) {
      try {
        const u = new URL(base);
        log(`[diag] athenaBase=${base}`);
        log(`[diag] athenaBase.origin=${u.origin} protocol=${u.protocol}`);
      } catch {
        log(`[diag] athenaBase=${base}`);
      }
    }
  }

  if (DEBUG_MEDIA_PROBE) await probeMedia(url);

  overlayVideo.muted = false;
  overlayVideo.classList.add("active");

  try {
    const blob = await fetchVideoAsBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    overlayVideo.src = objectUrl;
    overlayVideo.dataset.objectUrl = objectUrl;
  } catch (e) {
    log(`[media] ngrok fetch bypass failed: ${e.message}`, "warn");
    overlayVideo.src = url;
  }

  overlayVideo.currentTime = 0;

  const promise = overlayVideo.play();

  if (promise && typeof promise.then === "function") {
    promise
      .then(() => {
        setVideoStatus("", false);
        hideVideoLoadingGif();
      })
      .catch((err) => {
        log(`Overlay playback blocked: ${err?.message || err}`, "warn");
        setVideoStatus("Tap to play response", true);
        ensureGifVisible();
      });
  }
}

function stopOverlayClip(payload) {
  const clipId = payload?.clip_id;
  if (clipId && overlayClipId && clipId !== overlayClipId) return;
  clearOverlay();
}

function handleMedia(data) {
  const status = (data?.status || "").toLowerCase();
  if (status === "start") {
    log(`[media] start clip id=${data?.clip_id || "(none)"} url=${resolveMediaUrl(data?.url)}`);
    playOverlayClip(data);
  } else if (status === "stop") {
    stopOverlayClip(data);
  }
}

function clearMedia() {
  clearOverlay();

  try { avatarVideo.pause(); } catch { }
  avatarVideo.srcObject = null;
  avatarVideo.removeAttribute("src");
  avatarVideo.load();

  remoteStream = null;
  setVideoStatus("Waiting for connection…", true);

  ensureGifVisible();
}

function setUIConnected(connected) {
  btnConnect.disabled = connected;
  btnMicOn.disabled = !connected;
  btnMicOff.disabled = !connected;
  btnBye.disabled = !connected;
  overlay.style.display = 'none';

  setPill(connected ? "connected" : "disconnected", connected ? "ok" : "warn");
  statusEl.textContent = connected
    ? "Connected. Use Mic ON/Mic OFF to record server-side."
    : "Idle.";

  if (!connected) {
    transcriptFinalEl.textContent = "";
    transcriptInterimEl.textContent = "";
    interimBuffer = "";
    lastSttIdx = -1;
    setStateBadge("unknown");
    setTurnBadge("—");
    replyTextEl.textContent = "Waiting for Athena…";
    hideThreeDots();
    showThreeDots();
    resetReportUI();
    clearMedia();
    showVideoLoadingGif();
  } else {
    try { sessionStorage.removeItem(REPORT_STORAGE_KEY); } catch { }
    resetReportUI();
    reportCompleteHandled = false;
    setVideoStatus("Ready. Start speaking or wait for Athena…", true);
    showVideoLoadingGif();
    micOn();
  }
}

function waitForIceGatheringComplete(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    function check() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", check);
  });
}

function rs(v) {
  const map = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
  return map[v?.readyState ?? 0] || `HAVE_${v?.readyState}`;
}

function ns(v) {
  const map = ["NETWORK_EMPTY", "NETWORK_IDLE", "NETWORK_LOADING", "NETWORK_NO_SOURCE"];
  return map[v?.networkState ?? 0] || `NETWORK_${v?.networkState}`;
}

function wireVideoDiagnostics(el, label) {
  if (!DEBUG_VIDEO_EVENTS || !el) return;
  const events = [
    "loadstart", "waiting", "loadedmetadata", "loadeddata", "canplay", "canplaythrough", "playing", "pause", "ended", "error",
    "suspend", "stalled", "progress", "timeupdate", "emptied", "abort", "seeking", "seeked", "ratechange", "durationchange"
  ];
  for (const ev of events) {
    el.addEventListener(ev, () => {
      const src = el.currentSrc || el.src || "(none)";
      log(`[video:${label}] event=${ev} src=${src} net=${ns(el)} ready=${rs(el)}`);
      if (ev === "error") {
        const code = el.error?.code;
        const codes = { 1: "MEDIA_ERR_ABORTED", 2: "MEDIA_ERR_NETWORK", 3: "MEDIA_ERR_DECODE", 4: "SRC_NOT_SUPPORTED" };
        log(`[video:${label}] error code=${code} ${codes[code] || ""}`);
      }
    });
  }
}

wireVideoDiagnostics(avatarVideo, "avatar");
wireVideoDiagnostics(overlayVideo, "overlay");

if (overlayVideo) {
  overlayVideo.addEventListener('loadstart', () => {
    ensureGifVisible();
    log('[video:overlay] loadstart - ensuring GIF visible');
  });

  overlayVideo.addEventListener('canplay', () => {
    log('[video:overlay] canplay - video ready but keeping GIF until playing');
  });

  overlayVideo.addEventListener('playing', () => {
    hideVideoLoadingGif();
    log('[video:overlay] playing - hiding GIF');
  });

  overlayVideo.addEventListener('waiting', () => {
    showVideoLoadingGif();
    log('[video:overlay] waiting (buffering) - showing GIF');
  });

  overlayVideo.addEventListener('pause', () => {
    showVideoLoadingGif();
    log('[video:overlay] paused - showing GIF');
  });

  overlayVideo.addEventListener("ended", () => {
    const token = overlayVideo.dataset.mediaToken || overlayMediaToken;
    if (token) {
      try { dcClient?.send("media:completed", { media_token: token }); } catch { }
      log(`[media] completed (sent) token=${token}`);
    } else {
      log("[media] ended but no token to report", "warn");
    }

    showVideoLoadingGif();

    if (overlayClipId) stopOverlayClip({ clip_id: overlayClipId });
    else clearOverlay();
  });

  overlayVideo.addEventListener("error", () => {
    log("Overlay playback error", "err");
    showVideoLoadingGif();
    clearOverlay();
    setVideoStatus("Media playback error", true);
  });
}

if (avatarVideo) {
  avatarVideo.addEventListener('loadstart', () => {
    ensureGifVisible();
    log('[video:avatar] loadstart - ensuring GIF visible');
  });

  avatarVideo.addEventListener('canplay', () => {
    log('[video:avatar] canplay - video ready but keeping GIF until playing');
  });

  avatarVideo.addEventListener('playing', () => {
    hideVideoLoadingGif();
    log('[video:avatar] playing - hiding GIF');
  });

  avatarVideo.addEventListener('waiting', () => {
    showVideoLoadingGif();
    log('[video:avatar] waiting (buffering) - showing GIF');
  });

  avatarVideo.addEventListener('pause', () => {
    showVideoLoadingGif();
    log('[video:avatar] paused - showing GIF');
  });

  avatarVideo.addEventListener('ended', () => {
    showVideoLoadingGif();
    log('[video:avatar] ended - showing GIF');
  });

  avatarVideo.addEventListener('error', () => {
    showVideoLoadingGif();
    log('[video:avatar] error - showing GIF');
  });
}

async function connect() {
  try {
    overlay.style.display = 'flex';
    statusEl.textContent = "Connecting";
    showThreeDots();
    log("Creating RTCPeerConnection…");

    pc = new RTCPeerConnection(RTC_CONFIG);

    pc.oniceconnectionstatechange = () => log(`ice: ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () => {
      log(`pc.connectionState = ${pc.connectionState}`);
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        setUIConnected(false);
      }
    };

    dc = pc.createDataChannel("control");
    dcClient = new DC(dc, {
      onOpen: () => log("DataChannel open"),
      onClose: () => log("DataChannel closed"),
      onState: (s) => applyStateUpdate(s),
      onSTT: (kind, idx, text) => handleStt(kind, idx, text),
      onLLM: (t) => { replyTextEl.textContent = 'Speaking'; },
      onLog: (data) => handleLog(data),
      onMedia: (payload) => handleMedia(payload),
      onReportProgress: (payload) => handleReportProgress(payload),
      onReportComplete: (payload) => handleReportComplete(payload),
      onError: (msg) => log(`Server error: ${msg}`, "err"),
    });

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { width: 640, height: 360, frameRate: 30 },
    });

    // Setup audio visualization with localStream
    setupAudio();

    const localRender = document.getElementById("localRender");
    if (localRender) {
      localRender.srcObject = localStream;
      localRender.muted = true;
      localRender.play().catch(() => console.warn("Local video autoplay blocked"));
    }

    const localAudioTrack = localStream.getAudioTracks()[0] || null;
    const localVideoTrack = localStream.getVideoTracks()[0] || null;

    if (localAudioTrack) {
      audioSender = pc.addTrack(localAudioTrack, localStream);
      log("[local] added audio track");
    } else {
      log("[local] no audio track found", "warn");
    }

    if (localVideoTrack) {
      videoSender = pc.addTrack(localVideoTrack, localStream);
      log("[local] added video track");
    } else {
      log("[local] no video track found", "warn");
    }

    remoteStream = new MediaStream();
    avatarVideo.srcObject = remoteStream;
    avatarVideo.muted = true;

    pc.ontrack = (ev) => {
      remoteStream.addTrack(ev.track);
      log(`[ontrack] ${ev.track.kind}`);
      if (ev.track.kind === "video") {
        ensureGifVisible();

        const p = avatarVideo.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            setVideoStatus("", false);
            hideVideoLoadingGif();
          })
            .catch(() => {
              setVideoStatus("Tap to play video", true);
              ensureGifVisible();
            });
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    clientId = clientId || getClientId();

    const res = await fetch(`${getDynamicAthenaBase()}/api/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
        character: ACTIVE_CHARACTER,
        visa_profile: ACTIVE_VISA_PROFILE,
        client_id: clientId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Offer failed: ${res.status} ${text}`);
    }

    const payload = await res.json();
    if (!payload || typeof payload !== "object") throw new Error("Offer failed: Invalid JSON response");
    if (payload.success === false) throw new Error(`Offer failed: ${payload.message || "backend error"}`);

    const answerData = (payload.data && typeof payload.data === "object") ? payload.data : {};
    const { sdp, type, client_id: idFromServer, session_id: sid } = answerData;
    if (!sdp || !type) throw new Error("Offer failed: Missing SDP in response");

    if (typeof idFromServer === "string" && idFromServer) clientId = idFromServer;
    if (typeof sid === "string" && sid) sessionId = sid;
    await pc.setRemoteDescription({ sdp, type });

    setUIConnected(true);
    log(`Handshake complete. client_id=${clientId || "(n/a)"} session_id=${sessionId || "(n/a)"}`);
    log("You may toggle mic.");
    startSessionTimer();
    await new Promise(resolve => setTimeout(resolve, 2000)); micOff();
    micOn();
  } catch (err) {
    console.error(err);
    log("ERROR: " + (err?.message || err), "err");
    statusEl.textContent = "Connection error.";
    setUIConnected(false);
  }
}

async function micOn() {
  try {
    if (!pc) return;

    if (!localStream || !localStream.getVideoTracks().length) {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: 640, height: 360, frameRate: 30 },
      });
      // Setup audio visualization when getting new stream
      setupAudio();
    } else if (!localStream.getAudioTracks().length) {
      const audioOnly = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      localStream.addTrack(audioOnly.getAudioTracks()[0]);
      // Setup audio visualization when adding audio track
      setupAudio();
    }

    const track = localStream.getAudioTracks()[0];
    if (!audioSender) {
      audioSender = pc.addTrack(track, localStream);
    } else {
      await audioSender.replaceTrack(track);
    }

    dcClient?.send("mic:on");
    btnMicOn.style.display = 'none';
    btnMicOff.style.display = 'flex';
    setTurnBadge("—");
    showVideoLoadingGif();
    log("Mic ON → sending audio, notified server.");
  } catch (err) {
    console.error(err);
    log("Mic ON error: " + err.message, "err");
  }
}

async function micOff() {
  try {
    if (!pc) return;
    dcClient?.send("mic:off");

    if (localStream) {
      for (const t of localStream.getAudioTracks()) t.stop();
      localStream.getAudioTracks().forEach(t => localStream.removeTrack(t));
    }
    if (audioSender) {
      await audioSender.replaceTrack(null);
    }

    showVideoLoadingGif();
    log("Mic OFF → stopped local audio, told server to finalize WAV. (Video stays on.)");
    btnMicOn.style.display = 'flex';
    btnMicOff.style.display = 'none';
  } catch (err) {
    console.error(err);
    log("Mic OFF error: " + err.message, "err");
  }
}

async function bye(disconnect = true) {
  try { dcClient?.send("bye"); } catch { }
  try {
    if (localStream) {
      for (const t of localStream.getTracks()) t.stop();
      localStream = null;
    }
    if (audioSender) { try { await audioSender.replaceTrack(null); } catch { } audioSender = null; }
    if (videoSender) { try { await videoSender.replaceTrack(null); } catch { } videoSender = null; }
    await pc?.close();
  } catch { }
  pc = null; dc = null; dcClient = null;
  sessionId = null;
  hideThreeDots();
  clearMedia();
  setUIConnected(false);
  stopSessionTimer();
  if (disconnect) {
    window.location.href = "./bye.html";
  }
  log("Closed connection.");
}

function handleStt(kind, idx, text) {
  if (Number.isInteger(idx)) {
    if (idx <= lastSttIdx) return;
    lastSttIdx = idx;
  }
  const piece = text.trim();

  if (kind === "final") {
    if (interimBuffer) {
      transcriptFinalEl.textContent += (transcriptFinalEl.textContent ? " " : "") + interimBuffer.trim();
      interimBuffer = "";
      transcriptInterimEl.textContent = "";
    }
    if (piece) {
      transcriptFinalEl.textContent += (transcriptFinalEl.textContent ? " " : "") + piece;
    }
    setTurnBadge("final");
    return;
  }

  if (!piece) return;
  interimBuffer += (interimBuffer ? " " : "") + piece;
  transcriptInterimEl.textContent = interimBuffer;
  setTurnBadge("interim…");
}

function handleLog(data) {
  if (data?.stt?.status === "flushed") {
    log("STT finished (flushed).");
    lastSttIdx = -1;
    interimBuffer = "";
    transcriptInterimEl.textContent = "";
  }
  if (data?.turn && typeof data.turn.final_idx !== "undefined") {
    interimBuffer = "";
    transcriptInterimEl.textContent = "";
    setTurnBadge("final ✓");
  }
}

function handleReportProgress(data) {
  if (!data) return;

  reportCardEl.style.display = 'flex';
  const rawProgress = Number(data.progress);
  const infoText = (data.info || "").toString();

  const progressIsValid = Number.isFinite(rawProgress);
  if (progressIsValid) {
    const normalized = clamp(rawProgress, 0, 100);
    const restart = reportState.progress > 0 && normalized < reportState.progress && normalized <= 25;
    if (restart || (reportState.data && normalized < reportState.progress)) {
      resetReportUI({ keepStatus: false });
    }
    const nextProgress = restart ? normalized : Math.max(reportState.progress, normalized);
    reportCardEl.style.display = 'flex';
    updateReportProgress(nextProgress, infoText);
    log(`[report] progress ${nextProgress.toFixed(0)}%${infoText ? ` - ${infoText}` : ""}`);
  } else if (infoText) {
    if (reportProgressInfo) reportProgressInfo.textContent = infoText;
    log(`[report] ${infoText}`);
  }
}

function handleReportComplete(data) {
  log("[report] complete");

  console.log(data);
  if (reportCompleteHandled) return;
  reportCompleteHandled = true;

  const finalPayload = data || {};
  reportState.data = finalPayload;
  updateReportProgress(100, "Report ready.");

  try {
    const cache = {
      generatedAt: new Date().toISOString(),
      report: finalPayload,
    };
    sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    log(`[report] failed to cache report: ${err?.message || err}`, "warn");
  }

  const finalizeRedirect = () => {
    reportState.data = finalPayload;
    updateReportProgress(100, "Report ready. Redirecting to report viewer…");
    if (reportStatusText) reportStatusText.textContent = "Report ready – redirecting…";
    if (reportProgressInfo) reportProgressInfo.textContent = "Opening detailed report…";

    if (!reportRedirectTimer) {
      reportRedirectTimer = window.setTimeout(() => {
        window.location.href = "./report.html";
      }, 700);
    }
  };

  try {
    const result = bye(false);
    if (result && typeof result.then === "function") {
      result.catch(() => { }).finally(finalizeRedirect);
      return;
    }
  } catch {
    // swallow errors and continue
  }

  finalizeRedirect();
}

btnConnect.addEventListener("click", connect);
btnMicOn.addEventListener("click", micOn);
btnMicOff.addEventListener("click", micOff);
btnBye.addEventListener("click", bye);

window.addEventListener("beforeunload", () => {
  try { dcClient?.send("bye"); } catch { }
});

window.addEventListener('DOMContentLoaded', () => {
  ensureGifVisible();
});

connect();