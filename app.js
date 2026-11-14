(() => {
  "use strict";
  const KEY = "focuslearn.v1";
  const DB_NAME = "focuslearn_db";
  const DB_VERSION = 2;
  const STORE_PICS = "pictures";
  const STORE_DOCS = "documents";

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  let state = load(), currentCourseId = null, currentLessonId = null, toastTimer;
  let timerRunning = false, timerStartedAt = 0, timerElapsedBeforeStart = 0, timerInterval = null;

  // Pictures state
  let picturesList = [];
  let currentViewingPicId = null;
  let editingPicId = null;
  let stagedImageData = null; // { dataUrl, width, height, sizeBytes, originalName }
  const picFilterState = {
    search: "",
    category: "",
    courseId: "",
    sort: "newest"
  };

  // Documents (Notes & PDFs) state
  let docsList = [];
  let currentViewingNoteId = null;
  let currentViewingPdfId = null;
  let currentPdfBlobUrl = null;
  let editingDocId = null;
  let stagedPdfData = null; // { pdfData, fileName, fileSize }
  let docActiveTab = "all"; // "all" | "notes" | "pdfs" | "creator" | "external"
  const docFilterState = {
    search: "",
    category: "",
    courseId: "",
    sort: "newest"
  };
  const expandedPlaylistIds = new Set();
  const collapsedCourseIds = new Set();

  let mgmtFilterState = {
    search: "",
    category: "",
    status: "",
    sort: "newest"
  };

  let dashFilterState = {
    search: "",
    category: "",
    status: ""
  };

  const THEMES = [
    {
      id: "cosmic",
      name: "Cosmic Violet",
      desc: "Midnight navy with vibrant electric violet",
      badge: "Original Focus",
      swatches: ["#0f1015", "#171920", "#9b8cff", "#71d6a1"],
      lightSwatches: ["#ffffff", "#f1f5f9", "#6d28d9", "#059669"]
    },
    {
      id: "emerald",
      name: "Emerald Mint",
      desc: "Forest obsidian with sage & lush mint",
      badge: "Calm & Clarity",
      swatches: ["#09120e", "#101c16", "#4ade80", "#eab308"],
      lightSwatches: ["#ffffff", "#f1f5f9", "#059669", "#d97706"]
    },
    {
      id: "amber",
      name: "Cyberpunk Amber",
      desc: "Warm carbon slate with radiant amber gold",
      badge: "High Energy",
      swatches: ["#13110d", "#1c1913", "#f59e0b", "#34d399"],
      lightSwatches: ["#ffffff", "#f1f5f9", "#d97706", "#059669"]
    },
    {
      id: "cyan",
      name: "Oceanic Cyan",
      desc: "Arctic sapphire with neon cyan & sky blue",
      badge: "Nordic Crisp",
      swatches: ["#0a1118", "#101c26", "#38bdf8", "#34d399"],
      lightSwatches: ["#ffffff", "#f1f5f9", "#0284c7", "#059669"]
    },
    {
      id: "rose",
      name: "Crimson Rose",
      desc: "Dark ruby night with glowing coral & rose",
      badge: "Vibrant Studio",
      swatches: ["#140e12", "#1f141a", "#fb7185", "#fbbf24"],
      lightSwatches: ["#ffffff", "#f1f5f9", "#e11d48", "#059669"]
    }
  ];

  let currentThemeMode = localStorage.getItem("focuslearn.themeMode") || "dark";
  let currentTheme = localStorage.getItem("focuslearn.theme") || "cosmic";

  function applyThemeMode(mode, notifyUser = false) {
    currentThemeMode = (mode === "light") ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", currentThemeMode);
    localStorage.setItem("focuslearn.themeMode", currentThemeMode);

    // Update Topbar Toggle Button
    const modeIcon = $("#themeModeIcon");
    const modeText = $("#themeModeText");
    if (modeIcon && modeText) {
      if (currentThemeMode === "light") {
        modeIcon.textContent = "🌙";
        modeText.textContent = "Dark theme";
      } else {
        modeIcon.textContent = "☀️";
        modeText.textContent = "White theme";
      }
    }

    // Update Settings Mode Cards
    const darkCard = $("#modeCardDark");
    const lightCard = $("#modeCardLight");
    if (darkCard && lightCard) {
      darkCard.classList.toggle("active", currentThemeMode === "dark");
      lightCard.classList.toggle("active", currentThemeMode === "light");
    }

    updateThemeIndicator();
    renderThemeCards();

    if (notifyUser) {
      notify(currentThemeMode === "light" ? "Switched to White / Light theme." : "Switched to Dark theme.");
    }
  }

  function applyTheme(themeId, notifyUser = false) {
    const t = THEMES.find(x => x.id === themeId) || THEMES[0];
    currentTheme = t.id;
    document.documentElement.setAttribute("data-theme", t.id);
    localStorage.setItem("focuslearn.theme", t.id);

    updateThemeIndicator();
    renderThemeCards();

    if (notifyUser) notify(`Theme accent set to ${t.name}.`);
  }

  function updateThemeIndicator() {
    const ind = $("#themeActiveIndicator");
    if (!ind) return;
    const t = THEMES.find(x => x.id === currentTheme) || THEMES[0];
    const modeLabel = currentThemeMode === "light" ? "White Theme" : "Dark Theme";
    ind.textContent = `Current: ${modeLabel} · ${t.name}`;
  }

  function renderThemeCards() {
    const grid = $("#themeCardsGrid");
    if (!grid) return;
    grid.innerHTML = THEMES.map(t => {
      const isActive = currentTheme === t.id;
      const swatches = currentThemeMode === "light" ? t.lightSwatches : t.swatches;
      return `
        <div class="theme-card ${isActive ? "active" : ""}" data-theme-id="${t.id}" role="button" tabindex="0">
          <div class="theme-card-header">
            <span class="theme-card-title">${esc(t.name)}</span>
            <span class="theme-card-check">✓ Active</span>
          </div>
          <div class="theme-swatches">
            ${swatches.map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join("")}
          </div>
          <p class="theme-card-desc">${esc(t.desc)}</p>
          <span class="theme-card-badge">${esc(t.badge)}</span>
        </div>
      `;
    }).join("");
  }

  function parseVideoLine(line, defaultIndex = 1) {
    const trimmed = (line || "").trim();
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
    const targetUrl = urlMatch ? urlMatch[0] : trimmed;
    const id = videoId(targetUrl);
    if (!id) return null;

    let extractedTitle = "";
    if (urlMatch) {
      const withoutUrl = trimmed.replace(urlMatch[0], "").trim();
      const clean = withoutUrl.replace(/^[\d\s.\-:#|()]+|[\s.\-:#|()]+$/g, "").trim();
      if (clean.length >= 2 && clean.length <= 120) {
        extractedTitle = clean;
      }
    }

    return {
      videoId: id,
      title: extractedTitle || `Video ${defaultIndex}`
    };
  }

  function uid(){ return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function load(){
    try {
      const v=JSON.parse(localStorage.getItem(KEY));
      if(v && Array.isArray(v.courses)){ if(!Array.isArray(v.sessions))v.sessions=[]; return v; }
      return {courses:[],sessions:[]};
    } catch { return {courses:[],sessions:[]}; }
  }
  function persist(){ try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{notify("Storage is full. Export a backup and remove large attachments from other apps.");return false;} }
  function save(){ persist(); renderAll(); }
  function notify(msg){ const el=$("#toast"); if(!el)return; el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600); }

  // Shared IndexedDB connection for pictures and documents
  let _dbInstance = null;
  function getAppDB() {
    if (_dbInstance) return Promise.resolve(_dbInstance);
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_PICS)) {
            const pStore = db.createObjectStore(STORE_PICS, { keyPath: "id" });
            pStore.createIndex("createdAt", "createdAt", { unique: false });
            pStore.createIndex("category", "category", { unique: false });
            pStore.createIndex("courseId", "courseId", { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_DOCS)) {
            const dStore = db.createObjectStore(STORE_DOCS, { keyPath: "id" });
            dStore.createIndex("type", "type", { unique: false });
            dStore.createIndex("createdAt", "createdAt", { unique: false });
            dStore.createIndex("category", "category", { unique: false });
            dStore.createIndex("courseId", "courseId", { unique: false });
          }
        };
        req.onsuccess = () => {
          _dbInstance = req.result;
          resolve(_dbInstance);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  // PicDB client storage
  const PicDB = {
    async getAll() {
      const db = await getAppDB();
      if (!db) {
        try { return JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]"); } catch { return []; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PICS, "readonly");
          const store = tx.objectStore(STORE_PICS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch { resolve([]); }
      });
    },
    async save(item) {
      const db = await getAppDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]");
          const idx = list.findIndex(x => x.id === item.id);
          if (idx >= 0) list[idx] = item; else list.push(item);
          localStorage.setItem("focuslearn.pictures", JSON.stringify(list));
          return true;
        } catch { return false; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PICS, "readwrite");
          const store = tx.objectStore(STORE_PICS);
          store.put(item);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    },
    async delete(id) {
      const db = await getAppDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]").filter(x => x.id !== id);
          localStorage.setItem("focuslearn.pictures", JSON.stringify(list));
          return true;
        } catch { return false; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PICS, "readwrite");
          const store = tx.objectStore(STORE_PICS);
          store.delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    },
    async clear() {
      const db = await getAppDB();
      if (!db) {
        localStorage.removeItem("focuslearn.pictures");
        return true;
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PICS, "readwrite");
          const store = tx.objectStore(STORE_PICS);
          store.clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    }
  };

  // DocDB client storage (Notes and PDFs)
  const DocDB = {
    async getAll() {
      const db = await getAppDB();
      if (!db) {
        try { return JSON.parse(localStorage.getItem("focuslearn.documents") || "[]"); } catch { return []; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCS, "readonly");
          const store = tx.objectStore(STORE_DOCS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch { resolve([]); }
      });
    },
    async save(item) {
      const db = await getAppDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.documents") || "[]");
          const idx = list.findIndex(x => x.id === item.id);
          if (idx >= 0) list[idx] = item; else list.push(item);
          localStorage.setItem("focuslearn.documents", JSON.stringify(list));
          return true;
        } catch { return false; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCS, "readwrite");
          const store = tx.objectStore(STORE_DOCS);
          store.put(item);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    },
    async delete(id) {
      const db = await getAppDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.documents") || "[]").filter(x => x.id !== id);
          localStorage.setItem("focuslearn.documents", JSON.stringify(list));
          return true;
        } catch { return false; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCS, "readwrite");
          const store = tx.objectStore(STORE_DOCS);
          store.delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    },
    async clear() {
      const db = await getAppDB();
      if (!db) {
        localStorage.removeItem("focuslearn.documents");
        return true;
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCS, "readwrite");
          const store = tx.objectStore(STORE_DOCS);
          store.clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      });
    }
  };

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function dataUrlToBlob(dataUrl, mime = "application/pdf") {
    try {
      const parts = dataUrl.split(",");
      const byteStr = atob(parts[1] || parts[0]);
      const ab = new ArrayBuffer(byteStr.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteStr.length; i++) {
        ia[i] = byteStr.charCodeAt(i);
      }
      return new Blob([ab], { type: mime });
    } catch {
      return new Blob([], { type: mime });
    }
  }

  function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `focuslearn-note-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readPdfFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
        reject(new Error("Please select a valid PDF file."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read PDF file."));
      reader.onload = (e) => {
        resolve({
          pdfData: e.target.result,
          fileName: file.name,
          fileSize: file.size
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function processImageFile(file, maxDimension = 1600, quality = 0.88) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please select a valid image file."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Failed to load image."));
        img.onload = () => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          let newWidth = width;
          let newHeight = height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              newWidth = maxDimension;
              newHeight = Math.round((height * maxDimension) / width);
            } else {
              newHeight = maxDimension;
              newWidth = Math.round((width * maxDimension) / height);
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          const mimeType = (file.type === "image/png" && width <= maxDimension && height <= maxDimension) ? "image/png" : "image/jpeg";
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const sizeBytes = Math.round((dataUrl.length * 3) / 4);
          resolve({
            dataUrl,
            width: newWidth,
            height: newHeight,
            sizeBytes,
            originalName: file.name
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function rotateImageDataUrl(dataUrl, degrees = 90) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rotation failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedUrl = canvas.toDataURL("image/jpeg", 0.9);
        const sizeBytes = Math.round((rotatedUrl.length * 3) / 4);
        resolve({
          dataUrl: rotatedUrl,
          width: canvas.width,
          height: canvas.height,
          sizeBytes
        });
      };
      img.src = dataUrl;
    });
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || `focuslearn-file-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function videoId(raw){
    try {
      const trimmed = (raw || "").trim();
      if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
      const u=new URL(trimmed); let id="";
      if(u.hostname==="youtu.be" || u.hostname.endsWith(".youtu.be")) id=u.pathname.split("/").filter(Boolean)[0]||"";
      else if(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(u.hostname)){
        if(u.pathname==="/watch") id=u.searchParams.get("v")||"";
        else if(/^\/(embed|shorts|live)\//.test(u.pathname)) id=u.pathname.split("/")[2]||"";
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
    } catch { return null; }
  }

  function parsePlaylist(raw) {
    try {
      const trimmed = (raw || "").trim();
      if (!trimmed) return null;
      if (/^(PL|UU|LL|FL|RD|OLAK|UL)[A-Za-z0-9_-]{8,64}$/.test(trimmed)) {
        return { playlistId: trimmed, videoId: null };
      }
      const u = new URL(trimmed);
      const list = u.searchParams.get("list");
      const v = videoId(trimmed);
      if (list && /^[A-Za-z0-9_-]{8,64}$/.test(list)) {
        return { playlistId: list, videoId: v };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function fetchPlaylistVideosFromYouTube(playlistId) {
    if (!playlistId) return [];
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    const proxies = [
      `https://corsproxy.io/?url=${encodeURIComponent(rssUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`
    ];

    for (const pUrl of proxies) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(pUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) continue;
        const text = await res.text();
        if (!text || (!text.includes("<feed") && !text.includes("<entry"))) continue;

        const results = [];
        const entries = text.split(/<\/?entry>/i);
        for (const entry of entries) {
          const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || entry.match(/videoId>([^<]+)</i);
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/i);
          if (idMatch && idMatch[1]) {
            const vId = idMatch[1].trim();
            let rawTitle = titleMatch ? titleMatch[1].trim() : `Video ${results.length + 1}`;
            rawTitle = rawTitle.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            results.push({ videoId: vId, title: rawTitle });
          }
        }
        if (results.length > 0) return results;
      } catch {
        // try next proxy
      }
    }

    const invidious = [
      "https://inv.tux.pizza",
      "https://invidious.nerdvpn.de",
      "https://yt.artemislena.eu"
    ];
    for (const inst of invidious) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`${inst}/api/v1/playlists/${playlistId}`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json.videos) && json.videos.length > 0) {
          return json.videos.map((v, i) => ({
            videoId: v.videoId,
            title: v.title || `Video ${i + 1}`
          }));
        }
      } catch {
        // try next
      }
    }

    return [];
  }

  const thumb=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const lessons=c=>(c.modules||[]).flatMap(m=>m.lessons||[]);
  const stats=c=>{const a=lessons(c),d=a.filter(x=>x.completed).length;return {total:a.length,done:d,pct:a.length?Math.round(d/a.length*100):0};};
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function fmtTime(ms){
    const sec=Math.max(0,Math.floor(ms/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");
  }
  function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function sessionMs(s){return Math.max(0,Number(s.durationMs)||0);}
  function allSessionMs(){return state.sessions.reduce((n,s)=>n+sessionMs(s),0)+(timerRunning?Date.now()-timerStartedAt+timerElapsedBeforeStart:0);}
  function todaySessions(){const today=dayKey(new Date());return state.sessions.filter(s=>s.date===today);}
  function stopTimer(quiet=false){
    if(!timerRunning)return;
    const now=Date.now(),duration=timerElapsedBeforeStart+(now-timerStartedAt);
    timerRunning=false;clearInterval(timerInterval);timerInterval=null;
    if(duration>=1000){
      state.sessions.push({id:uid(),date:dayKey(new Date()),startedAt:new Date(now-duration).toISOString(),endedAt:new Date(now).toISOString(),durationMs:duration,courseId:currentCourseId,lessonId:currentLessonId});
      persist();
    }
    timerElapsedBeforeStart=0;timerStartedAt=0;renderTimer();renderAnalytics();
    if(!quiet)notify("Study session saved.");
  }
  function startTimer(){
    if(timerRunning)return;
    if(!currentLessonId){notify("Open a lesson before starting a study session.");return;}
    timerRunning=true;timerStartedAt=Date.now();
    timerInterval=setInterval(()=>{renderTimer();},1000);
    renderTimer();notify("Study timer started. Keep this tab visible while studying.");
  }
  function renderTimer(){
    const elapsed=timerRunning?timerElapsedBeforeStart+(Date.now()-timerStartedAt):timerElapsedBeforeStart;
    const display=$("#studyTimerDisplay"),button=$("#studyTimerToggle"),dot=$("#timerDot");
    if(display)display.textContent=fmtTime(elapsed);
    if(button)button.textContent=timerRunning?"Pause & save":"Start study";
    if(dot)dot.classList.toggle("running",timerRunning);
  }
  function navigate(page){
    if(timerRunning && page!=="player")stopTimer(true);
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const crumb=$("#pageCrumb"); if(crumb)crumb.textContent=({dashboard:"Dashboard",courses:"My courses",analytics:"Analytics",pictures:"Pictures",notes:"Notes & PDFs",settings:"Settings",player:"Learning"}[page]||"Dashboard");
    $("#sidebar")?.classList.remove("open");
    if(page==="dashboard")renderDashboard();
    if(page==="courses")renderManagement();
    if(page==="analytics")renderAnalytics();
    if(page==="pictures")renderPictures();
    if(page==="notes")renderDocuments();
    if(page==="settings")renderThemeCards();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderDashboard(){
    state.courses.forEach(c => {
      if (!c.category) c.category = "General";
      if (!c.createdAt) c.createdAt = Date.now();
    });

    const total = state.courses.reduce((n,c) => n + lessons(c).length, 0);
    const done = state.courses.reduce((n,c) => n + stats(c).done, 0);
    $("#statCourses").textContent = state.courses.length;
    $("#statCompleted").textContent = done;
    $("#statProgress").textContent = total ? Math.round(done / total * 100) + "%" : "0%";
    const picStat = $("#statPictures");
    if (picStat) picStat.textContent = picturesList.length;
    const docStat = $("#statDocs");
    if (docStat) docStat.textContent = docsList.length;

    const dashFilterBar = $("#dashFilterBar");
    if (dashFilterBar) {
      dashFilterBar.hidden = state.courses.length <= 1;

      // Populate dashboard category filter
      const catSelect = $("#dashCategoryFilter");
      if (catSelect) {
        const uniqueCats = Array.from(new Set(state.courses.map(c => c.category || "General"))).sort();
        const currentSel = dashFilterState.category;
        catSelect.innerHTML = '<option value="">All categories</option>' + uniqueCats.map(cat => `<option value="${cat}" ${currentSel === cat ? "selected" : ""}>${esc(cat)}</option>`).join("");
      }
    }

    // Filter courses on dashboard
    let filteredCourses = state.courses.filter(c => {
      const s = stats(c);
      if (dashFilterState.category && (c.category || "General") !== dashFilterState.category) return false;
      if (dashFilterState.status === "in_progress" && !(s.done > 0 && s.done < s.total)) return false;
      if (dashFilterState.status === "completed" && !(s.pct === 100 && s.total > 0)) return false;
      if (dashFilterState.status === "not_started" && !(s.done === 0)) return false;
      if (dashFilterState.search) {
        const q = dashFilterState.search.toLowerCase();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCat = (c.category || "").toLowerCase().includes(q);
        const matchDesc = (c.description || "").toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc) return false;
      }
      return true;
    });

    $("#dashboardEmpty").hidden = state.courses.length > 0;

    if (state.courses.length > 0 && filteredCourses.length === 0) {
      $("#dashboardCourses").innerHTML = `
        <div class="empty-state compact" style="grid-column: 1 / -1; margin-top: 0">
          <div class="empty-art">🔍</div>
          <h3>No matching courses</h3>
          <p>No courses match your search or filter settings.</p>
          <button type="button" class="secondary-button" id="dashClearFilterBtn">Clear filters</button>
        </div>
      `;
      return;
    }

    $("#dashboardCourses").innerHTML = filteredCourses.map(c => {
      const s = stats(c), last = lessons(c).find(l => l.id === c.lastWatched) || lessons(c)[0];
      return `
        <article class="course-card" data-open-course="${c.id}" tabindex="0" role="button">
          <div class="course-cover">
            <span class="course-category-badge" style="position:absolute;top:12px;left:12px;z-index:2">${esc(c.category || "General")}</span>
            <span class="cover-tag">LEARNING PATH</span>
          </div>
          <div class="course-body">
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.description || "Your personal learning path")}</p>
            <div class="course-meta">
              <span>${s.done}/${s.total} lessons</span>
              <span>${s.pct}%</span>
            </div>
            <div class="progress-track"><span style="width:${s.pct}%"></span></div>
            ${last ? `<small class="muted" style="display:block;margin-top:11px;font-size:10px">Continue: ${esc(last.title)}</small>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderManagement(){
    state.courses.forEach(c => {
      if (!c.category) c.category = "General";
      if (!c.createdAt) c.createdAt = Date.now();
    });

    const courseOptions = '<option value="">Choose a course</option>' + state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    const lc = $("#lessonCourse"); if (lc) lc.innerHTML = courseOptions;
    const pc = $("#playlistCourse"); if (pc) pc.innerHTML = courseOptions;
    const bc = $("#bulkCourse"); if (bc) bc.innerHTML = courseOptions;

    updatePicCourseOptions();
    updateDocCourseOptions();

    const totalCourses = state.courses.length;
    $("#courseCountLabel").textContent = `${totalCourses} course${totalCourses === 1 ? "" : "s"}`;
    $("#managementEmpty").hidden = totalCourses > 0;

    const mgmtBar = $("#mgmtControlsBar");
    if (mgmtBar) mgmtBar.hidden = totalCourses === 0;

    if (totalCourses === 0) {
      $("#managementCourses").innerHTML = "";
      return;
    }

    // Populate Category filter dropdown
    const allCats = Array.from(new Set([
      "Programming", "Computer Science", "Design", "Academics", "Languages", "Business", "Personal", "General", "Other",
      ...state.courses.map(c => c.category || "General")
    ])).sort();
    const catSel = $("#mgmtCategoryFilter");
    if (catSel) {
      const curCat = mgmtFilterState.category;
      catSel.innerHTML = '<option value="">All categories</option>' + allCats.map(cat => `<option value="${cat}" ${curCat === cat ? "selected" : ""}>${esc(cat)}</option>`).join("");
    }

    // Calculate overview statistics
    let activeCount = 0;
    let completedCount = 0;
    state.courses.forEach(c => {
      const s = stats(c);
      if (s.pct === 100 && s.total > 0) completedCount++;
      else if (s.done > 0 && s.done < s.total) activeCount++;
    });

    const pTotal = $("#mgmtPillTotal"); if (pTotal) pTotal.textContent = `${totalCourses} Course${totalCourses === 1 ? "" : "s"}`;
    const pActive = $("#mgmtPillActive"); if (pActive) pActive.textContent = `${activeCount} In Progress`;
    const pComp = $("#mgmtPillCompleted"); if (pComp) pComp.textContent = `${completedCount} Completed`;

    // Filter courses
    let filtered = state.courses.filter(c => {
      const s = stats(c);
      if (mgmtFilterState.category && (c.category || "General") !== mgmtFilterState.category) return false;
      if (mgmtFilterState.status === "in_progress" && !(s.done > 0 && s.done < s.total)) return false;
      if (mgmtFilterState.status === "completed" && !(s.pct === 100 && s.total > 0)) return false;
      if (mgmtFilterState.status === "not_started" && !(s.done === 0)) return false;
      if (mgmtFilterState.search) {
        const q = mgmtFilterState.search.toLowerCase();
        const inName = (c.name || "").toLowerCase().includes(q);
        const inCat = (c.category || "").toLowerCase().includes(q);
        const inDesc = (c.description || "").toLowerCase().includes(q);
        const inMods = (c.modules || []).some(m => {
          if ((m.name || "").toLowerCase().includes(q)) return true;
          return (m.lessons || []).some(l => {
            if ((l.title || "").toLowerCase().includes(q)) return true;
            if ((l.videoId || "").toLowerCase().includes(q)) return true;
            return (l.videos || []).some(v => (v.title || "").toLowerCase().includes(q) || (v.videoId || "").toLowerCase().includes(q));
          });
        });
        if (!inName && !inCat && !inDesc && !inMods) return false;
      }
      return true;
    });

    // Sort filtered courses
    filtered.sort((a, b) => {
      const sa = stats(a), sb = stats(b);
      switch (mgmtFilterState.sort) {
        case "az": return (a.name || "").localeCompare(b.name || "");
        case "za": return (b.name || "").localeCompare(a.name || "");
        case "progress_desc": return sb.pct - sa.pct;
        case "progress_asc": return sa.pct - sb.pct;
        case "lessons_desc": return sb.total - sa.total;
        case "oldest": return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime());
        case "newest":
        default:
          return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      }
    });

    // Filter status labels & reset button
    const isFiltered = !!(mgmtFilterState.search || mgmtFilterState.category || mgmtFilterState.status || mgmtFilterState.sort !== "newest");
    const resetBtn = $("#mgmtResetFilterBtn");
    if (resetBtn) resetBtn.hidden = !isFiltered;

    const statusLabel = $("#mgmtFilterStatusLabel");
    if (statusLabel) {
      statusLabel.textContent = isFiltered
        ? `Showing ${filtered.length} of ${totalCourses} courses`
        : `Showing all ${totalCourses} courses`;
    }

    if (filtered.length === 0) {
      $("#managementCourses").innerHTML = `
        <div class="empty-state compact" style="margin-top: 10px">
          <div class="empty-art">🔍</div>
          <h3>No matching courses found</h3>
          <p>Try adjusting your search query, category, or status filter.</p>
          <button type="button" class="secondary-button" id="mgmtClearFilterBtn">Reset all filters</button>
        </div>
      `;
      return;
    }

    // Render collapsible course cards
    $("#managementCourses").innerHTML = filtered.map(c => {
      const s = stats(c);
      const isSearching = !!mgmtFilterState.search;
      // Auto expand during search so matches are visible; otherwise check collapsed set
      const isCollapsed = isSearching ? false : collapsedCourseIds.has(c.id);

      const mods = (c.modules || []).map(m => `
        <div class="module-block">
          <div class="module-title">${esc(m.name)}</div>
          ${m.lessons.map(l => {
            const isPl = !!(l.isPlaylist || l.playlistId);
            const vCount = Array.isArray(l.videos) ? l.videos.length : 0;
            const isExpanded = expandedPlaylistIds.has(l.id);
            const thumbHtml = (l.videoId && l.videoId !== "videoseries")
              ? `<img class="lesson-thumb" src="${thumb(l.videoId)}" alt="" loading="lazy">`
              : `<div class="lesson-thumb playlist-thumb" title="YouTube Playlist"><span>≡</span></div>`;
            return `
              <div class="lesson-row ${isPl ? "playlist-row" : ""}">
                ${thumbHtml}
                <div class="lesson-row-info">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <strong>${esc(l.title)}</strong>
                    ${isPl ? '<span class="pic-category-badge badge-pdf" style="font-size:8px;padding:2px 5px">PLAYLIST</span>' : ''}
                  </div>
                  <small>${isPl ? `YouTube Playlist · ${vCount} video${vCount === 1 ? "" : "s"}` : (l.completed ? 'Completed' : 'Not completed')}</small>
                </div>
                ${l.completed ? '<span class="lesson-status">✓ Done</span>' : ''}
                <button type="button" class="mini-button" data-play="${c.id}|${l.id}">Open</button>
                ${isPl ? `<button type="button" class="mini-button" data-toggle-playlist-expand="${l.id}">${isExpanded ? "▲ Hide" : "▼"} Videos (${vCount})</button>` : ''}
                <button type="button" class="mini-button edit" data-edit-content="${c.id}|${m.id}|${l.id}">Edit</button>
                <button type="button" class="mini-button delete" data-delete-lesson="${c.id}|${m.id}|${l.id}">Remove</button>
              </div>
              ${isPl && isExpanded ? `
                <div class="playlist-mgmt-sublist">
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0">
                    <span class="muted small" style="font-weight:700">VIDEOS IN THIS PLAYLIST (${vCount})</span>
                    <div style="display:flex;gap:6px">
                      <button type="button" class="mini-btn-action" data-add-vid-playlist="${c.id}|${m.id}|${l.id}">＋ Add video</button>
                      <button type="button" class="mini-btn-action" data-paste-vids-playlist="${c.id}|${m.id}|${l.id}">📋 Paste URLs</button>
                    </div>
                  </div>
                  ${vCount === 0 ? '<p class="muted small" style="margin:4px 0 8px">No videos listed yet. Click "+ Add video" or "Paste URLs" to add videos.</p>' : (l.videos || []).map((v, vIdx) => `
                    <div class="playlist-mgmt-item">
                      <img src="${thumb(v.videoId)}" alt="" class="pmi-thumb" loading="lazy">
                      <div class="pmi-info">
                        <div class="pmi-title">#${vIdx + 1}. ${esc(v.title)}</div>
                        <div class="pmi-meta">${v.completed ? '<span class="badge-done">✓ Done</span> · ' : ''}${v.videoId}</div>
                      </div>
                      <div class="pmi-actions">
                        <button type="button" class="mini-button" data-play-pvid="${c.id}|${l.id}|${v.id}" title="Play in learning space">▶ Play</button>
                        <button type="button" class="mini-button edit" data-edit-pvid="${c.id}|${m.id}|${l.id}|${v.id}" title="Edit title or URL">✎</button>
                        <button type="button" class="mini-button delete" data-delete-pvid="${c.id}|${m.id}|${l.id}|${v.id}" title="Remove from playlist">🗑</button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : ''}
            `;
          }).join("")}
        </div>
      `).join("");

      return `
        <article class="panel management-course ${isCollapsed ? "collapsed" : ""}" data-course-id="${c.id}">
          <div class="management-course-head">
            <div class="mc-head-main">
              <span class="mc-chevron" data-toggle-course-collapse="${c.id}" role="button" tabindex="0" title="${isCollapsed ? "Expand course" : "Collapse course"}">
                ${isCollapsed ? "▶" : "▼"}
              </span>
              <div class="mc-title-wrap">
                <div class="mc-title-row">
                  <h3 class="mc-title">${esc(c.name)}</h3>
                  <span class="course-category-badge">${esc(c.category || "General")}</span>
                </div>
                <div class="mc-meta-row">
                  <span>${s.total} lesson${s.total === 1 ? "" : "s"} (${s.done} completed)</span>
                  <span>·</span>
                  <span>${(c.modules || []).length} module${(c.modules || []).length === 1 ? "" : "s"}</span>
                  <span>·</span>
                  <div class="mc-progress-inline">
                    <div class="progress-track"><span style="width:${s.pct}%"></span></div>
                    <span class="mc-progress-pct">${s.pct}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="course-actions">
              <button type="button" class="mini-button" data-open-course="${c.id}">Study course →</button>
              <button type="button" class="mini-button edit" data-edit-course-modal="${c.id}">✎ Edit</button>
              <button type="button" class="mini-button delete" data-delete-course="${c.id}">🗑 Delete</button>
            </div>
          </div>
          <div class="management-course-body">
            ${c.description ? `<p class="muted small" style="margin:12px 0 6px;line-height:1.5">${esc(c.description)}</p>` : ""}
            ${mods || '<p class="muted small" style="margin:15px 0 0">No lessons or playlists yet. Add one above.</p>'}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAnalytics(){
    const completed=state.courses.reduce((n,c)=>n+stats(c).done,0);
    const activeDays=new Set(state.sessions.filter(s=>sessionMs(s)>0).map(s=>s.date)).size;
    const totalMs=allSessionMs();
    $("#analyticsTotalTime").textContent=totalMs>=3600000?`${(totalMs/3600000).toFixed(1)}h`:`${Math.floor(totalMs/60000)}m`;
    $("#analyticsActiveDays").textContent=activeDays;
    $("#analyticsLessons").textContent=completed;
    let streak=0,day=new Date();
    while(true){const k=dayKey(day);if(!state.sessions.some(s=>s.date===k&&sessionMs(s)>0))break;streak++;day.setDate(day.getDate()-1);}
    if(streak===0){const y=new Date();y.setDate(y.getDate()-1);if(state.sessions.some(s=>s.date===dayKey(y)&&sessionMs(s)>0)){streak=1;y.setDate(y.getDate()-1);while(state.sessions.some(s=>s.date===dayKey(y)&&sessionMs(s)>0)){streak++;y.setDate(y.getDate()-1);}}}
    $("#analyticsStreak").textContent=`${streak} ${streak===1?"day":"days"}`;
    const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const key=dayKey(d),ms=state.sessions.filter(s=>s.date===key).reduce((n,s)=>n+sessionMs(s),0)+(key===dayKey(new Date())&&timerRunning?Date.now()-timerStartedAt+timerElapsedBeforeStart:0);days.push({key,label:d.toLocaleDateString(undefined,{weekday:"short"}),minutes:Math.round(ms/60000),ms});}
    const max=Math.max(1,...days.map(x=>x.minutes));$("#weeklyTotal").textContent=`${days.reduce((n,x)=>n+x.minutes,0)} min total`;
    $("#weeklyChart").innerHTML=days.map(d=>`<div class="chart-day"><div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(d.minutes?5:0,(d.minutes/max)*100)}%" title="${d.minutes} minutes"></div></div><strong>${d.minutes}m</strong><small>${d.label}</small></div>`).join("");
    $("#analyticsCourses").innerHTML=state.courses.length?state.courses.map(c=>{const s=stats(c);return `<div class="analytics-course"><div><strong>${esc(c.name)}</strong><span>${s.done}/${s.total} lessons · ${s.pct}%</span></div><div class="progress-track"><span style="width:${s.pct}%"></span></div></div>`;}).join(""):'<p class="muted small">Your course progress will appear here.</p>';
    const recent=[...state.sessions].sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt))).slice(0,8);
    $("#recentSessions").innerHTML=recent.length?recent.map(s=>{const c=state.courses.find(x=>x.id===s.courseId);return `<div class="session-row"><span class="session-indicator"></span><div><strong>${esc(c?.name||"Course session")}</strong><small>${new Date(s.startedAt).toLocaleString()}</small></div><b>${Math.max(1,Math.round(sessionMs(s)/60000))} min</b></div>`;}).join(""):'<p class="muted small">No study sessions yet. Open a lesson and press “Start study” to begin tracking.</p>';
  }

  // Pictures functions
  function updatePicCourseOptions() {
    const courseSelects = [$("#picCourseFilter"), $("#picCourseSelect")];
    courseSelects.forEach(select => {
      if (!select) return;
      const isFilter = select.id === "picCourseFilter";
      const val = select.value;
      const defaultOption = isFilter ? '<option value="">All courses</option>' : '<option value="">None (General)</option>';
      select.innerHTML = defaultOption + state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
      select.value = val;
    });
  }

  function renderPictures() {
    updatePicCourseOptions();
    const countEl = $("#statPictures");
    if (countEl) countEl.textContent = picturesList.length;

    let filtered = [...picturesList];

    if (picFilterState.search) {
      const q = picFilterState.search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.details && p.details.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    if (picFilterState.category) {
      filtered = filtered.filter(p => p.category === picFilterState.category);
    }

    if (picFilterState.courseId) {
      filtered = filtered.filter(p => p.courseId === picFilterState.courseId);
    }

    if (picFilterState.sort === "newest") {
      filtered.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    } else if (picFilterState.sort === "oldest") {
      filtered.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    } else if (picFilterState.sort === "title") {
      filtered.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }

    const grid = $("#picturesGrid");
    const empty = $("#picturesEmpty");
    const label = $("#picCountLabel");
    if (label) {
      if (picturesList.length === 0) {
        label.textContent = "0 pictures stored";
      } else if (filtered.length === picturesList.length) {
        label.textContent = `${picturesList.length} picture${picturesList.length === 1 ? "" : "s"}`;
      } else {
        label.textContent = `Showing ${filtered.length} of ${picturesList.length} picture${picturesList.length === 1 ? "" : "s"}`;
      }
    }

    if (empty) empty.hidden = filtered.length > 0;
    if (!grid) return;

    grid.innerHTML = filtered.map(p => {
      const course = state.courses.find(c => c.id === p.courseId);
      const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
      return `
        <article class="pic-card" data-pic-id="${p.id}">
          <div class="pic-card-thumb-wrap" data-view-pic="${p.id}" tabindex="0" role="button" aria-label="View picture ${esc(p.title)}">
            <img class="pic-card-thumb" src="${p.dataUrl}" alt="${esc(p.title)}" loading="lazy">
            <div class="pic-card-overlay-btn"><span>🔍 View picture</span></div>
          </div>
          <div class="pic-card-body">
            <div class="pic-card-badges">
              <span class="pic-category-badge">${esc(p.category || "IMAGE")}</span>
              ${course ? `<span class="pic-course-badge" title="Course: ${esc(course.name)}">📚 ${esc(course.name)}</span>` : ""}
            </div>
            <h3 class="pic-card-title">${esc(p.title)}</h3>
            <p class="pic-card-snippet">${esc(p.details || "No notes added.")}</p>
            <div class="pic-card-footer">
              <small>${dateStr}${p.width && p.height ? ` · ${p.width}×${p.height}` : ""}</small>
              <div class="pic-card-actions">
                <button type="button" class="mini-button" data-view-pic="${p.id}" title="View full image">View</button>
                <button type="button" class="mini-button edit" data-edit-pic="${p.id}" title="Edit picture and details">Edit</button>
                <button type="button" class="mini-button delete" data-delete-pic="${p.id}" title="Delete picture">Delete</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function setStagedImage(imgInfo, autoTitle = false) {
    stagedImageData = imgInfo;
    $("#picPreviewImg").src = imgInfo.dataUrl;
    $("#picPreviewInfo").textContent = `${imgInfo.width} × ${imgInfo.height} px · ${formatBytes(imgInfo.sizeBytes)}`;
    $("#picDropEmpty").hidden = true;
    $("#picDropPreview").hidden = false;
    if (autoTitle && !$("#picTitleInput").value.trim() && imgInfo.originalName) {
      const cleanName = imgInfo.originalName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
      if (cleanName) {
        $("#picTitleInput").value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }
  }

  function openAddPicModal(courseId = "") {
    editingPicId = null;
    stagedImageData = null;
    $("#picModalTitle").textContent = "Add picture";
    $("#picSubmitBtn").innerHTML = "Save picture <span>→</span>";
    $("#picForm").reset();
    $("#picId").value = "";
    $("#picDropEmpty").hidden = false;
    $("#picDropPreview").hidden = true;
    $("#picPreviewImg").src = "";
    $("#picPreviewInfo").textContent = "";
    updatePicCourseOptions();
    if (courseId) {
      $("#picCourseSelect").value = courseId;
    }
    $("#picModalOverlay").hidden = false;
    $("#picTitleInput").focus();
  }

  function openEditPicModal(id) {
    const p = picturesList.find(x => x.id === id);
    if (!p) return;
    editingPicId = id;
    stagedImageData = {
      dataUrl: p.dataUrl,
      width: p.width,
      height: p.height,
      sizeBytes: p.sizeBytes,
      originalName: p.originalName || "image.jpg"
    };
    $("#picModalTitle").textContent = "Edit picture & details";
    $("#picSubmitBtn").innerHTML = "Save changes <span>✓</span>";
    $("#picId").value = p.id;
    $("#picTitleInput").value = p.title || "";
    $("#picCategoryInput").value = p.category || "Diagram";
    updatePicCourseOptions();
    $("#picCourseSelect").value = p.courseId || "";
    $("#picDetailsInput").value = p.details || "";

    $("#picDropEmpty").hidden = true;
    $("#picDropPreview").hidden = false;
    $("#picPreviewImg").src = p.dataUrl;
    $("#picPreviewInfo").textContent = `${p.width || "?"} × ${p.height || "?"} px · ${formatBytes(p.sizeBytes)}`;

    closeLightbox();
    $("#picModalOverlay").hidden = false;
    $("#picTitleInput").focus();
  }

  function closePicModal() {
    $("#picModalOverlay").hidden = true;
    stagedImageData = null;
    editingPicId = null;
  }

  function openLightbox(id) {
    const p = picturesList.find(x => x.id === id);
    if (!p) return;
    currentViewingPicId = id;
    const course = state.courses.find(c => c.id === p.courseId);

    const img = $("#lightboxImg");
    img.src = p.dataUrl;
    img.classList.remove("zoomed");

    $("#lightboxTitle").textContent = p.title || "Untitled Picture";
    $("#lightboxCategory").textContent = p.category || "IMAGE";
    const courseEl = $("#lightboxCourse");
    if (course) {
      courseEl.hidden = false;
      courseEl.textContent = `📚 ${course.name}`;
    } else {
      courseEl.hidden = true;
    }

    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
    const dimStr = p.width && p.height ? ` · ${p.width} × ${p.height} px` : "";
    const sizeStr = p.sizeBytes ? ` · ${formatBytes(p.sizeBytes)}` : "";
    $("#lightboxDate").textContent = `Added ${dateStr}${dimStr}${sizeStr}`;

    const detailsEl = $("#lightboxDetails");
    detailsEl.textContent = p.details ? p.details : "No notes or explanation recorded for this picture.";

    $("#picLightboxOverlay").hidden = false;
  }

  function closeLightbox() {
    $("#picLightboxOverlay").hidden = true;
    currentViewingPicId = null;
    $("#lightboxImg").classList.remove("zoomed");
  }

  async function handleDeletePic(id) {
    const p = picturesList.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete picture "${p.title}"? This cannot be undone.`)) return;

    await PicDB.delete(id);
    picturesList = picturesList.filter(x => x.id !== id);
    if (currentViewingPicId === id) closeLightbox();
    renderPictures();
    notify("Picture deleted.");
  }

  // Documents (Notes & PDFs) Functions
  function updateDocCourseOptions() {
    const courseSelects = [$("#docCourseFilter"), $("#qNoteCourse"), $("#docNoteCourse"), $("#docPdfCourse")];
    courseSelects.forEach(select => {
      if (!select) return;
      const isFilter = select.id === "docCourseFilter";
      const val = select.value;
      const defaultOption = isFilter ? '<option value="">All courses</option>' : '<option value="">None (General)</option>';
      select.innerHTML = defaultOption + state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
      select.value = val;
    });
  }

  function switchDocTab(tabName) {
    docActiveTab = tabName;
    $$(".doc-tab").forEach(b => b.classList.toggle("active", b.dataset.docTab === tabName));

    const listView = $("#docListView");
    const creatorView = $("#docCreatorView");
    const externalView = $("#docExternalView");

    if (listView) listView.hidden = (tabName === "creator" || tabName === "external");
    if (creatorView) creatorView.hidden = (tabName !== "creator");
    if (externalView) externalView.hidden = (tabName !== "external");

    if (tabName !== "creator" && tabName !== "external") {
      renderDocuments();
    }
  }

  function renderDocuments() {
    updateDocCourseOptions();

    const notesCount = docsList.filter(d => d.type === "note").length;
    const pdfsCount = docsList.filter(d => d.type === "pdf").length;
    const totalCount = docsList.length;

    const tAll = $("#tabCountAll"), tNotes = $("#tabCountNotes"), tPdfs = $("#tabCountPdfs"), statEl = $("#statDocs");
    if (tAll) tAll.textContent = totalCount;
    if (tNotes) tNotes.textContent = notesCount;
    if (tPdfs) tPdfs.textContent = pdfsCount;
    if (statEl) statEl.textContent = totalCount;

    let filtered = [...docsList];

    if (docActiveTab === "notes") {
      filtered = filtered.filter(d => d.type === "note");
    } else if (docActiveTab === "pdfs") {
      filtered = filtered.filter(d => d.type === "pdf");
    }

    if (docFilterState.search) {
      const q = docFilterState.search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.details && d.details.toLowerCase().includes(q)) ||
        (d.content && d.content.toLowerCase().includes(q)) ||
        (d.fileName && d.fileName.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q))
      );
    }

    if (docFilterState.category) {
      filtered = filtered.filter(d => d.category === docFilterState.category);
    }

    if (docFilterState.courseId) {
      filtered = filtered.filter(d => d.courseId === docFilterState.courseId);
    }

    if (docFilterState.sort === "newest") {
      filtered.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    } else if (docFilterState.sort === "oldest") {
      filtered.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    } else if (docFilterState.sort === "title") {
      filtered.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }

    const grid = $("#documentsGrid");
    const empty = $("#documentsEmpty");
    const countLabel = $("#docCountLabel");

    if (countLabel) {
      if (totalCount === 0) {
        countLabel.textContent = "0 items stored";
      } else if (filtered.length === totalCount) {
        countLabel.textContent = `${totalCount} item${totalCount === 1 ? "" : "s"} (${notesCount} notes, ${pdfsCount} PDFs)`;
      } else {
        countLabel.textContent = `Showing ${filtered.length} of ${totalCount} item${totalCount === 1 ? "" : "s"}`;
      }
    }

    if (empty) empty.hidden = filtered.length > 0;
    if (!grid) return;

    grid.innerHTML = filtered.map(d => {
      const course = state.courses.find(c => c.id === d.courseId);
      const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

      if (d.type === "pdf") {
        return `
          <article class="doc-card doc-card-pdf" data-doc-id="${d.id}">
            <div class="doc-card-head">
              <span class="doc-type-icon icon-pdf" aria-hidden="true">📄</span>
              <div class="pic-badge-group" style="margin:0">
                <span class="pic-category-badge badge-pdf">${esc(d.category || "PDF")}</span>
                ${course ? `<span class="pic-course-badge" title="Course: ${esc(course.name)}">📚 ${esc(course.name)}</span>` : ""}
              </div>
            </div>
            <h3 class="doc-card-title">${esc(d.title)}</h3>
            ${d.details ? `<div class="doc-details-snippet" title="${esc(d.details)}"><b>Details:</b> ${esc(d.details)}</div>` : ""}
            <div class="doc-pdf-meta-box">
              <span style="font-size:16px" aria-hidden="true">📎</span>
              <div style="min-width:0;flex:1">
                <strong style="display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.fileName || "document.pdf")}</strong>
                <small class="muted" style="font-size:9px">${formatBytes(d.fileSize)}</small>
              </div>
            </div>
            <div class="doc-card-footer">
              <small>${dateStr}</small>
              <div class="doc-card-actions">
                <button type="button" class="mini-button" data-view-pdf="${d.id}" title="Read PDF document">Read</button>
                <button type="button" class="mini-button edit" data-edit-pdf="${d.id}" title="Edit PDF details">Edit</button>
                <button type="button" class="mini-button" data-download-pdf="${d.id}" title="Download PDF file">Download</button>
                <button type="button" class="mini-button delete" data-delete-doc="${d.id}" title="Delete PDF document">Delete</button>
              </div>
            </div>
          </article>
        `;
      }

      // Note card
      return `
        <article class="doc-card doc-card-note" data-doc-id="${d.id}">
          <div class="doc-card-head">
            <span class="doc-type-icon icon-note" aria-hidden="true">✎</span>
            <div class="pic-badge-group" style="margin:0">
              <span class="pic-category-badge badge-note">${esc(d.category || "NOTE")}</span>
              ${course ? `<span class="pic-course-badge" title="Course: ${esc(course.name)}">📚 ${esc(course.name)}</span>` : ""}
            </div>
          </div>
          <h3 class="doc-card-title">${esc(d.title)}</h3>
          ${d.details ? `<div class="doc-details-snippet" title="${esc(d.details)}"><b>Takeaway:</b> ${esc(d.details)}</div>` : ""}
          <div class="doc-content-snippet">${esc(d.content || "No notes content.")}</div>
          <div class="doc-card-footer">
            <small>${dateStr}</small>
            <div class="doc-card-actions">
              <button type="button" class="mini-button" data-view-note="${d.id}" title="Read note">View</button>
              <button type="button" class="mini-button edit" data-edit-note="${d.id}" title="Edit note and details">Edit</button>
              <button type="button" class="mini-button delete" data-delete-doc="${d.id}" title="Delete note">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // Note Modal Operations
  function openAddNoteModal(courseId = "") {
    editingDocId = null;
    $("#docNoteModalTitle").textContent = "Create study note";
    $("#docNoteSubmitBtn").innerHTML = "Save note <span>→</span>";
    $("#docNoteForm").reset();
    $("#docNoteId").value = "";
    updateDocCourseOptions();
    if (courseId) {
      $("#docNoteCourse").value = courseId;
    }
    $("#docNoteModalOverlay").hidden = false;
    $("#docNoteTitle").focus();
  }

  function openEditNoteModal(id) {
    const d = docsList.find(x => x.id === id && x.type === "note");
    if (!d) return;
    editingDocId = id;
    $("#docNoteModalTitle").textContent = "Edit note & details";
    $("#docNoteSubmitBtn").innerHTML = "Save changes <span>✓</span>";
    $("#docNoteId").value = d.id;
    $("#docNoteTitle").value = d.title || "";
    $("#docNoteCategory").value = d.category || "Lecture Notes";
    updateDocCourseOptions();
    $("#docNoteCourse").value = d.courseId || "";
    $("#docNoteDetails").value = d.details || "";
    $("#docNoteContent").value = d.content || "";

    closeNoteViewer();
    $("#docNoteModalOverlay").hidden = false;
    $("#docNoteTitle").focus();
  }

  function closeNoteModal() {
    $("#docNoteModalOverlay").hidden = true;
    editingDocId = null;
  }

  function openNoteViewer(id) {
    const d = docsList.find(x => x.id === id && x.type === "note");
    if (!d) return;
    currentViewingNoteId = id;
    const course = state.courses.find(c => c.id === d.courseId);

    $("#viewNoteTitle").textContent = d.title || "Untitled Note";
    $("#viewNoteCategory").textContent = d.category || "NOTE";
    const courseEl = $("#viewNoteCourse");
    if (course) {
      courseEl.hidden = false;
      courseEl.textContent = `📚 ${course.name}`;
    } else {
      courseEl.hidden = true;
    }

    const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
    const updatedStr = d.updatedAt && d.updatedAt !== d.createdAt ? ` · Updated ${new Date(d.updatedAt).toLocaleDateString()}` : "";
    $("#viewNoteDate").textContent = `Created ${dateStr}${updatedStr}`;

    const detailsWrap = $("#viewNoteDetailsWrap");
    if (d.details && d.details.trim()) {
      detailsWrap.hidden = false;
      $("#viewNoteDetails").textContent = d.details.trim();
    } else {
      detailsWrap.hidden = true;
    }

    $("#viewNoteContent").textContent = d.content || "(Empty note)";
    $("#docNoteViewModal").hidden = false;
  }

  function closeNoteViewer() {
    $("#docNoteViewModal").hidden = true;
    currentViewingNoteId = null;
  }

  // PDF Modal Operations
  function openAddPdfModal(courseId = "") {
    editingDocId = null;
    stagedPdfData = null;
    $("#docPdfModalTitle").textContent = "Upload PDF document";
    $("#docPdfSubmitBtn").innerHTML = "Save PDF <span>→</span>";
    $("#docPdfForm").reset();
    $("#docPdfId").value = "";
    $("#docPdfDropEmpty").hidden = false;
    $("#docPdfDropPreview").hidden = true;
    $("#docPdfPreviewName").textContent = "";
    $("#docPdfPreviewInfo").textContent = "";
    updateDocCourseOptions();
    if (courseId) {
      $("#docPdfCourse").value = courseId;
    }
    $("#docPdfModalOverlay").hidden = false;
    $("#docPdfTitle").focus();
  }

  function openEditPdfModal(id) {
    const d = docsList.find(x => x.id === id && x.type === "pdf");
    if (!d) return;
    editingDocId = id;
    stagedPdfData = {
      pdfData: d.pdfData,
      fileName: d.fileName,
      fileSize: d.fileSize
    };
    $("#docPdfModalTitle").textContent = "Edit PDF details";
    $("#docPdfSubmitBtn").innerHTML = "Save changes <span>✓</span>";
    $("#docPdfId").value = d.id;
    $("#docPdfTitle").value = d.title || "";
    $("#docPdfCategory").value = d.category || "Lecture Slides";
    updateDocCourseOptions();
    $("#docPdfCourse").value = d.courseId || "";
    $("#docPdfDetails").value = d.details || "";

    $("#docPdfDropEmpty").hidden = true;
    $("#docPdfDropPreview").hidden = false;
    $("#docPdfPreviewName").textContent = d.fileName || "document.pdf";
    $("#docPdfPreviewInfo").textContent = formatBytes(d.fileSize);

    closePdfViewer();
    $("#docPdfModalOverlay").hidden = false;
    $("#docPdfTitle").focus();
  }

  function closePdfModal() {
    $("#docPdfModalOverlay").hidden = true;
    stagedPdfData = null;
    editingDocId = null;
  }

  function openPdfViewer(id) {
    const d = docsList.find(x => x.id === id && x.type === "pdf");
    if (!d || !d.pdfData) {
      notify("PDF document could not be loaded.");
      return;
    }
    currentViewingPdfId = id;
    const course = state.courses.find(c => c.id === d.courseId);

    if (currentPdfBlobUrl) {
      URL.revokeObjectURL(currentPdfBlobUrl);
      currentPdfBlobUrl = null;
    }

    const blob = dataUrlToBlob(d.pdfData, "application/pdf");
    currentPdfBlobUrl = URL.createObjectURL(blob);
    $("#pdfViewerFrame").src = currentPdfBlobUrl;

    $("#viewPdfTitle").textContent = d.title || "PDF Document";
    $("#viewPdfCategory").textContent = d.category || "PDF";
    const courseEl = $("#viewPdfCourse");
    if (course) {
      courseEl.hidden = false;
      courseEl.textContent = `📚 ${course.name}`;
    } else {
      courseEl.hidden = true;
    }

    const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
    $("#viewPdfDate").textContent = `Added ${dateStr} · ${formatBytes(d.fileSize)}`;

    $("#viewPdfDetails").textContent = d.details ? d.details : "No summary or notes recorded for this PDF.";
    $("#docPdfViewModal").hidden = false;
  }

  function closePdfViewer() {
    $("#docPdfViewModal").hidden = true;
    currentViewingPdfId = null;
    const frame = $("#pdfViewerFrame");
    if (frame) frame.src = "";
    if (currentPdfBlobUrl) {
      URL.revokeObjectURL(currentPdfBlobUrl);
      currentPdfBlobUrl = null;
    }
  }

  async function handleDeleteDoc(id) {
    const d = docsList.find(x => x.id === id);
    if (!d) return;
    const itemType = d.type === "pdf" ? "PDF document" : "note";
    if (!confirm(`Delete ${itemType} "${d.title}"? This cannot be undone.`)) return;

    await DocDB.delete(id);
    docsList = docsList.filter(x => x.id !== id);

    if (currentViewingNoteId === id) closeNoteViewer();
    if (currentViewingPdfId === id) closePdfViewer();

    renderDocuments();
    renderDashboard();
    notify(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted.`);
  }

  // Edit Video / Playlist Modal logic
  function openEditContentModal(cid, mid, lid) {
    const c = state.courses.find(x => x.id === cid);
    const m = c?.modules.find(x => x.id === mid);
    const l = m?.lessons.find(x => x.id === lid);
    if (!c || !m || !l) return;

    const isPl = !!(l.isPlaylist || l.playlistId);
    $("#editCourseId").value = cid;
    $("#editModuleId").value = mid;
    $("#editLessonId").value = lid;
    $("#editIsPlaylist").value = isPl ? "true" : "false";

    $("#editContentModalTitle").textContent = isPl ? "Edit YouTube playlist" : "Edit lesson video";
    $("#editTitleInput").value = l.title || "";
    $("#editModuleInput").value = m.name || "";
    $("#editUrlLabel").innerHTML = isPl ? 'YouTube playlist URL or ID <span class="required">*</span>' : 'YouTube video URL <span class="required">*</span>';
    $("#editUrlBadge").textContent = isPl ? "PL" : "YT";

    const currentUrl = isPl
      ? (l.playlistId ? `https://www.youtube.com/playlist?list=${l.playlistId}` : "")
      : (l.videoId ? `https://www.youtube.com/watch?v=${l.videoId}` : "");
    $("#editUrlInput").value = currentUrl;

    renderEditPreview(isPl, currentUrl);
    $("#editContentModalOverlay").hidden = false;
    $("#editTitleInput").focus();
  }

  function renderEditPreview(isPl, url) {
    const box = $("#editPreviewBox");
    if (!box) return;
    if (isPl) {
      const plInfo = parsePlaylist(url);
      if (plInfo) {
        const thumbSrc = plInfo.videoId ? thumb(plInfo.videoId) : null;
        box.innerHTML = thumbSrc
          ? `<img src="${thumbSrc}" alt="Playlist thumbnail"><div><strong>Playlist recognized</strong><small>ID: ${plInfo.playlistId}</small></div>`
          : `<div class="preview-placeholder" style="background:#262238;color:#b9adff">≡</div><div><strong>Playlist recognized</strong><small>ID: ${plInfo.playlistId}</small></div>`;
      } else {
        box.innerHTML = '<div class="preview-placeholder" style="background:#262238;color:#b9adff">≡</div><div><strong>Playlist preview</strong><small>Paste a valid YouTube playlist URL (contains ?list=PL...).</small></div>';
      }
    } else {
      const vid = videoId(url);
      if (vid) {
        box.innerHTML = `<img src="${thumb(vid)}" alt="Thumbnail preview"><div><strong>Video recognized</strong><small>Thumbnail loaded · ID ${vid}</small></div>`;
      } else {
        box.innerHTML = '<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a valid YouTube video URL.</small></div>';
      }
    }
  }

  function closeEditContentModal() {
    $("#editContentModalOverlay").hidden = true;
  }

  $("#editUrlInput")?.addEventListener("input", () => {
    const isPl = $("#editIsPlaylist").value === "true";
    renderEditPreview(isPl, $("#editUrlInput").value);
  });

  $("#editContentModalClose")?.addEventListener("click", closeEditContentModal);
  $("#editContentCancelBtn")?.addEventListener("click", closeEditContentModal);
  $("#editContentModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#editContentModalOverlay")) closeEditContentModal();
  });

  $("#editContentForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const cid = $("#editCourseId").value;
    const mid = $("#editModuleId").value;
    const lid = $("#editLessonId").value;
    const isPl = $("#editIsPlaylist").value === "true";

    const c = state.courses.find(x => x.id === cid);
    const m = c?.modules.find(x => x.id === mid);
    const l = m?.lessons.find(x => x.id === lid);
    if (!c || !m || !l) return;

    const cleanTitle = $("#editTitleInput").value.trim();
    if (!cleanTitle) { notify("Title cannot be empty."); return; }
    const cleanModule = $("#editModuleInput").value.trim();
    if (!cleanModule) { notify("Module name cannot be empty."); return; }
    const url = $("#editUrlInput").value.trim();

    if (isPl) {
      const plInfo = parsePlaylist(url);
      if (!plInfo) { notify("Please enter a valid YouTube playlist URL."); return; }
      l.title = cleanTitle;
      l.isPlaylist = true;
      l.playlistId = plInfo.playlistId;
      l.videoId = plInfo.videoId || "videoseries";
    } else {
      const vid = videoId(url);
      if (!vid) { notify("Please enter a valid YouTube video URL."); return; }
      l.title = cleanTitle;
      l.videoId = vid;
      delete l.isPlaylist;
      delete l.playlistId;
    }

    let targetModule = c.modules.find(x => x.id !== m.id && x.name.toLowerCase() === cleanModule.toLowerCase());
    if (!targetModule && m.name.toLowerCase() !== cleanModule.toLowerCase()) {
      m.name = cleanModule;
    } else if (targetModule) {
      m.lessons = m.lessons.filter(x => x.id !== lid);
      targetModule.lessons.push(l);
      c.modules = c.modules.filter(x => x.lessons.length);
    }

    save();
    if (currentCourseId === cid && currentLessonId === lid) {
      openLesson(lid);
    }
    closeEditContentModal();
    notify(isPl ? "Playlist updated." : "Video updated.");
  });

  function renderAll(){
    renderDashboard();
    renderManagement();
    renderPictures();
    renderDocuments();
    renderThemeCards();
    if($("#page-analytics")?.classList.contains("active"))renderAnalytics();
  }

  function openCourse(cid,lid){
    const c=state.courses.find(x=>x.id===cid);if(!c)return;
    if(timerRunning)stopTimer(true);
    currentCourseId=cid;const target=lessons(c).find(l=>l.id===lid)||lessons(c).find(l=>l.id===c.lastWatched)||lessons(c)[0];
    if(!target){navigate("courses");notify("Add a lesson or playlist to this course first.");return;}
    openLesson(target.id);navigate("player");
  }

  function openLesson(lid, activePvid = null){
    const c=state.courses.find(x=>x.id===currentCourseId);if(!c)return;
    const l=lessons(c).find(x=>x.id===lid);if(!l)return;
    if(timerRunning)stopTimer(true);
    currentLessonId=lid;c.lastWatched=lid;persist();

    const isPl = !!(l.isPlaylist || l.playlistId);
    $("#playerCourseLabel").textContent=c.name;
    $("#curriculumTitle").textContent=c.name;
    $("#playerModuleLabel").textContent=(c.modules.find(m=>m.lessons.some(x=>x.id===lid))||{}).name||"NOW LEARNING";
    $("#playerLessonTitle").textContent=l.title;

    $("#playerLessonMeta").textContent = isPl
      ? (l.completed ? "Completed YouTube playlist · Progress saved" : "Interactive YouTube Playlist · Track list and continuous playback supported")
      : (l.completed ? "Completed lesson · Progress saved" : "Your progress is saved automatically on this device.");

    l.videos = Array.isArray(l.videos) ? l.videos : [];
    const sidePlaylistBtn = $("#tabPlaylistBtn");
    const sideCount = $("#sidePlaylistCount");

    if (isPl) {
      if (sidePlaylistBtn) {
        sidePlaylistBtn.hidden = false;
        if (sideCount) sideCount.textContent = l.videos.length;
      }

      let activeV = null;
      if (activePvid) {
        activeV = l.videos.find(v => v.id === activePvid);
        if (activeV) l.activeVideoRecordId = activeV.id;
      } else if (l.activeVideoRecordId) {
        activeV = l.videos.find(v => v.id === l.activeVideoRecordId);
      }

      if (activeV) {
        $("#playerLessonTitle").textContent = activeV.title;
        $("#playerLessonMeta").textContent = `Playing from playlist: "${l.title}" · Video ID: ${activeV.videoId}`;
        $("#videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${activeV.videoId}?autoplay=1&list=${l.playlistId}&rel=0&modestbranding=1" title="${esc(activeV.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        $("#completeButton").classList.toggle("done", !!activeV.completed);
        $("#completeButton").textContent = activeV.completed ? "✓ Video done — mark incomplete" : "✓ Mark video complete";
      } else if (l.videos.length > 0) {
        activeV = l.videos[0];
        l.activeVideoRecordId = activeV.id;
        $("#playerLessonTitle").textContent = activeV.title;
        $("#playerLessonMeta").textContent = `Playing #1 from playlist: "${l.title}" · Video ID: ${activeV.videoId}`;
        $("#videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${activeV.videoId}?autoplay=1&list=${l.playlistId}&rel=0&modestbranding=1" title="${esc(activeV.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        $("#completeButton").classList.toggle("done", !!activeV.completed);
        $("#completeButton").textContent = activeV.completed ? "✓ Video done — mark incomplete" : "✓ Mark video complete";
      } else {
        l.activeVideoRecordId = null;
        $("#playerLessonTitle").textContent = l.title;
        $("#playerLessonMeta").textContent = l.completed ? "Completed YouTube playlist · Progress saved" : "Interactive YouTube Playlist · Continuous player";
        $("#videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${l.playlistId}&rel=0&modestbranding=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        $("#completeButton").classList.toggle("done", !!l.completed);
        $("#completeButton").textContent = l.completed ? "✓ Completed — mark incomplete" : "✓ Mark complete";
      }

      switchSideTab("playlist");
      renderPlaylistSidePanel(l);
      setTimeout(() => {
        const activeItem = $("#sidePlaylistList .playlist-side-item.playing");
        if (activeItem) activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
    } else {
      if (sidePlaylistBtn) sidePlaylistBtn.hidden = true;
      switchSideTab("curriculum");
      $("#playerLessonTitle").textContent = l.title;
      $("#playerLessonMeta").textContent = l.completed ? "Completed lesson · Progress saved" : "Your progress is saved automatically on this device.";
      $("#videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${l.videoId}?rel=0&modestbranding=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      $("#completeButton").classList.toggle("done", !!l.completed);
      $("#completeButton").textContent = l.completed ? "✓ Completed — mark incomplete" : "✓ Mark complete";
    }

    const s = stats(c);
    $("#curriculumProgress").textContent = s.pct + "%";
    $("#curriculumBar").style.width = s.pct + "%";

    renderCurriculumList(c, lid);
    timerElapsedBeforeStart = 0; renderTimer();
  }

  function renderCurriculumList(c, lid) {
    const list = $("#curriculumList");
    if (!list) return;
    list.innerHTML = c.modules.map(m => `
      <div class="curriculum-module">${esc(m.name)}</div>
      ${m.lessons.map(x => {
        const isP = !!(x.isPlaylist || x.playlistId);
        const vCount = Array.isArray(x.videos) ? x.videos.length : 0;
        return `
          <div class="curriculum-lesson ${x.id === lid ? "selected" : ""} ${x.completed ? "done" : ""}" data-lesson="${x.id}" role="button" tabindex="0">
            <span class="lesson-play">${x.completed ? "✓" : (isP ? "≡" : "▶")}</span>
            <span>${isP ? `<strong style="font-size:9px;color:#c6bcff;display:block">PLAYLIST (${vCount})</strong>` : ""}${esc(x.title)}</span>
          </div>
        `;
      }).join("")}
    `).join("");
  }

  function switchSideTab(tabName) {
    const isPlaylist = tabName === "playlist";
    $("#tabCurriculumBtn")?.classList.toggle("active", !isPlaylist);
    $("#tabPlaylistBtn")?.classList.toggle("active", isPlaylist);
    if ($("#sideCurriculumView")) $("#sideCurriculumView").hidden = isPlaylist;
    if ($("#sidePlaylistView")) $("#sidePlaylistView").hidden = !isPlaylist;
  }

  $("#tabCurriculumBtn")?.addEventListener("click", () => switchSideTab("curriculum"));
  $("#tabPlaylistBtn")?.addEventListener("click", () => switchSideTab("playlist"));

  // Playlist Side Panel Functions
  function renderPlaylistSidePanel(l, filterText = "") {
    if (!l || !l.isPlaylist) return;
    l.videos = Array.isArray(l.videos) ? l.videos : [];

    $("#sidePlaylistTitle").textContent = l.title;
    const doneCount = l.videos.filter(v => v.completed).length;
    $("#sidePlaylistMeta").textContent = `${l.videos.length} video${l.videos.length === 1 ? "" : "s"} · ${doneCount} completed`;
    if ($("#sidePlaylistCount")) $("#sidePlaylistCount").textContent = l.videos.length;

    const container = $("#sidePlaylistList");
    if (!container) return;

    const query = (filterText || "").trim().toLowerCase();
    const filtered = query
      ? l.videos.filter(v => v.title.toLowerCase().includes(query) || v.videoId.toLowerCase().includes(query))
      : l.videos;

    if (l.videos.length === 0) {
      container.innerHTML = `
        <div class="empty-playlist-side">
          <p><strong>0 videos listed in this playlist</strong></p>
          <p class="muted small">Play the whole series via YouTube, or add video links to track each video in this side panel.</p>
          <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">
            <button type="button" class="mini-btn-action" id="sideEmptyAddBtn">＋ Add video</button>
            <button type="button" class="mini-btn-action" id="sideEmptyPasteBtn">📋 Paste URLs</button>
            <button type="button" class="mini-btn-action" id="sideEmptyFetchBtn">⚡ Auto-fetch</button>
          </div>
        </div>
      `;
      $("#sideEmptyAddBtn")?.addEventListener("click", () => openPlaylistVideoModal(l.id));
      $("#sideEmptyPasteBtn")?.addEventListener("click", () => openPlaylistPasteModal(l.id));
      $("#sideEmptyFetchBtn")?.addEventListener("click", () => handleFetchPlaylistVideos(l));
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="muted small" style="text-align:center;padding:18px 0">No videos match your search.</p>';
      return;
    }

    container.innerHTML = filtered.map(v => {
      const origIndex = l.videos.indexOf(v);
      const isPlaying = l.activeVideoRecordId === v.id;
      return `
        <div class="playlist-side-item ${isPlaying ? "playing" : ""} ${v.completed ? "done" : ""}" data-pvid="${v.id}" role="button" tabindex="0">
          <div class="ps-thumb-wrap">
            <img src="${thumb(v.videoId)}" alt="" class="ps-thumb" loading="lazy" onerror="this.style.display='none'">
            <span class="ps-index">#${origIndex + 1}</span>
            ${isPlaying ? '<span class="ps-playing-badge">▶</span>' : ''}
          </div>
          <div class="ps-info">
            <div class="ps-title" title="${esc(v.title)}">${esc(v.title)}</div>
            <div class="ps-meta">
              ${v.completed ? '<span class="badge-done">✓ Done</span>' : '<span class="badge-ready">Ready</span>'}
              <span class="ps-id-text">${v.videoId}</span>
            </div>
          </div>
          <div class="ps-item-actions">
            <button type="button" class="ps-btn-done" data-action="toggle-complete" data-pvid="${v.id}" title="${v.completed ? "Mark incomplete" : "Mark complete"}">${v.completed ? "✓" : "○"}</button>
            <button type="button" class="ps-btn-edit" data-action="edit-video" data-pvid="${v.id}" title="Edit title or URL">✎</button>
            <button type="button" class="ps-btn-delete" data-action="delete-video" data-pvid="${v.id}" title="Delete video from playlist">🗑</button>
          </div>
        </div>
      `;
    }).join("");
  }

  $("#sidePlaylistSearch")?.addEventListener("input", e => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;
    renderPlaylistSidePanel(l, e.target.value);
  });

  $("#sidePlayFullBtn")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;
    l.activeVideoRecordId = null;
    save();
    $("#playerLessonTitle").textContent = l.title;
    $("#playerLessonMeta").textContent = "Continuous YouTube playlist player";
    $("#videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${l.playlistId}&rel=0&modestbranding=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    $("#completeButton").classList.toggle("done", !!l.completed);
    $("#completeButton").textContent = l.completed ? "✓ Completed — mark incomplete" : "✓ Mark complete";
    renderPlaylistSidePanel(l, $("#sidePlaylistSearch")?.value);
    notify("Switched to full playlist series player.");
  });

  $("#sideAddVidBtn")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;
    openPlaylistVideoModal(l.id);
  });

  $("#sidePasteVidsBtn")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;
    openPlaylistPasteModal(l.id);
  });

  $("#sideFetchVidsBtn")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;
    handleFetchPlaylistVideos(l);
  });

  async function handleFetchPlaylistVideos(l) {
    if (!l || !l.playlistId) return;
    notify("Fetching playlist videos from YouTube...");
    const btn = $("#sideFetchVidsBtn");
    const origText = btn ? btn.textContent : "⚡ Fetch";
    if (btn) btn.textContent = "⏳ Fetching...";
    try {
      const fetched = await fetchPlaylistVideosFromYouTube(l.playlistId);
      if (fetched && fetched.length > 0) {
        l.videos = Array.isArray(l.videos) ? l.videos : [];
        let added = 0;
        fetched.forEach(item => {
          if (!l.videos.some(x => x.videoId === item.videoId)) {
            l.videos.push({
              id: uid(),
              videoId: item.videoId,
              title: item.title,
              completed: false,
              addedAt: new Date().toISOString()
            });
            added++;
          }
        });
        save();
        renderPlaylistSidePanel(l, $("#sidePlaylistSearch")?.value);
        renderManagement();
        notify(`Fetched ${fetched.length} videos from YouTube (${added} new added)!`);
      } else {
        notify("YouTube blocked direct fetch. Opening Paste dialog...");
        openPlaylistPasteModal(l.id);
      }
    } catch {
      notify("Could not fetch videos. You can paste URLs using Paste button.");
      openPlaylistPasteModal(l.id);
    } finally {
      if (btn) btn.textContent = origText;
    }
  }

  $("#sidePlaylistList")?.addEventListener("click", e => {
    const c = state.courses.find(x => x.id === currentCourseId); if (!c) return;
    const l = lessons(c).find(x => x.id === currentLessonId); if (!l || !l.isPlaylist) return;

    const btnDone = e.target.closest('[data-action="toggle-complete"]');
    if (btnDone) {
      e.stopPropagation();
      const pvid = btnDone.dataset.pvid;
      const v = (l.videos || []).find(x => x.id === pvid);
      if (!v) return;
      v.completed = !v.completed;
      l.completed = l.videos.length > 0 && l.videos.every(x => x.completed);
      save();
      renderPlaylistSidePanel(l, $("#sidePlaylistSearch")?.value);
      const s = stats(c);
      $("#curriculumProgress").textContent = s.pct + "%";
      $("#curriculumBar").style.width = s.pct + "%";
      renderCurriculumList(c, l.id);
      if (l.activeVideoRecordId === v.id) {
        $("#completeButton").classList.toggle("done", !!v.completed);
        $("#completeButton").textContent = v.completed ? "✓ Video done — mark incomplete" : "✓ Mark video complete";
      }
      notify(v.completed ? "Video marked complete." : "Video marked incomplete.");
      return;
    }

    const btnEdit = e.target.closest('[data-action="edit-video"]');
    if (btnEdit) {
      e.stopPropagation();
      const pvid = btnEdit.dataset.pvid;
      openPlaylistVideoModal(l.id, pvid);
      return;
    }

    const btnDel = e.target.closest('[data-action="delete-video"]');
    if (btnDel) {
      e.stopPropagation();
      const pvid = btnDel.dataset.pvid;
      const v = (l.videos || []).find(x => x.id === pvid);
      if (!v) return;
      if (confirm(`Remove "${v.title}" from this playlist?`)) {
        l.videos = l.videos.filter(x => x.id !== pvid);
        if (l.activeVideoRecordId === pvid) {
          l.activeVideoRecordId = l.videos.length > 0 ? l.videos[0].id : null;
        }
        save();
        openLesson(l.id, l.activeVideoRecordId);
        notify("Video removed from playlist.");
      }
      return;
    }

    const item = e.target.closest(".playlist-side-item");
    if (item && item.dataset.pvid) {
      const pvid = item.dataset.pvid;
      openLesson(l.id, pvid);
    }
  });

  // Modal: Add / Edit Single Video in Playlist
  function openPlaylistVideoModal(playlistLessonId, videoRecordId = null) {
    let targetLesson = null;
    for (const c of state.courses) {
      for (const m of (c.modules || [])) {
        const l = (m.lessons || []).find(x => x.id === playlistLessonId);
        if (l) { targetLesson = l; break; }
      }
      if (targetLesson) break;
    }
    if (!targetLesson) { notify("Playlist not found."); return; }

    targetLesson.videos = Array.isArray(targetLesson.videos) ? targetLesson.videos : [];
    $("#pvmPlaylistLessonId").value = playlistLessonId;
    $("#pvmVideoRecordId").value = videoRecordId || "";

    if (videoRecordId) {
      const v = targetLesson.videos.find(x => x.id === videoRecordId);
      if (!v) { notify("Video not found."); return; }
      $("#pvmModalTitle").textContent = "Edit video in playlist";
      $("#pvmTitleInput").value = v.title;
      $("#pvmUrlInput").value = `https://www.youtube.com/watch?v=${v.videoId}`;
      $("#pvmPreviewBox").innerHTML = `<img src="${thumb(v.videoId)}" alt=""><div><strong>Video recognized</strong><small>ID: ${v.videoId}</small></div>`;
    } else {
      $("#pvmModalTitle").textContent = `Add video to "${targetLesson.title}"`;
      $("#pvmTitleInput").value = "";
      $("#pvmUrlInput").value = "";
      $("#pvmPreviewBox").innerHTML = '<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a valid YouTube link</small></div>';
    }

    $("#playlistVideoModalOverlay").hidden = false;
    $("#pvmUrlInput").focus();
  }

  function closePlaylistVideoModal() {
    $("#playlistVideoModalOverlay").hidden = true;
    $("#playlistVideoForm")?.reset();
  }

  $("#pvmModalClose")?.addEventListener("click", closePlaylistVideoModal);
  $("#pvmCancelBtn")?.addEventListener("click", closePlaylistVideoModal);
  $("#playlistVideoModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#playlistVideoModalOverlay")) closePlaylistVideoModal();
  });

  $("#pvmUrlInput")?.addEventListener("input", () => {
    const id = videoId($("#pvmUrlInput").value);
    const box = $("#pvmPreviewBox");
    if (!box) return;
    box.innerHTML = id
      ? `<img src="${thumb(id)}" alt=""><div><strong>Video recognized</strong><small>Thumbnail loaded · ID ${id}</small></div>`
      : '<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a valid YouTube link</small></div>';
  });

  $("#playlistVideoForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const pLessonId = $("#pvmPlaylistLessonId").value;
    const vRecordId = $("#pvmVideoRecordId").value;
    const rawUrl = $("#pvmUrlInput").value;
    const id = videoId(rawUrl);
    const customTitle = $("#pvmTitleInput").value.trim();

    if (!id) { notify("Enter a valid YouTube video URL or ID."); return; }

    let targetLesson = null;
    for (const c of state.courses) {
      for (const m of (c.modules || [])) {
        const l = (m.lessons || []).find(x => x.id === pLessonId);
        if (l) { targetLesson = l; break; }
      }
      if (targetLesson) break;
    }
    if (!targetLesson) { notify("Playlist not found."); return; }
    targetLesson.videos = Array.isArray(targetLesson.videos) ? targetLesson.videos : [];

    if (vRecordId) {
      const v = targetLesson.videos.find(x => x.id === vRecordId);
      if (!v) { notify("Video not found."); return; }
      v.videoId = id;
      v.title = customTitle || v.title || `Video ${id}`;
      save();
      closePlaylistVideoModal();
      notify("Video updated.");
      if (currentLessonId === targetLesson.id && targetLesson.activeVideoRecordId === v.id) {
        openLesson(targetLesson.id, v.id);
      } else if (currentLessonId === targetLesson.id) {
        renderPlaylistSidePanel(targetLesson, $("#sidePlaylistSearch")?.value);
      }
    } else {
      const newV = {
        id: uid(),
        videoId: id,
        title: customTitle || `Video ${targetLesson.videos.length + 1}`,
        completed: false,
        addedAt: new Date().toISOString()
      };
      targetLesson.videos.push(newV);
      save();
      closePlaylistVideoModal();
      notify("Video added to playlist.");
      if (currentLessonId === targetLesson.id) {
        renderPlaylistSidePanel(targetLesson, $("#sidePlaylistSearch")?.value);
        if (targetLesson.videos.length === 1) {
          openLesson(targetLesson.id, newV.id);
        }
      }
    }
    renderManagement();
  });

  // Modal: Batch Paste Videos into Playlist
  function openPlaylistPasteModal(playlistLessonId) {
    let targetLesson = null;
    for (const c of state.courses) {
      for (const m of (c.modules || [])) {
        const l = (m.lessons || []).find(x => x.id === playlistLessonId);
        if (l) { targetLesson = l; break; }
      }
      if (targetLesson) break;
    }
    if (!targetLesson) { notify("Playlist not found."); return; }

    $("#ppmPlaylistLessonId").value = playlistLessonId;
    $("#ppmModalTitle").textContent = `Paste videos for "${targetLesson.title}"`;
    $("#ppmUrlsInput").value = "";
    $("#ppmCounter").textContent = "0 valid YouTube links detected";
    $("#playlistPasteModalOverlay").hidden = false;
    $("#ppmUrlsInput").focus();
  }

  function closePlaylistPasteModal() {
    $("#playlistPasteModalOverlay").hidden = true;
    $("#playlistPasteForm")?.reset();
  }

  $("#ppmModalClose")?.addEventListener("click", closePlaylistPasteModal);
  $("#ppmCancelBtn")?.addEventListener("click", closePlaylistPasteModal);
  $("#playlistPasteModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#playlistPasteModalOverlay")) closePlaylistPasteModal();
  });

  $("#ppmUrlsInput")?.addEventListener("input", () => {
    const lines = $("#ppmUrlsInput").value.split("\n").map(l => l.trim()).filter(Boolean);
    const validCount = lines.filter(l => !!videoId(l)).length;
    const counter = $("#ppmCounter");
    if (counter) counter.textContent = `${validCount} valid YouTube link${validCount === 1 ? "" : "s"} detected (${lines.length} total lines)`;
  });

  $("#playlistPasteForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const pLessonId = $("#ppmPlaylistLessonId").value;
    const lines = $("#ppmUrlsInput").value.split("\n").map(l => l.trim()).filter(Boolean);
    const validIds = lines.map(l => videoId(l)).filter(Boolean);

    if (!validIds.length) { notify("No valid YouTube URLs found."); return; }

    let targetLesson = null;
    for (const c of state.courses) {
      for (const m of (c.modules || [])) {
        const l = (m.lessons || []).find(x => x.id === pLessonId);
        if (l) { targetLesson = l; break; }
      }
      if (targetLesson) break;
    }
    if (!targetLesson) { notify("Playlist not found."); return; }
    targetLesson.videos = Array.isArray(targetLesson.videos) ? targetLesson.videos : [];

    let addedCount = 0;
    lines.forEach(line => {
      const parsed = parseVideoLine(line, targetLesson.videos.length + 1);
      if (parsed) {
        targetLesson.videos.push({
          id: uid(),
          videoId: parsed.videoId,
          title: parsed.title,
          completed: false,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }
    });

    save();
    closePlaylistPasteModal();
    notify(`Imported ${addedCount} videos into playlist.`);
    if (currentLessonId === targetLesson.id) {
      openLesson(targetLesson.id);
    }
    renderManagement();
  });

  // Edit Course Modal Functions
  function openEditCourseModal(courseId) {
    const c = state.courses.find(x => x.id === courseId);
    if (!c) return;
    $("#editCourseIdInput").value = c.id;
    $("#editCourseNameInput").value = c.name;
    if ($("#editCourseCategorySelect")) $("#editCourseCategorySelect").value = c.category || "General";
    $("#editCourseDescInput").value = c.description || "";
    $("#editCourseModalOverlay").hidden = false;
    $("#editCourseNameInput").focus();
  }

  function closeEditCourseModal() {
    $("#editCourseModalOverlay").hidden = true;
    $("#editCourseForm")?.reset();
  }

  $("#editCourseModalClose")?.addEventListener("click", closeEditCourseModal);
  $("#editCourseCancelBtn")?.addEventListener("click", closeEditCourseModal);
  $("#editCourseModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#editCourseModalOverlay")) closeEditCourseModal();
  });

  $("#editCourseForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const cid = $("#editCourseIdInput").value;
    const c = state.courses.find(x => x.id === cid);
    if (!c) return;
    const cleanName = $("#editCourseNameInput").value.trim();
    if (!cleanName) { notify("Course name cannot be empty."); return; }
    c.name = cleanName;
    c.category = $("#editCourseCategorySelect")?.value || "General";
    c.description = $("#editCourseDescInput").value.trim();
    closeEditCourseModal();
    save();
    notify("Course updated.");
  });

  // Course Form
  $("#courseForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#courseName").value.trim();
    if (!name) return;
    const category = $("#courseCategory") ? $("#courseCategory").value : "General";
    state.courses.push({
      id: uid(),
      name,
      category: category || "General",
      description: $("#courseDescription").value.trim(),
      createdAt: new Date().toISOString(),
      modules: [],
      lastWatched: null
    });
    $("#courseForm").reset();
    save();
    notify("Course created.");
  });

  // Single Video Form
  $("#lessonForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const c=state.courses.find(x=>x.id===$("#lessonCourse").value);
    const id=videoId($("#videoUrl").value);
    const mn=$("#moduleName").value.trim();
    const customTitle=$("#videoTitle")?.value.trim();
    if(!c){notify("Create and select a course first.");return;}
    if(!id){notify("Enter a valid YouTube video URL.");return;}
    if(!mn){notify("Enter a module name.");return;}

    let m=c.modules.find(x=>x.name.toLowerCase()===mn.toLowerCase());
    if(!m){m={id:uid(),name:mn,lessons:[]};c.modules.push(m);}
    const title = customTitle || `YouTube lesson ${m.lessons.length+1}`;
    m.lessons.push({id:uid(),videoId:id,title:title,completed:false,addedAt:new Date().toISOString()});
    $("#lessonForm").reset();
    $("#videoPreview").innerHTML='<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a YouTube URL to preview its thumbnail.</small></div>';
    save();
    notify("Video added to course.");
  });

  $("#videoUrl")?.addEventListener("input",()=>{
    const id=videoId($("#videoUrl").value),box=$("#videoPreview");
    box.innerHTML=id?`<img src="${thumb(id)}" alt="YouTube thumbnail"><div><strong>Video recognized</strong><small>Thumbnail loaded · ID ${id}</small></div>`:'<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a valid YouTube video URL.</small></div>';
  });

  // YouTube Playlist Form
  $("#playlistUrl")?.addEventListener("input", () => {
    const info = parsePlaylist($("#playlistUrl").value);
    const box = $("#playlistPreview");
    if (!box) return;
    if (info) {
      const thumbSrc = info.videoId ? thumb(info.videoId) : null;
      box.innerHTML = thumbSrc
        ? `<img src="${thumbSrc}" alt="Playlist first video thumbnail"><div><strong>Playlist recognized</strong><small>ID: ${info.playlistId}</small></div>`
        : `<div class="preview-placeholder" style="background:#262238;color:#b9adff">≡</div><div><strong>Playlist recognized</strong><small>ID: ${info.playlistId} · Full series player ready</small></div>`;
    } else {
      box.innerHTML = '<div class="preview-placeholder" style="background:#262238;color:#b9adff">≡</div><div><strong>Playlist preview</strong><small>Paste a YouTube playlist URL (contains ?list=PL...).</small></div>';
    }
  });

  $("#playlistVideosInput")?.addEventListener("input", () => {
    const lines = ($("#playlistVideosInput").value || "").split("\n").map(l => l.trim()).filter(Boolean);
    const count = lines.filter(l => !!videoId(l)).length;
    const counter = $("#formPlaylistVideosCounter");
    if (counter) counter.textContent = `${count} video${count === 1 ? "" : "s"} detected`;
  });

  $("#formFetchPlaylistBtn")?.addEventListener("click", async () => {
    const urlVal = $("#playlistUrl")?.value.trim();
    const info = parsePlaylist(urlVal);
    if (!info || !info.playlistId) {
      notify("Enter a valid YouTube playlist URL first.");
      return;
    }
    const btn = $("#formFetchPlaylistBtn");
    const origText = btn ? btn.textContent : "⚡ Fetch from YouTube";
    if (btn) btn.textContent = "⏳ Fetching...";
    notify("Fetching playlist videos from YouTube...");
    try {
      const fetched = await fetchPlaylistVideosFromYouTube(info.playlistId);
      if (fetched && fetched.length > 0) {
        const textarea = $("#playlistVideosInput");
        if (textarea) {
          textarea.value = fetched.map(v => `https://www.youtube.com/watch?v=${v.videoId}`).join("\n");
          const counter = $("#formPlaylistVideosCounter");
          if (counter) counter.textContent = `${fetched.length} videos detected`;
        }
        notify(`Found ${fetched.length} videos!`);
      } else {
        notify("YouTube blocked direct browser fetch. Paste video links manually in the box.");
      }
    } catch {
      notify("Could not fetch videos from YouTube. Paste links in the box.");
    } finally {
      if (btn) btn.textContent = origText;
    }
  });

  $("#playlistForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const c = state.courses.find(x => x.id === $("#playlistCourse").value);
    const info = parsePlaylist($("#playlistUrl").value);
    const mn = $("#playlistModuleName").value.trim();
    const title = $("#playlistTitle").value.trim();

    if (!c) { notify("Select a course first."); return; }
    if (!info) { notify("Enter a valid YouTube playlist URL (must contain ?list=PL...)."); return; }
    if (!mn) { notify("Enter a module name."); return; }
    if (!title) { notify("Enter a playlist title."); return; }

    const vidLines = ($("#playlistVideosInput")?.value || "").split("\n").map(l => l.trim()).filter(Boolean);
    const initialVideos = [];
    vidLines.forEach((line, idx) => {
      const parsed = parseVideoLine(line, idx + 1);
      if (parsed && !initialVideos.some(x => x.videoId === parsed.videoId)) {
        initialVideos.push({
          id: uid(),
          videoId: parsed.videoId,
          title: parsed.title,
          completed: false,
          addedAt: new Date().toISOString()
        });
      }
    });

    let m = c.modules.find(x => x.name.toLowerCase() === mn.toLowerCase());
    if (!m) {
      m = { id: uid(), name: mn, lessons: [] };
      c.modules.push(m);
    }

    const firstVidId = initialVideos.length > 0 ? initialVideos[0].videoId : (info.videoId || "videoseries");
    m.lessons.push({
      id: uid(),
      isPlaylist: true,
      playlistId: info.playlistId,
      videoId: firstVidId,
      activeVideoRecordId: initialVideos.length > 0 ? initialVideos[0].id : null,
      title: title,
      completed: false,
      addedAt: new Date().toISOString(),
      videos: initialVideos
    });

    $("#playlistForm").reset();
    $("#playlistPreview").innerHTML = '<div class="preview-placeholder" style="background:#262238;color:#b9adff">≡</div><div><strong>Playlist preview</strong><small>Paste a YouTube playlist URL (contains ?list=PL...).</small></div>';
    if ($("#formPlaylistVideosCounter")) $("#formPlaylistVideosCounter").textContent = "0 videos detected";
    save();
    notify(`Playlist "${title}" added to course (${initialVideos.length} videos).`);
  });

  // Batch URLs Form
  $("#bulkUrls")?.addEventListener("input", () => {
    const lines = $("#bulkUrls").value.split("\n").map(l => l.trim()).filter(Boolean);
    const validCount = lines.filter(l => !!videoId(l)).length;
    const counter = $("#bulkCounter");
    if (counter) counter.textContent = `${validCount} valid YouTube link${validCount === 1 ? "" : "s"} detected (${lines.length} total lines)`;
  });

  $("#bulkForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const c = state.courses.find(x => x.id === $("#bulkCourse").value);
    const mn = $("#bulkModuleName").value.trim();
    const lines = $("#bulkUrls").value.split("\n").map(l => l.trim()).filter(Boolean);
    if (!c) { notify("Select a course first."); return; }
    if (!mn) { notify("Enter a module name."); return; }

    let added = 0;
    lines.forEach(line => {
      const parsed = parseVideoLine(line, m.lessons.length + 1);
      if (parsed) {
        m.lessons.push({
          id: uid(),
          videoId: parsed.videoId,
          title: parsed.title,
          completed: false,
          addedAt: new Date().toISOString()
        });
        added++;
      }
    });

    if (!added) { notify("No valid YouTube video URLs found in the text."); return; }

    $("#bulkForm").reset();
    $("#bulkCounter").textContent = "0 valid YouTube links detected";
    save();
    notify(`${added} video${added === 1 ? "" : "s"} imported into course.`);
  });

  // Pictures Form & Controls
  $("#openAddPicBtn")?.addEventListener("click", () => openAddPicModal());
  $("#emptyAddPicBtn")?.addEventListener("click", () => openAddPicModal());
  $("#picModalClose")?.addEventListener("click", closePicModal);
  $("#picCancelBtn")?.addEventListener("click", closePicModal);
  $("#picModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#picModalOverlay")) closePicModal();
  });

  // Dropzone interactions for Pictures
  const dropZone = $("#picDropZone");
  const fileInput = $("#picFileInput");
  dropZone?.addEventListener("click", e => {
    if (e.target.closest("#picRotateBtn") || e.target.closest("#picChangeImgBtn")) return;
    fileInput?.click();
  });
  $("#picChangeImgBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    fileInput?.click();
  });

  fileInput?.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imgInfo = await processImageFile(file);
      setStagedImage(imgInfo, true);
    } catch (err) {
      notify(err.message || "Failed to load picture.");
    } finally {
      e.target.value = "";
    }
  });

  dropZone?.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone?.addEventListener("drop", async e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const imgInfo = await processImageFile(file);
      setStagedImage(imgInfo, true);
    } catch (err) {
      notify(err.message || "Failed to load picture.");
    }
  });

  $("#picRotateBtn")?.addEventListener("click", async e => {
    e.stopPropagation();
    if (!stagedImageData || !stagedImageData.dataUrl) return;
    try {
      const rotated = await rotateImageDataUrl(stagedImageData.dataUrl, 90);
      stagedImageData.dataUrl = rotated.dataUrl;
      stagedImageData.width = rotated.width;
      stagedImageData.height = rotated.height;
      stagedImageData.sizeBytes = rotated.sizeBytes;
      $("#picPreviewImg").src = rotated.dataUrl;
      $("#picPreviewInfo").textContent = `${rotated.width} × ${rotated.height} px · ${formatBytes(rotated.sizeBytes)}`;
      notify("Picture rotated 90°.");
    } catch {
      notify("Failed to rotate picture.");
    }
  });

  // Save / Submit Picture Form
  $("#picForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!stagedImageData || !stagedImageData.dataUrl) {
      notify("Please choose, drop, or paste a picture file.");
      return;
    }
    const title = $("#picTitleInput").value.trim();
    if (!title) {
      notify("Please provide a title for this picture.");
      return;
    }
    const category = $("#picCategoryInput").value || "Diagram";
    const courseId = $("#picCourseSelect").value || null;
    const details = $("#picDetailsInput").value.trim();
    const now = new Date().toISOString();

    if (editingPicId) {
      const idx = picturesList.findIndex(x => x.id === editingPicId);
      if (idx >= 0) {
        const updated = {
          ...picturesList[idx],
          title,
          category,
          courseId,
          details,
          dataUrl: stagedImageData.dataUrl,
          width: stagedImageData.width,
          height: stagedImageData.height,
          sizeBytes: stagedImageData.sizeBytes,
          updatedAt: now
        };
        await PicDB.save(updated);
        picturesList[idx] = updated;
        notify("Picture details updated.");
      }
    } else {
      const newPic = {
        id: uid(),
        title,
        category,
        courseId,
        details,
        dataUrl: stagedImageData.dataUrl,
        width: stagedImageData.width,
        height: stagedImageData.height,
        sizeBytes: stagedImageData.sizeBytes,
        originalName: stagedImageData.originalName || "image.jpg",
        createdAt: now,
        updatedAt: now
      };
      await PicDB.save(newPic);
      picturesList.unshift(newPic);
      notify("Picture saved.");
    }

    closePicModal();
    renderPictures();
  });

  // Picture Filters
  $("#picSearchInput")?.addEventListener("input", e => {
    picFilterState.search = e.target.value.trim();
    const clearBtn = $("#picClearSearch");
    if (clearBtn) clearBtn.hidden = !picFilterState.search;
    renderPictures();
  });
  $("#picClearSearch")?.addEventListener("click", () => {
    const inp = $("#picSearchInput");
    if (inp) inp.value = "";
    picFilterState.search = "";
    $("#picClearSearch").hidden = true;
    renderPictures();
  });
  $("#picCategoryFilter")?.addEventListener("change", e => {
    picFilterState.category = e.target.value;
    renderPictures();
  });
  $("#picCourseFilter")?.addEventListener("change", e => {
    picFilterState.courseId = e.target.value;
    renderPictures();
  });
  $("#picSortOrder")?.addEventListener("change", e => {
    picFilterState.sort = e.target.value;
    renderPictures();
  });

  // Lightbox Interactions
  $("#lightboxClose")?.addEventListener("click", closeLightbox);
  $("#picLightboxOverlay")?.addEventListener("click", e => {
    if (e.target === $("#picLightboxOverlay")) closeLightbox();
  });
  const zoomToggle = () => $("#lightboxImg")?.classList.toggle("zoomed");
  $("#lightboxZoomToggle")?.addEventListener("click", zoomToggle);
  $("#lightboxImg")?.addEventListener("click", zoomToggle);
  $("#lightboxDownloadBtn")?.addEventListener("click", () => {
    const p = picturesList.find(x => x.id === currentViewingPicId);
    if (!p) return;
    const safeTitle = (p.title || "focuslearn-image").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadDataUrl(p.dataUrl, `${safeTitle}.jpg`);
  });
  $("#lightboxEditBtn")?.addEventListener("click", () => {
    if (currentViewingPicId) openEditPicModal(currentViewingPicId);
  });
  $("#lightboxDeleteBtn")?.addEventListener("click", () => {
    if (currentViewingPicId) handleDeletePic(currentViewingPicId);
  });

  // Global Paste Listener
  document.addEventListener("paste", async e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;
        try {
          const imgInfo = await processImageFile(file);
          if ($("#picModalOverlay")?.hidden) {
            openAddPicModal();
          }
          setStagedImage(imgInfo, true);
          notify("Image pasted from clipboard.");
        } catch (err) {
          notify(err.message || "Failed to paste image.");
        }
        break;
      }
    }
  });

  // Documents (Notes & PDFs) Controls & Listeners
  $("#openAddNoteBtn")?.addEventListener("click", () => openAddNoteModal());
  $("#emptyAddNoteBtn")?.addEventListener("click", () => openAddNoteModal());
  $("#openAddPdfBtn")?.addEventListener("click", () => openAddPdfModal());
  $("#emptyAddPdfBtn")?.addEventListener("click", () => openAddPdfModal());

  // Note Modal Actions
  $("#docNoteModalClose")?.addEventListener("click", closeNoteModal);
  $("#docNoteCancelBtn")?.addEventListener("click", closeNoteModal);
  $("#docNoteModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#docNoteModalOverlay")) closeNoteModal();
  });

  // Note Form Submit (Modal)
  $("#docNoteForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const title = $("#docNoteTitle").value.trim();
    if (!title) { notify("Please enter a note title."); return; }
    const category = $("#docNoteCategory").value || "Lecture Notes";
    const courseId = $("#docNoteCourse").value || null;
    const details = $("#docNoteDetails").value.trim();
    const content = $("#docNoteContent").value.trim();
    if (!content) { notify("Note content cannot be empty."); return; }
    const now = new Date().toISOString();

    if (editingDocId) {
      const idx = docsList.findIndex(x => x.id === editingDocId);
      if (idx >= 0) {
        const updated = {
          ...docsList[idx],
          title,
          category,
          courseId,
          details,
          content,
          updatedAt: now
        };
        await DocDB.save(updated);
        docsList[idx] = updated;
        notify("Note details updated.");
      }
    } else {
      const newNote = {
        id: uid(),
        type: "note",
        title,
        category,
        courseId,
        details,
        content,
        createdAt: now,
        updatedAt: now
      };
      await DocDB.save(newNote);
      docsList.unshift(newNote);
      notify("Note saved.");
    }

    closeNoteModal();
    renderDocuments();
    renderDashboard();
  });

  // Quick In-Page Note Creator Form
  $("#quickNoteForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const title = $("#qNoteTitle").value.trim();
    if (!title) { notify("Please enter a note title."); return; }
    const category = $("#qNoteCategory").value || "Lecture Notes";
    const courseId = $("#qNoteCourse").value || null;
    const details = $("#qNoteDetails").value.trim();
    const content = $("#qNoteContent").value.trim();
    if (!content) { notify("Note content cannot be empty."); return; }
    const now = new Date().toISOString();

    const newNote = {
      id: uid(),
      type: "note",
      title,
      category,
      courseId,
      details,
      content,
      createdAt: now,
      updatedAt: now
    };
    await DocDB.save(newNote);
    docsList.unshift(newNote);
    $("#quickNoteForm").reset();
    notify("Note saved to library.");
    switchDocTab("notes");
    renderDashboard();
  });

  // PDF Dropzone & File Pickers
  const docPdfDropZone = $("#docPdfDropZone");
  const docPdfFileInput = $("#docPdfFileInput");
  docPdfDropZone?.addEventListener("click", () => docPdfFileInput?.click());
  $("#docPdfChangeFileBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    docPdfFileInput?.click();
  });

  docPdfFileInput?.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const pdfInfo = await readPdfFile(file);
      stagedPdfData = pdfInfo;
      $("#docPdfPreviewName").textContent = pdfInfo.fileName;
      $("#docPdfPreviewInfo").textContent = formatBytes(pdfInfo.fileSize);
      $("#docPdfDropEmpty").hidden = true;
      $("#docPdfDropPreview").hidden = false;
      if (!$("#docPdfTitle").value.trim()) {
        const cleanName = pdfInfo.fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
        $("#docPdfTitle").value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    } catch (err) {
      notify(err.message || "Failed to read PDF file.");
    } finally {
      e.target.value = "";
    }
  });

  docPdfDropZone?.addEventListener("dragover", e => {
    e.preventDefault();
    docPdfDropZone.classList.add("dragover");
  });
  docPdfDropZone?.addEventListener("dragleave", () => {
    docPdfDropZone.classList.remove("dragover");
  });
  docPdfDropZone?.addEventListener("drop", async e => {
    e.preventDefault();
    docPdfDropZone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const pdfInfo = await readPdfFile(file);
      stagedPdfData = pdfInfo;
      $("#docPdfPreviewName").textContent = pdfInfo.fileName;
      $("#docPdfPreviewInfo").textContent = formatBytes(pdfInfo.fileSize);
      $("#docPdfDropEmpty").hidden = true;
      $("#docPdfDropPreview").hidden = false;
      if (!$("#docPdfTitle").value.trim()) {
        const cleanName = pdfInfo.fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
        $("#docPdfTitle").value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    } catch (err) {
      notify(err.message || "Failed to read PDF file.");
    }
  });

  // PDF Modal Actions
  $("#docPdfModalClose")?.addEventListener("click", closePdfModal);
  $("#docPdfCancelBtn")?.addEventListener("click", closePdfModal);
  $("#docPdfModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#docPdfModalOverlay")) closePdfModal();
  });

  // PDF Form Submit
  $("#docPdfForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!stagedPdfData || !stagedPdfData.pdfData) {
      notify("Please choose or drag & drop a PDF file.");
      return;
    }
    const title = $("#docPdfTitle").value.trim();
    if (!title) { notify("Please provide a title for this PDF."); return; }
    const category = $("#docPdfCategory").value || "Lecture Slides";
    const courseId = $("#docPdfCourse").value || null;
    const details = $("#docPdfDetails").value.trim();
    const now = new Date().toISOString();

    if (editingDocId) {
      const idx = docsList.findIndex(x => x.id === editingDocId);
      if (idx >= 0) {
        const updated = {
          ...docsList[idx],
          title,
          category,
          courseId,
          details,
          pdfData: stagedPdfData.pdfData,
          fileName: stagedPdfData.fileName,
          fileSize: stagedPdfData.fileSize,
          updatedAt: now
        };
        await DocDB.save(updated);
        docsList[idx] = updated;
        notify("PDF details updated.");
      }
    } else {
      const newPdf = {
        id: uid(),
        type: "pdf",
        title,
        category,
        courseId,
        details,
        pdfData: stagedPdfData.pdfData,
        fileName: stagedPdfData.fileName,
        fileSize: stagedPdfData.fileSize,
        createdAt: now,
        updatedAt: now
      };
      await DocDB.save(newPdf);
      docsList.unshift(newPdf);
      notify("PDF document saved.");
    }

    closePdfModal();
    renderDocuments();
    renderDashboard();
  });

  // Document Tab Navigation
  document.addEventListener("click", e => {
    const tabBtn = e.target.closest("[data-doc-tab]");
    if (tabBtn) {
      switchDocTab(tabBtn.dataset.docTab);
      return;
    }

    // Add content mode tabs (video / playlist / bulk)
    const addModeTab = e.target.closest("[data-add-mode]");
    if (addModeTab) {
      const mode = addModeTab.dataset.addMode;
      $$(".type-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.addMode === mode));
      const lForm = $("#lessonForm"); if (lForm) lForm.hidden = (mode !== "video");
      const pForm = $("#playlistForm"); if (pForm) pForm.hidden = (mode !== "playlist");
      const bForm = $("#bulkForm"); if (bForm) bForm.hidden = (mode !== "bulk");
      return;
    }
  });

  // Document Filters & Search
  $("#docSearchInput")?.addEventListener("input", e => {
    docFilterState.search = e.target.value.trim();
    const clearBtn = $("#docClearSearch");
    if (clearBtn) clearBtn.hidden = !docFilterState.search;
    renderDocuments();
  });
  $("#docClearSearch")?.addEventListener("click", () => {
    const inp = $("#docSearchInput");
    if (inp) inp.value = "";
    docFilterState.search = "";
    $("#docClearSearch").hidden = true;
    renderDocuments();
  });
  $("#docCategoryFilter")?.addEventListener("change", e => {
    docFilterState.category = e.target.value;
    renderDocuments();
  });
  $("#docCourseFilter")?.addEventListener("change", e => {
    docFilterState.courseId = e.target.value;
    renderDocuments();
  });
  $("#docSortOrder")?.addEventListener("change", e => {
    docFilterState.sort = e.target.value;
    renderDocuments();
  });

  // Note Viewer Modal Controls
  $("#viewNoteClose")?.addEventListener("click", closeNoteViewer);
  $("#docNoteViewModal")?.addEventListener("click", e => {
    if (e.target === $("#docNoteViewModal")) closeNoteViewer();
  });
  $("#viewNoteCopyBtn")?.addEventListener("click", () => {
    const d = docsList.find(x => x.id === currentViewingNoteId);
    if (!d || !d.content) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(d.content).then(() => notify("Note copied to clipboard."));
    } else {
      notify("Clipboard copy not supported in this browser.");
    }
  });
  $("#viewNoteDownloadBtn")?.addEventListener("click", () => {
    const d = docsList.find(x => x.id === currentViewingNoteId);
    if (!d) return;
    const safeTitle = (d.title || "study-note").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(d.content, `${safeTitle}.txt`);
  });
  $("#viewNoteEditBtn")?.addEventListener("click", () => {
    if (currentViewingNoteId) openEditNoteModal(currentViewingNoteId);
  });
  $("#viewNoteDeleteBtn")?.addEventListener("click", () => {
    if (currentViewingNoteId) handleDeleteDoc(currentViewingNoteId);
  });

  // PDF Viewer Modal Controls
  $("#viewPdfClose")?.addEventListener("click", closePdfViewer);
  $("#docPdfViewModal")?.addEventListener("click", e => {
    if (e.target === $("#docPdfViewModal")) closePdfViewer();
  });
  $("#viewPdfDownloadBtn")?.addEventListener("click", () => {
    const d = docsList.find(x => x.id === currentViewingPdfId);
    if (!d || !d.pdfData) return;
    const safeName = d.fileName || `${(d.title || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    downloadDataUrl(d.pdfData, safeName);
  });
  $("#viewPdfEditBtn")?.addEventListener("click", () => {
    if (currentViewingPdfId) openEditPdfModal(currentViewingPdfId);
  });
  $("#viewPdfDeleteBtn")?.addEventListener("click", () => {
    if (currentViewingPdfId) handleDeleteDoc(currentViewingPdfId);
  });

  // Player Navigation Buttons
  $("#playerCoursePicsBtn")?.addEventListener("click", () => {
    if (currentCourseId) {
      picFilterState.courseId = currentCourseId;
      const select = $("#picCourseFilter");
      if (select) select.value = currentCourseId;
    }
    navigate("pictures");
  });
  $("#playerCourseNotesBtn")?.addEventListener("click", () => {
    if (currentCourseId) {
      docFilterState.courseId = currentCourseId;
      const select = $("#docCourseFilter");
      if (select) select.value = currentCourseId;
    }
    navigate("notes");
  });

  // Global Click Handlers
  document.addEventListener("click", e => {
    const n = e.target.closest("[data-page]"); if (n) { navigate(n.dataset.page); return; }
    const go = e.target.closest("[data-go]"); if (go) { navigate(go.dataset.go); return; }
    const op = e.target.closest("[data-open-course]"); if (op) { openCourse(op.dataset.openCourse); return; }
    const play = e.target.closest("[data-play]"); if (play) { const [c,l] = play.dataset.play.split("|"); openCourse(c,l); return; }
    const lesson = e.target.closest("[data-lesson]"); if (lesson) { openLesson(lesson.dataset.lesson); return; }

    // Picture actions
    const vp = e.target.closest("[data-view-pic]");
    if (vp) { openLightbox(vp.dataset.viewPic); return; }
    const ep = e.target.closest("[data-edit-pic]");
    if (ep) { openEditPicModal(ep.dataset.editPic); return; }
    const dp = e.target.closest("[data-delete-pic]");
    if (dp) { handleDeletePic(dp.dataset.deletePic); return; }

    // Note actions
    const vn = e.target.closest("[data-view-note]");
    if (vn) { openNoteViewer(vn.dataset.viewNote); return; }
    const en = e.target.closest("[data-edit-note]");
    if (en) { openEditNoteModal(en.dataset.editNote); return; }

    // PDF actions
    const vpdf = e.target.closest("[data-view-pdf]");
    if (vpdf) { openPdfViewer(vpdf.dataset.viewPdf); return; }
    const epdf = e.target.closest("[data-edit-pdf]");
    if (epdf) { openEditPdfModal(epdf.dataset.editPdf); return; }
    const dpdf = e.target.closest("[data-download-pdf]");
    if (dpdf) {
      const d = docsList.find(x => x.id === dpdf.dataset.downloadPdf);
      if (d && d.pdfData) downloadDataUrl(d.pdfData, d.fileName || "document.pdf");
      return;
    }

    // Delete Document (Note or PDF)
    const delDoc = e.target.closest("[data-delete-doc]");
    if (delDoc) { handleDeleteDoc(delDoc.dataset.deleteDoc); return; }

    // Playlist expanded sublist toggles & actions
    const toggleExp = e.target.closest("[data-toggle-playlist-expand]");
    if (toggleExp) {
      const lid = toggleExp.dataset.togglePlaylistExpand;
      if (expandedPlaylistIds.has(lid)) expandedPlaylistIds.delete(lid);
      else expandedPlaylistIds.add(lid);
      renderManagement();
      return;
    }

    const addVidPl = e.target.closest("[data-add-vid-playlist]");
    if (addVidPl) {
      const [cid, mid, lid] = addVidPl.dataset.addVidPlaylist.split("|");
      openPlaylistVideoModal(lid);
      return;
    }

    const pasteVidsPl = e.target.closest("[data-paste-vids-playlist]");
    if (pasteVidsPl) {
      const [cid, mid, lid] = pasteVidsPl.dataset.pasteVidsPlaylist.split("|");
      openPlaylistPasteModal(lid);
      return;
    }

    const playPvid = e.target.closest("[data-play-pvid]");
    if (playPvid) {
      const [cid, lid, pvid] = playPvid.dataset.playPvid.split("|");
      openCourse(cid, lid);
      openLesson(lid, pvid);
      navigate("player");
      return;
    }

    const editPvid = e.target.closest("[data-edit-pvid]");
    if (editPvid) {
      const [cid, mid, lid, pvid] = editPvid.dataset.editPvid.split("|");
      openPlaylistVideoModal(lid, pvid);
      return;
    }

    const delPvid = e.target.closest("[data-delete-pvid]");
    if (delPvid) {
      const [cid, mid, lid, pvid] = delPvid.dataset.deletePvid.split("|");
      const c = state.courses.find(x => x.id === cid), m = c?.modules.find(x => x.id === mid);
      const l = m?.lessons.find(x => x.id === lid);
      if (l && Array.isArray(l.videos)) {
        const v = l.videos.find(x => x.id === pvid);
        if (v && confirm(`Remove "${v.title}" from this playlist?`)) {
          l.videos = l.videos.filter(x => x.id !== pvid);
          if (l.activeVideoRecordId === pvid) {
            l.activeVideoRecordId = l.videos.length > 0 ? l.videos[0].id : null;
          }
          save();
          renderManagement();
          if (currentLessonId === l.id) {
            openLesson(l.id, l.activeVideoRecordId);
          }
          notify("Video removed from playlist.");
        }
      }
      return;
    }

    // Edit Video or Playlist in Course
    const editContent = e.target.closest("[data-edit-content]");
    if (editContent) {
      const [cid, mid, lid] = editContent.dataset.editContent.split("|");
      openEditContentModal(cid, mid, lid);
      return;
    }

    // Course Accordion Collapse / Expand Toggle
    const toggleCourse = e.target.closest("[data-toggle-course-collapse]");
    if (toggleCourse) {
      e.stopPropagation();
      const cid = toggleCourse.dataset.toggleCourseCollapse;
      if (collapsedCourseIds.has(cid)) {
        collapsedCourseIds.delete(cid);
      } else {
        collapsedCourseIds.add(cid);
      }
      renderManagement();
      return;
    }

    // Clicking Course Header (excluding action buttons) also toggles accordion
    const mcHead = e.target.closest(".management-course-head");
    if (mcHead && !e.target.closest("button") && !e.target.closest("a") && !e.target.closest("input") && !e.target.closest("select")) {
      const parentCard = mcHead.closest(".management-course");
      const cid = parentCard?.dataset.courseId;
      if (cid) {
        if (collapsedCourseIds.has(cid)) {
          collapsedCourseIds.delete(cid);
        } else {
          collapsedCourseIds.add(cid);
        }
        renderManagement();
        return;
      }
    }

    // Edit Course Modal Trigger
    const editCourse = e.target.closest("[data-edit-course-modal]") || e.target.closest("[data-edit-course]");
    if (editCourse) {
      e.stopPropagation();
      const cid = editCourse.dataset.editCourseModal || editCourse.dataset.editCourse;
      openEditCourseModal(cid);
      return;
    }

    // Delete Lesson or Playlist
    const dl = e.target.closest("[data-delete-lesson]");
    if (dl) {
      const [cid, mid, lid] = dl.dataset.deleteLesson.split("|");
      const c = state.courses.find(x => x.id === cid), m = c?.modules.find(x => x.id === mid);
      const l = m?.lessons.find(x => x.id === lid);
      const isPl = !!(l?.isPlaylist || l?.playlistId);
      const promptText = isPl ? `Remove playlist "${l?.title || ""}" from this course?` : `Remove lesson "${l?.title || ""}"?`;
      if (m && confirm(promptText)) {
        m.lessons = m.lessons.filter(x => x.id !== lid);
        c.modules = c.modules.filter(x => x.lessons.length);
        if (c.lastWatched === lid) c.lastWatched = null;
        save();
        notify(isPl ? "Playlist removed." : "Lesson removed.");
      }
      return;
    }

    // Theme Mode Selection in Settings (Dark vs White)
    const mcChoice = e.target.closest("[data-mode-choice]");
    if (mcChoice) {
      applyThemeMode(mcChoice.dataset.modeChoice, true);
      return;
    }

    // Theme Palette selection in Settings
    const tc = e.target.closest("[data-theme-id]");
    if (tc) {
      applyTheme(tc.dataset.themeId, true);
      return;
    }

    // Delete Course
    const del = e.target.closest("[data-delete-course]");
    if (del && confirm("Delete this course and all its lessons and playlists?")) {
      const cid = del.dataset.deleteCourse;
      state.courses = state.courses.filter(c => c.id !== cid);
      collapsedCourseIds.delete(cid);
      save();
      notify("Course deleted.");
    }
  });

  // Topbar Theme Mode Toggle Button
  $("#themeModeToggle")?.addEventListener("click", () => {
    applyThemeMode(currentThemeMode === "light" ? "dark" : "light", true);
  });

  // Multi-Course Management Toolbar Listeners
  $("#mgmtCourseSearch")?.addEventListener("input", e => {
    mgmtFilterState.search = e.target.value.trim();
    const clearBtn = $("#mgmtSearchClear");
    if (clearBtn) clearBtn.hidden = !mgmtFilterState.search;
    renderManagement();
  });

  $("#mgmtSearchClear")?.addEventListener("click", () => {
    const input = $("#mgmtCourseSearch");
    if (input) input.value = "";
    mgmtFilterState.search = "";
    $("#mgmtSearchClear").hidden = true;
    renderManagement();
  });

  $("#mgmtCategoryFilter")?.addEventListener("change", e => {
    mgmtFilterState.category = e.target.value;
    renderManagement();
  });

  $("#mgmtStatusFilter")?.addEventListener("change", e => {
    mgmtFilterState.status = e.target.value;
    renderManagement();
  });

  $("#mgmtSortSelect")?.addEventListener("change", e => {
    mgmtFilterState.sort = e.target.value;
    renderManagement();
  });

  $("#mgmtExpandAllBtn")?.addEventListener("click", () => {
    collapsedCourseIds.clear();
    renderManagement();
    notify("All courses expanded.");
  });

  $("#mgmtCollapseAllBtn")?.addEventListener("click", () => {
    state.courses.forEach(c => collapsedCourseIds.add(c.id));
    renderManagement();
    notify("All courses collapsed.");
  });

  function resetMgmtFilters() {
    mgmtFilterState = { search: "", category: "", status: "", sort: "newest" };
    const sInput = $("#mgmtCourseSearch"); if (sInput) sInput.value = "";
    const sClear = $("#mgmtSearchClear"); if (sClear) sClear.hidden = true;
    const catF = $("#mgmtCategoryFilter"); if (catF) catF.value = "";
    const statF = $("#mgmtStatusFilter"); if (statF) statF.value = "";
    const sortS = $("#mgmtSortSelect"); if (sortS) sortS.value = "newest";
    renderManagement();
  }

  $("#mgmtResetFilterBtn")?.addEventListener("click", resetMgmtFilters);

  document.addEventListener("click", e => {
    if (e.target.id === "mgmtClearFilterBtn") {
      resetMgmtFilters();
    }
    if (e.target.id === "dashClearFilterBtn") {
      dashFilterState = { search: "", category: "", status: "" };
      const dSearch = $("#dashCourseSearch"); if (dSearch) dSearch.value = "";
      const dClear = $("#dashSearchClear"); if (dClear) dClear.hidden = true;
      const dCat = $("#dashCategoryFilter"); if (dCat) dCat.value = "";
      const dStat = $("#dashStatusFilter"); if (dStat) dStat.value = "";
      renderDashboard();
    }
  });

  // Dashboard Course Filter Listeners
  $("#dashCourseSearch")?.addEventListener("input", e => {
    dashFilterState.search = e.target.value.trim();
    const dClear = $("#dashSearchClear");
    if (dClear) dClear.hidden = !dashFilterState.search;
    renderDashboard();
  });

  $("#dashSearchClear")?.addEventListener("click", () => {
    const dSearch = $("#dashCourseSearch");
    if (dSearch) dSearch.value = "";
    dashFilterState.search = "";
    $("#dashSearchClear").hidden = true;
    renderDashboard();
  });

  $("#dashCategoryFilter")?.addEventListener("change", e => {
    dashFilterState.category = e.target.value;
    renderDashboard();
  });

  $("#dashStatusFilter")?.addEventListener("change", e => {
    dashFilterState.status = e.target.value;
    renderDashboard();
  });

  // Keyboard navigation & accessibility
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!$("#editCourseModalOverlay")?.hidden) { closeEditCourseModal(); return; }
      if (!$("#playlistVideoModalOverlay")?.hidden) { closePlaylistVideoModal(); return; }
      if (!$("#playlistPasteModalOverlay")?.hidden) { closePlaylistPasteModal(); return; }
      if (!$("#editContentModalOverlay")?.hidden) { closeEditContentModal(); return; }
      if (!$("#docPdfViewModal")?.hidden) { closePdfViewer(); return; }
      if (!$("#docNoteViewModal")?.hidden) { closeNoteViewer(); return; }
      if (!$("#docPdfModalOverlay")?.hidden) { closePdfModal(); return; }
      if (!$("#docNoteModalOverlay")?.hidden) { closeNoteModal(); return; }
      if (!$("#picLightboxOverlay")?.hidden) { closeLightbox(); return; }
      if (!$("#picModalOverlay")?.hidden) { closePicModal(); return; }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-lesson],[data-open-course],[data-view-pic],[data-view-note],[data-view-pdf],[data-theme-id],[data-mode-choice],[data-toggle-course-collapse]")) {
      e.preventDefault();
      e.target.click();
    }
  });

  $("#completeButton")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId), l = c && lessons(c).find(x => x.id === currentLessonId);
    if (!l) return;

    if (l.isPlaylist && l.activeVideoRecordId && Array.isArray(l.videos)) {
      const v = l.videos.find(x => x.id === l.activeVideoRecordId);
      if (v) {
        v.completed = !v.completed;
        l.completed = l.videos.length > 0 && l.videos.every(x => x.completed);
        save();
        openLesson(l.id, v.id);
        notify(v.completed ? "Video marked complete." : "Video marked incomplete.");
        return;
      }
    }

    l.completed = !l.completed; save(); openLesson(l.id); notify(l.completed ? "Marked complete." : "Completion undone.");
  });

  $("#studyTimerToggle")?.addEventListener("click", () => { if (timerRunning) stopTimer(); else startTimer(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && timerRunning) stopTimer(true); });
  $("#backToCourses")?.addEventListener("click", () => navigate("courses"));
  $("#menuToggle")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));

  // Settings: Export, Import, Reset
  $("#exportButton")?.addEventListener("click", async () => {
    const pics = await PicDB.getAll();
    const docs = await DocDB.getAll();
    const payload = {
      app: "FocusLearn",
      version: 5,
      themeMode: currentThemeMode,
      theme: currentTheme,
      exportedAt: new Date().toISOString(),
      ...state,
      pictures: pics,
      documents: docs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `focuslearn-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup downloaded.");
  });

  $("#importFile")?.addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const p = JSON.parse(await f.text()), cs = p.courses;
      if (!Array.isArray(cs) || !cs.every(c => c && typeof c.name === "string" && Array.isArray(c.modules) && c.modules.every(m => typeof m.name === "string" && Array.isArray(m.lessons) && m.lessons.every(l => typeof l.title === "string" && ((typeof l.videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(l.videoId)) || (typeof l.playlistId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(l.playlistId)) || l.videoId === "videoseries"))))) throw Error();
      if (!confirm("Import replaces your current library, pictures, notes, and PDFs. Continue?")) return;
      state = { courses: cs, sessions: Array.isArray(p.sessions) ? p.sessions : [] };

      if (p.themeMode && (p.themeMode === "light" || p.themeMode === "dark")) {
        applyThemeMode(p.themeMode, false);
      }

      if (p.theme && THEMES.some(x => x.id === p.theme)) {
        applyTheme(p.theme, false);
      }

      if (Array.isArray(p.pictures)) {
        await PicDB.clear();
        for (const pic of p.pictures) {
          await PicDB.save(pic);
        }
        picturesList = p.pictures;
      }

      if (Array.isArray(p.documents)) {
        await DocDB.clear();
        for (const doc of p.documents) {
          await DocDB.save(doc);
        }
        docsList = p.documents;
      }

      save();
      notify("Backup imported.");
    } catch {
      notify("Invalid FocusLearn backup file.");
    } finally {
      e.target.value = "";
    }
  });

  $("#resetButton")?.addEventListener("click", async () => {
    if (confirm("Delete all courses, progress, pictures, notes, and stored PDFs from this browser?")) {
      if (timerRunning) stopTimer(true);
      state = { courses: [], sessions: [] };
      localStorage.removeItem(KEY);
      await PicDB.clear();
      await DocDB.clear();
      picturesList = [];
      docsList = [];
      save();
      notify("Library cleared.");
    }
  });

  // Initialize Theme Mode, Theme Color, and load DB
  applyThemeMode(currentThemeMode, false);
  applyTheme(currentTheme, false);

  Promise.all([PicDB.getAll(), DocDB.getAll()]).then(([pics, docs]) => {
    picturesList = Array.isArray(pics) ? pics : [];
    docsList = Array.isArray(docs) ? docs : [];
    renderAll();
    renderTimer();
  }).catch(() => {
    renderAll();
    renderTimer();
  });
})();
