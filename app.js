(() => {
  "use strict";
  const KEY = "focuslearn.v1";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  let state = load(), currentCourseId = null, currentLessonId = null, toastTimer;

  function uid(){ return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function load(){ try { const v=JSON.parse(localStorage.getItem(KEY)); return v && Array.isArray(v.courses) ? v : {courses:[]}; } catch { return {courses:[]}; } }
  function save(){ localStorage.setItem(KEY,JSON.stringify(state)); renderAll(); }
  function notify(msg){ const el=$("#toast"); if(!el)return; el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2300); }
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
  function navigate(page){
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const crumb=$("#pageCrumb"); if(crumb)crumb.textContent=({dashboard:"Dashboard",courses:"My courses",settings:"Settings",player:"Learning"}[page]||"Dashboard");
    $("#sidebar")?.classList.remove("open");
    if(page==="dashboard")renderDashboard(); if(page==="courses")renderManagement();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderDashboard(){
    const total=state.courses.reduce((n,c)=>n+lessons(c).length,0),done=state.courses.reduce((n,c)=>n+stats(c).done,0);
    $("#statCourses").textContent=state.courses.length;$("#statCompleted").textContent=done;$("#statProgress").textContent=total?Math.round(done/total*100)+"%":"0%";
    $("#dashboardEmpty").hidden=state.courses.length>0;
    $("#dashboardCourses").innerHTML=state.courses.map(c=>{
      const s=stats(c),last=lessons(c).find(l=>l.id===c.lastWatched)||lessons(c)[0];
      return `<article class="course-card" data-open-course="${c.id}" tabindex="0" role="button"><div class="course-cover"><span class="cover-tag">LEARNING PATH</span></div><div class="course-body"><h3>${esc(c.name)}</h3><p>${esc(c.description||"Your personal learning path")}</p><div class="course-meta"><span>${s.done}/${s.total} lessons</span><span>${s.pct}%</span></div><div class="progress-track"><span style="width:${s.pct}%"></span></div>${last?`<small class="muted" style="display:block;margin-top:11px;font-size:10px">Continue: ${esc(last.title)}</small>`:""}</div></article>`;
    }).join("");
  }
  function renderManagement(){
    $("#lessonCourse").innerHTML='<option value="">Choose a course</option>'+state.courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
    $("#courseCountLabel").textContent=`${state.courses.length} course${state.courses.length===1?"":"s"}`;
    $("#managementEmpty").hidden=state.courses.length>0;
    $("#managementCourses").innerHTML=state.courses.map(c=>{
      const s=stats(c),mods=(c.modules||[]).map(m=>`<div class="module-block"><div class="module-title">${esc(m.name)}</div>${m.lessons.map(l=>`<div class="lesson-row"><img class="lesson-thumb" src="${thumb(l.videoId)}" alt="" loading="lazy"><div class="lesson-row-info"><strong>${esc(l.title)}</strong><small>${l.completed?"Completed":"Not completed"}</small></div>${l.completed?'<span class="lesson-status">✓ Done</span>':""}<button type="button" class="mini-button" data-play="${c.id}|${l.id}">Open</button><button type="button" class="mini-button delete" data-delete-lesson="${c.id}|${m.id}|${l.id}">Remove</button></div>`).join("")}</div>`).join("");
      return `<article class="panel management-course"><div class="management-course-head"><div><h3>${esc(c.name)}</h3><p>${s.total} lessons · ${s.pct}% complete</p></div><div class="course-actions"><button type="button" class="mini-button" data-open-course="${c.id}">Study course →</button><button type="button" class="mini-button delete" data-delete-course="${c.id}">Delete</button></div></div>${mods||'<p class="muted small" style="margin:15px 0 0">No lessons yet. Add one above.</p>'}</article>`;
    }).join("");
  }
  function renderAll(){renderDashboard();renderManagement();}
  function openCourse(cid,lid){
    const c=state.courses.find(x=>x.id===cid);if(!c)return;
    currentCourseId=cid;const target=lessons(c).find(l=>l.id===lid)||lessons(c).find(l=>l.id===c.lastWatched)||lessons(c)[0];
    if(!target){navigate("courses");notify("Add a lesson to this course first.");return;}
    openLesson(target.id);navigate("player");
  }
  function openLesson(lid){
    const c=state.courses.find(x=>x.id===currentCourseId);if(!c)return;
    const l=lessons(c).find(x=>x.id===lid);if(!l)return;
    currentLessonId=lid;c.lastWatched=lid;localStorage.setItem(KEY,JSON.stringify(state));
    $("#playerCourseLabel").textContent=c.name;$("#curriculumTitle").textContent=c.name;
    $("#playerModuleLabel").textContent=(c.modules.find(m=>m.lessons.some(x=>x.id===lid))||{}).name||"NOW LEARNING";
    $("#playerLessonTitle").textContent=l.title;$("#playerLessonMeta").textContent=l.completed?"Completed lesson · Progress saved":"Your progress is saved automatically on this device.";
    $("#videoFrame").innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${l.videoId}?rel=0&modestbranding=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    $("#completeButton").classList.toggle("done",!!l.completed);$("#completeButton").textContent=l.completed?"✓ Completed — mark incomplete":"✓ Mark complete";
    const s=stats(c);$("#curriculumProgress").textContent=s.pct+"%";$("#curriculumBar").style.width=s.pct+"%";
    $("#curriculumList").innerHTML=c.modules.map(m=>`<div class="curriculum-module">${esc(m.name)}</div>${m.lessons.map(x=>`<div class="curriculum-lesson ${x.id===lid?"selected":""} ${x.completed?"done":""}" data-lesson="${x.id}" role="button" tabindex="0"><span class="lesson-play">${x.completed?"✓":"▶"}</span><span>${esc(x.title)}</span></div>`).join("")}`).join("");
  }
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
  document.addEventListener("click",e=>{
    const n=e.target.closest("[data-page]");if(n){navigate(n.dataset.page);return;}
    const go=e.target.closest("[data-go]");if(go){navigate(go.dataset.go);return;}
    const op=e.target.closest("[data-open-course]");if(op){openCourse(op.dataset.openCourse);return;}
    const play=e.target.closest("[data-play]");if(play){const [c,l]=play.dataset.play.split("|");openCourse(c,l);return;}
    const lesson=e.target.closest("[data-lesson]");if(lesson){openLesson(lesson.dataset.lesson);return;}
    const dl=e.target.closest("[data-delete-lesson]");if(dl){const [cid,mid,lid]=dl.dataset.deleteLesson.split("|");const c=state.courses.find(x=>x.id===cid),m=c?.modules.find(x=>x.id===mid);if(m&&confirm("Remove this lesson?")){m.lessons=m.lessons.filter(x=>x.id!==lid);c.modules=c.modules.filter(x=>x.lessons.length);if(c.lastWatched===lid)c.lastWatched=null;save();notify("Lesson removed.");}return;}
    const del=e.target.closest("[data-delete-course]");if(del&&confirm("Delete this course and all its lessons?")){state.courses=state.courses.filter(c=>c.id!==del.dataset.deleteCourse);save();notify("Course deleted.");}
  });
  document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-lesson],[data-open-course]")){e.preventDefault();e.target.click();}});
  $("#completeButton")?.addEventListener("click",()=>{
    const c=state.courses.find(x=>x.id===currentCourseId),l=c&&lessons(c).find(x=>x.id===currentLessonId);if(!l)return;
    l.completed=!l.completed;save();openLesson(l.id);notify(l.completed?"Lesson marked complete.":"Completion undone.");
  });
  $("#backToCourses")?.addEventListener("click",()=>navigate("courses"));
  $("#menuToggle")?.addEventListener("click",()=>$("#sidebar")?.classList.toggle("open"));
  $("#exportButton")?.addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({app:"FocusLearn",version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`focuslearn-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);notify("Backup downloaded.");
  });
  $("#importFile")?.addEventListener("change",async e=>{
    const f=e.target.files[0];if(!f)return;
    try{const p=JSON.parse(await f.text()),cs=p.courses;
      if(!Array.isArray(cs)||!cs.every(c=>c&&typeof c.name==="string"&&Array.isArray(c.modules)&&c.modules.every(m=>typeof m.name==="string"&&Array.isArray(m.lessons)&&m.lessons.every(l=>typeof l.videoId==="string"&&/^[A-Za-z0-9_-]{11}$/.test(l.videoId)))))throw Error();
      if(!confirm("Import replaces your current library. Continue?"))return;state={courses:cs};save();notify("Backup imported.");
    }catch{notify("Invalid FocusLearn backup file.");}finally{e.target.value="";}
  });
  $("#resetButton")?.addEventListener("click",()=>{if(confirm("Delete all courses and progress from this browser?")){state={courses:[]};localStorage.removeItem(KEY);save();notify("Library cleared.");}});
  renderAll();
})();