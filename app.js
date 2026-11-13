(() => {
  "use strict";
  const KEY = "focuslearn.v1";
  const DB_NAME = "focuslearn_db";
  const DB_VERSION = 1;
  const STORE_NAME = "pictures";

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

  // IndexedDB client storage for pictures with localStorage fallback
  const PicDB = {
    _db: null,
    async getDB() {
      if (this._db) return this._db;
      if (!window.indexedDB) return null;
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
              store.createIndex("createdAt", "createdAt", { unique: false });
              store.createIndex("category", "category", { unique: false });
              store.createIndex("courseId", "courseId", { unique: false });
            }
          };
          req.onsuccess = () => {
            this._db = req.result;
            resolve(this._db);
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    },
    async getAll() {
      const db = await this.getDB();
      if (!db) {
        try {
          return JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]");
        } catch {
          return [];
        }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
    },
    async save(item) {
      const db = await this.getDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]");
          const idx = list.findIndex(x => x.id === item.id);
          if (idx >= 0) list[idx] = item; else list.push(item);
          localStorage.setItem("focuslearn.pictures", JSON.stringify(list));
          return true;
        } catch {
          return false;
        }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(item);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    },
    async delete(id) {
      const db = await this.getDB();
      if (!db) {
        try {
          const list = JSON.parse(localStorage.getItem("focuslearn.pictures") || "[]").filter(x => x.id !== id);
          localStorage.setItem("focuslearn.pictures", JSON.stringify(list));
          return true;
        } catch {
          return false;
        }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    },
    async clear() {
      const db = await this.getDB();
      if (!db) {
        localStorage.removeItem("focuslearn.pictures");
        return true;
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }
  };

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
    a.download = filename || `focuslearn-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function videoId(raw){
    try {
      const u=new URL(raw.trim()); let id="";
      if(u.hostname==="youtu.be" || u.hostname.endsWith(".youtu.be")) id=u.pathname.split("/").filter(Boolean)[0]||"";
      else if(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(u.hostname)){
        if(u.pathname==="/watch") id=u.searchParams.get("v")||"";
        else if(/^\/(embed|shorts|live)\//.test(u.pathname)) id=u.pathname.split("/")[2]||"";
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
    } catch { return null; }
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
    const crumb=$("#pageCrumb"); if(crumb)crumb.textContent=({dashboard:"Dashboard",courses:"My courses",analytics:"Analytics",pictures:"Pictures",notes:"My Notes",settings:"Settings",player:"Learning"}[page]||"Dashboard");
    $("#sidebar")?.classList.remove("open");
    if(page==="dashboard")renderDashboard();
    if(page==="courses")renderManagement();
    if(page==="analytics")renderAnalytics();
    if(page==="pictures")renderPictures();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderDashboard(){
    const total=state.courses.reduce((n,c)=>n+lessons(c).length,0),done=state.courses.reduce((n,c)=>n+stats(c).done,0);
    $("#statCourses").textContent=state.courses.length;$("#statCompleted").textContent=done;$("#statProgress").textContent=total?Math.round(done/total*100)+"%":"0%";
    const picStat = $("#statPictures");
    if(picStat) picStat.textContent = picturesList.length;
    $("#dashboardEmpty").hidden=state.courses.length>0;
    $("#dashboardCourses").innerHTML=state.courses.map(c=>{
      const s=stats(c),last=lessons(c).find(l=>l.id===c.lastWatched)||lessons(c)[0];
      return `<article class="course-card" data-open-course="${c.id}" tabindex="0" role="button"><div class="course-cover"><span class="cover-tag">LEARNING PATH</span></div><div class="course-body"><h3>${esc(c.name)}</h3><p>${esc(c.description||"Your personal learning path")}</p><div class="course-meta"><span>${s.done}/${s.total} lessons</span><span>${s.pct}%</span></div><div class="progress-track"><span style="width:${s.pct}%"></span></div>${last?`<small class="muted" style="display:block;margin-top:11px;font-size:10px">Continue: ${esc(last.title)}</small>`:""}</div></article>`;
    }).join("");
  }
  function renderManagement(){
    $("#lessonCourse").innerHTML='<option value="">Choose a course</option>'+state.courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
    updatePicCourseOptions();
    $("#courseCountLabel").textContent=`${state.courses.length} course${state.courses.length===1?"":"s"}`;
    $("#managementEmpty").hidden=state.courses.length>0;
    $("#managementCourses").innerHTML=state.courses.map(c=>{
      const s=stats(c),mods=(c.modules||[]).map(m=>`<div class="module-block"><div class="module-title">${esc(m.name)}</div>${m.lessons.map(l=>`<div class="lesson-row"><img class="lesson-thumb" src="${thumb(l.videoId)}" alt="" loading="lazy"><div class="lesson-row-info"><strong>${esc(l.title)}</strong><small>${l.completed?"Completed":"Not completed"}</small></div>${l.completed?'<span class="lesson-status">✓ Done</span>':""}<button type="button" class="mini-button" data-play="${c.id}|${l.id}">Open</button><button type="button" class="mini-button edit" data-edit-lesson="${c.id}|${m.id}|${l.id}">Edit</button><button type="button" class="mini-button delete" data-delete-lesson="${c.id}|${m.id}|${l.id}">Remove</button></div>`).join("")}</div>`).join("");
      return `<article class="panel management-course"><div class="management-course-head"><div><h3>${esc(c.name)}</h3><p>${s.total} lessons · ${s.pct}% complete</p></div><div class="course-actions"><button type="button" class="mini-button" data-open-course="${c.id}">Study course →</button><button type="button" class="mini-button edit" data-edit-course="${c.id}">Edit</button><button type="button" class="mini-button delete" data-delete-course="${c.id}">Delete</button></div></div>${mods||'<p class="muted small" style="margin:15px 0 0">No lessons yet. Add one above.</p>'}</article>`;
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

  function renderAll(){
    renderDashboard();
    renderManagement();
    renderPictures();
    if($("#page-analytics")?.classList.contains("active"))renderAnalytics();
  }

  function openCourse(cid,lid){
    const c=state.courses.find(x=>x.id===cid);if(!c)return;
    if(timerRunning)stopTimer(true);
    currentCourseId=cid;const target=lessons(c).find(l=>l.id===lid)||lessons(c).find(l=>l.id===c.lastWatched)||lessons(c)[0];
    if(!target){navigate("courses");notify("Add a lesson to this course first.");return;}
    openLesson(target.id);navigate("player");
  }
  function openLesson(lid){
    const c=state.courses.find(x=>x.id===currentCourseId);if(!c)return;
    const l=lessons(c).find(x=>x.id===lid);if(!l)return;
    if(timerRunning)stopTimer(true);
    currentLessonId=lid;c.lastWatched=lid;persist();
    $("#playerCourseLabel").textContent=c.name;$("#curriculumTitle").textContent=c.name;
    $("#playerModuleLabel").textContent=(c.modules.find(m=>m.lessons.some(x=>x.id===lid))||{}).name||"NOW LEARNING";
    $("#playerLessonTitle").textContent=l.title;$("#playerLessonMeta").textContent=l.completed?"Completed lesson · Progress saved":"Your progress is saved automatically on this device.";
    $("#videoFrame").innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${l.videoId}?rel=0&modestbranding=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    $("#completeButton").classList.toggle("done",!!l.completed);$("#completeButton").textContent=l.completed?"✓ Completed — mark incomplete":"✓ Mark complete";
    const s=stats(c);$("#curriculumProgress").textContent=s.pct+"%";$("#curriculumBar").style.width=s.pct+"%";
    $("#curriculumList").innerHTML=c.modules.map(m=>`<div class="curriculum-module">${esc(m.name)}</div>${m.lessons.map(x=>`<div class="curriculum-lesson ${x.id===lid?"selected":""} ${x.completed?"done":""}" data-lesson="${x.id}" role="button" tabindex="0"><span class="lesson-play">${x.completed?"✓":"▶"}</span><span>${esc(x.title)}</span></div>`).join("")}`).join("");
    timerElapsedBeforeStart=0;renderTimer();
  }

  // Course & Lesson Forms
  $("#courseForm")?.addEventListener("submit",e=>{
    e.preventDefault();const name=$("#courseName").value.trim();if(!name)return;
    state.courses.push({id:uid(),name,description:$("#courseDescription").value.trim(),createdAt:new Date().toISOString(),modules:[],lastWatched:null});
    $("#courseForm").reset();save();notify("Course created.");
  });
  $("#lessonForm")?.addEventListener("submit",e=>{
    e.preventDefault();const c=state.courses.find(x=>x.id===$("#lessonCourse").value),id=videoId($("#videoUrl").value),mn=$("#moduleName").value.trim();
    if(!c){notify("Create and select a course first.");return;}if(!id){notify("Enter a valid YouTube video URL.");return;}if(!mn){notify("Enter a module name.");return;}
    let m=c.modules.find(x=>x.name.toLowerCase()===mn.toLowerCase());if(!m){m={id:uid(),name:mn,lessons:[]};c.modules.push(m);}
    m.lessons.push({id:uid(),videoId:id,title:`YouTube lesson ${m.lessons.length+1}`,completed:false,addedAt:new Date().toISOString()});
    $("#lessonForm").reset();$("#videoPreview").innerHTML='<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a YouTube URL to preview its thumbnail.</small></div>';save();notify("Lesson added.");
  });
  $("#videoUrl")?.addEventListener("input",()=>{
    const id=videoId($("#videoUrl").value),box=$("#videoPreview");
    box.innerHTML=id?`<img src="${thumb(id)}" alt="YouTube thumbnail"><div><strong>Video recognized</strong><small>Thumbnail loaded · ID ${id}</small></div>`:'<div class="preview-placeholder">▶</div><div><strong>Video preview</strong><small>Paste a valid YouTube video URL.</small></div>';
  });

  // Pictures Form & Controls
  $("#openAddPicBtn")?.addEventListener("click", () => openAddPicModal());
  $("#emptyAddPicBtn")?.addEventListener("click", () => openAddPicModal());
  $("#picModalClose")?.addEventListener("click", closePicModal);
  $("#picCancelBtn")?.addEventListener("click", closePicModal);
  $("#picModalOverlay")?.addEventListener("click", e => {
    if (e.target === $("#picModalOverlay")) closePicModal();
  });

  // Dropzone interactions
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

  // Filter & Search Event Listeners
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

  // Global Paste Listener (Ctrl+V / Cmd+V anywhere to paste images)
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

  // Player button for course pictures
  $("#playerCoursePicsBtn")?.addEventListener("click", () => {
    if (currentCourseId) {
      picFilterState.courseId = currentCourseId;
      const select = $("#picCourseFilter");
      if (select) select.value = currentCourseId;
    }
    navigate("pictures");
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

    const editLesson = e.target.closest("[data-edit-lesson]");
    if (editLesson) {
      const [cid,mid,lid] = editLesson.dataset.editLesson.split("|");
      const c = state.courses.find(x => x.id === cid), m = c?.modules.find(x => x.id === mid), l = m?.lessons.find(x => x.id === lid);
      if (!c || !m || !l) return;
      const title = prompt("Lesson title:", l.title || "");
      if (title === null) return;
      const cleanTitle = title.trim();
      if (!cleanTitle) { notify("Lesson title cannot be empty."); return; }
      const moduleName = prompt("Module name:", m.name);
      if (moduleName === null) return;
      const cleanModule = moduleName.trim();
      if (!cleanModule) { notify("Module name cannot be empty."); return; }
      const videoUrl = prompt("YouTube video URL:", `https://www.youtube.com/watch?v=${l.videoId}`);
      if (videoUrl === null) return;
      const newVideoId = videoId(videoUrl);
      if (!newVideoId) { notify("That is not a valid YouTube video URL."); return; }
      let targetModule = c.modules.find(x => x.id !== m.id && x.name.toLowerCase() === cleanModule.toLowerCase());
      if (!targetModule && m.name.toLowerCase() !== cleanModule.toLowerCase()) {
        m.name = cleanModule;
      } else if (targetModule) {
        m.lessons = m.lessons.filter(x => x.id !== lid);
        targetModule.lessons.push(l);
        c.modules = c.modules.filter(x => x.lessons.length);
      }
      l.title = cleanTitle; l.videoId = newVideoId;
      save();
      if (currentCourseId === cid && currentLessonId === lid) openLesson(lid);
      notify("Lesson updated.");
      return;
    }
    const editCourse = e.target.closest("[data-edit-course]");
    if (editCourse) {
      const c = state.courses.find(x => x.id === editCourse.dataset.editCourse);
      if (!c) return;
      const name = prompt("Course name:", c.name);
      if (name === null) return;
      const cleanName = name.trim();
      if (!cleanName) { notify("Course name cannot be empty."); return; }
      const description = prompt("Course description:", c.description || "");
      if (description === null) return;
      c.name = cleanName; c.description = description.trim();
      save();
      notify("Course updated.");
      return;
    }
    const dl = e.target.closest("[data-delete-lesson]");
    if (dl) {
      const [cid,mid,lid] = dl.dataset.deleteLesson.split("|");
      const c = state.courses.find(x => x.id === cid), m = c?.modules.find(x => x.id === mid);
      if (m && confirm("Remove this lesson?")) {
        m.lessons = m.lessons.filter(x => x.id !== lid);
        c.modules = c.modules.filter(x => x.lessons.length);
        if (c.lastWatched === lid) c.lastWatched = null;
        save();
        notify("Lesson removed.");
      }
      return;
    }
    const del = e.target.closest("[data-delete-course]");
    if (del && confirm("Delete this course and all its lessons?")) {
      state.courses = state.courses.filter(c => c.id !== del.dataset.deleteCourse);
      save();
      notify("Course deleted.");
    }
  });

  // Keyboard navigation & accessibility
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!$("#picLightboxOverlay")?.hidden) { closeLightbox(); return; }
      if (!$("#picModalOverlay")?.hidden) { closePicModal(); return; }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-lesson],[data-open-course],[data-view-pic]")) {
      e.preventDefault();
      e.target.click();
    }
  });

  $("#completeButton")?.addEventListener("click", () => {
    const c = state.courses.find(x => x.id === currentCourseId), l = c && lessons(c).find(x => x.id === currentLessonId);
    if (!l) return;
    l.completed = !l.completed; save(); openLesson(l.id); notify(l.completed ? "Lesson marked complete." : "Completion undone.");
  });

  $("#studyTimerToggle")?.addEventListener("click", () => { if (timerRunning) stopTimer(); else startTimer(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && timerRunning) stopTimer(true); });
  $("#backToCourses")?.addEventListener("click", () => navigate("courses"));
  $("#menuToggle")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));

  // Settings: Export, Import, Reset (with pictures included)
  $("#exportButton")?.addEventListener("click", async () => {
    const pics = await PicDB.getAll();
    const payload = {
      app: "FocusLearn",
      version: 3,
      exportedAt: new Date().toISOString(),
      ...state,
      pictures: pics
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
      if (!Array.isArray(cs) || !cs.every(c => c && typeof c.name === "string" && Array.isArray(c.modules) && c.modules.every(m => typeof m.name === "string" && Array.isArray(m.lessons) && m.lessons.every(l => typeof l.videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(l.videoId))))) throw Error();
      if (!confirm("Import replaces your current library and pictures. Continue?")) return;
      state = { courses: cs, sessions: Array.isArray(p.sessions) ? p.sessions : [] };
      if (Array.isArray(p.pictures)) {
        await PicDB.clear();
        for (const pic of p.pictures) {
          await PicDB.save(pic);
        }
        picturesList = p.pictures;
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
    if (confirm("Delete all courses, progress, and stored pictures from this browser?")) {
      if (timerRunning) stopTimer(true);
      state = { courses: [], sessions: [] };
      localStorage.removeItem(KEY);
      await PicDB.clear();
      picturesList = [];
      save();
      notify("Library cleared.");
    }
  });

  // Initialize DB and load pictures
  PicDB.getAll().then(pics => {
    picturesList = Array.isArray(pics) ? pics : [];
    renderAll();
    renderTimer();
  }).catch(() => {
    renderAll();
    renderTimer();
  });
})();
