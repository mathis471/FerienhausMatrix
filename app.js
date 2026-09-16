const STORAGE_KEY = "ferienhausmatrix-v2";
const defaultCriteria = [
  {id:"drive",name:"Fahrtzeit",type:"time",direction:"lower",weight:20,green:120,yellow:180,red:240},
  {id:"area",name:"Wohnfläche",type:"number",direction:"higher",weight:20,green:90,yellow:75,red:60},
  {id:"bath",name:"Anzahl Badezimmer",type:"number",direction:"higher",weight:15,green:2,yellow:1,red:0},
  {id:"sauna",name:"Sauna",type:"boolean",direction:"higher",weight:15,green:1,yellow:0,red:0},
  {id:"pool",name:"Schwimmbad im Park",type:"boolean",direction:"higher",weight:10,green:1,yellow:0,red:0},
  {id:"cost",name:"Kosten",type:"currency",direction:"lower",weight:20,green:1500,yellow:1700,red:1900}
];
let state = load();
let editingHomeId = null;
let deferredInstallPrompt = null;

function load(){
  try {
    const s=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(s && Array.isArray(s.criteria) && Array.isArray(s.homes)) return s;
  } catch(e){}
  return {criteria:structuredClone(defaultCriteria),homes:[]};
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderAll();}
function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random();}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function fmt(c,v){
  if(v===null||v===undefined||v==="") return "—";
  if(c.type==="time"){let n=Number(v),h=Math.floor(n/60),m=Math.round(n%60);return `${h}:${String(m).padStart(2,"0")} h`;}
  if(c.type==="currency") return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v));
  if(c.type==="boolean") return Number(v) ? "Ja" : "Nein";
  return `${v}`;
}
function status(c,v){
  if(v===""||v===null||v===undefined) return "empty";
  if(c.type==="boolean") return Number(v) ? "green" : "red";
  const n=Number(v);
  if(!Number.isFinite(n)) return "empty";
  if(c.direction==="higher") return n>=c.green?"green":n>=c.yellow?"yellow":n>=c.red?"red":"bad";
  return n<=c.green?"green":n<=c.yellow?"yellow":n<=c.red?"red":"bad";
}
function points(c,v){
  if(v===""||v===null||v===undefined) return 0;
  if(c.type==="boolean") return Number(v)?10:0;
  const s=status(c,v);
  return s==="green"?10:s==="yellow"?7:s==="red"?4:0;
}
function score(home){
  const totalWeight=state.criteria.reduce((a,c)=>a+Number(c.weight||0),0);
  if(!totalWeight) return 0;
  return state.criteria.reduce((sum,c)=>sum+points(c,home.values?.[c.id])*(Number(c.weight||0)/totalWeight),0);
}
function linkHtml(url){if(!url)return'<span class="muted">Kein Link</span>';let safe=esc(url);return`<a class="house-link" href="${safe}" target="_blank" rel="noopener noreferrer">Zum Ferienhaus ↗</a>`}
function makePdf(){if(!state.homes.length){alert("Bitte zuerst mindestens ein Ferienhaus anlegen.");return}let rows=[...state.homes].sort((a,b)=>score(b)-score(a));let th=state.criteria.map(c=>`<th>${esc(c.name)}<br><small>${c.weight}%</small></th>`).join("");let body=rows.map((h,i)=>`<tr><td><b>#${i+1}</b><br><strong>${esc(h.name)}</strong><br>${h.url?`<a href="${esc(h.url)}">${esc(h.url)}</a>`:"—"}</td>${state.criteria.map(c=>`<td><b>${esc(fmt(c,h.values?.[c.id]))}</b><br><span class="p p-${status(c,h.values?.[c.id])}">${points(c,h.values?.[c.id])} P</span></td>`).join("")}<td class="total"><b>${score(h).toFixed(1)}</b> / 10</td></tr>`).join("");let w=window.open("","_blank");if(!w){alert("Das PDF-Fenster wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben.");return}w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>FerienhausMatrix – Vergleich</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#18202b;font-size:9px}h1{font-size:20px;margin:0 0 4px}p{color:#66717e}table{border-collapse:collapse;width:100%}th{background:#eef2f7;text-align:left;font-size:8px;padding:6px;border:1px solid #cfd6df}td{padding:6px;border:1px solid #d8dee6;vertical-align:top}tr:nth-child(even){background:#fafbfc}a{color:#285ea8;text-decoration:none;word-break:break-all;font-size:7px}.p{display:inline-block;margin-top:3px;padding:2px 5px;border-radius:8px;font-weight:700}.p-green{background:#dff5e5}.p-yellow{background:#fff2c7}.p-red,.p-bad{background:#ffe0df}.p-empty{background:#eef1f4;color:#7b8592}.total{font-size:12px;white-space:nowrap}.footer{margin-top:8px;font-size:8px;color:#707b88}</style></head><body><h1>FerienhausMatrix – Vergleich</h1><p>Alle Daten auf einen Blick · Werte und Bewertungspunkte getrennt dargestellt · ${new Date().toLocaleDateString("de-DE")}</p><table><thead><tr><th>Ferienhaus / Link</th>${th}<th>Gesamt</th></tr></thead><tbody>${body}</tbody></table><div class="footer">Erstellt mit FerienhausMatrix.</div><script>setTimeout(()=>window.print(),400)</script></body></html>`);w.document.close()}
function renderAll(){renderOverview();renderCriteria();document.getElementById("homeCount").textContent=state.homes.length;}
function renderOverview(){
  const grid=document.getElementById("homeGrid"), q=document.getElementById("searchInput").value.toLowerCase();
  let homes=state.homes.filter(h=>h.name.toLowerCase().includes(q));
  const sort=document.getElementById("sortSelect").value;
  homes.sort((a,b)=>sort==="score"?score(b)-score(a):sort==="name"?a.name.localeCompare(b.name,"de"):sort==="cost"?Number(a.values?.cost||Infinity)-Number(b.values?.cost||Infinity):Number(a.values?.drive||Infinity)-Number(b.values?.drive||Infinity));
  if(!homes.length){grid.innerHTML='<div class="empty-state glass"><h3>Noch keine Ferienhäuser</h3><p>Lege dein erstes Ferienhaus an und beginne mit dem Vergleich.</p><button class="primary" onclick="openHome()">+ Ferienhaus hinzufügen</button></div>';return;}
  grid.innerHTML=homes.map((h,i)=>{
    const sc=score(h), rank=i+1;
    const rows=state.criteria.slice(0,6).map(c=>`<div class="mini-row"><span>${esc(c.name)}</span><strong class="traffic ${status(c,h.values?.[c.id])}">${esc(fmt(c,h.values?.[c.id]))}</strong></div>`).join("");
    return `<article class="home-card glass"><div class="rank">#${rank}</div><div class="card-head"><div><h3>${esc(h.name)}</h3>${linkHtml(h.url)}<span class="muted">Gesamtwertung</span></div><div class="score">${sc.toFixed(1)}<small>/10</small></div></div><div class="mini-list">${rows}</div><div class="card-actions"><button onclick="openDetail('${h.id}')">Details</button><button onclick="editHome('${h.id}')">Bearbeiten</button><button class="danger" onclick="deleteHome('${h.id}')">Löschen</button></div></article>`;
  }).join("");
}
function renderCriteria(){
  const list=document.getElementById("criteriaList");
  list.innerHTML=state.criteria.map(c=>`<article class="criterion glass" data-id="${c.id}">
    <div class="criterion-main"><input class="criterion-name" value="${esc(c.name)}">
    <div class="criterion-meta"><select class="criterion-type"><option value="number" ${c.type==="number"?"selected":""}>Zahl</option><option value="time" ${c.type==="time"?"selected":""}>Zeit (Minuten)</option><option value="currency" ${c.type==="currency"?"selected":""}>Währung</option><option value="boolean" ${c.type==="boolean"?"selected":""}>Ja/Nein</option></select>
    <select class="criterion-direction"><option value="higher" ${c.direction==="higher"?"selected":""}>Höher ist besser</option><option value="lower" ${c.direction==="lower"?"selected":""}>Niedriger ist besser</option></select>
    <label>Gewichtung <input class="criterion-weight" type="number" min="0" max="100" value="${c.weight}"> %</label></div></div>
    <div class="thresholds"><label>Grün bis <input class="green-threshold" type="number" step="any" value="${c.green}"></label><label>Gelb bis <input class="yellow-threshold" type="number" step="any" value="${c.yellow}"></label><label>Rot bis <input class="red-threshold" type="number" step="any" value="${c.red}"></label></div>
    <button class="danger delete-criterion" type="button">Löschen</button></article>`).join("");
  list.querySelectorAll(".criterion").forEach(el=>{
    const id=el.dataset.id;
    el.querySelectorAll("input,select").forEach(inp=>inp.addEventListener("change",()=>{
      const c=state.criteria.find(x=>x.id===id);
      c.name=el.querySelector(".criterion-name").value.trim()||"Kriterium";
      c.type=el.querySelector(".criterion-type").value;c.direction=el.querySelector(".criterion-direction").value;
      c.weight=Number(el.querySelector(".criterion-weight").value)||0;c.green=Number(el.querySelector(".green-threshold").value)||0;c.yellow=Number(el.querySelector(".yellow-threshold").value)||0;c.red=Number(el.querySelector(".red-threshold").value)||0;
      if(c.type==="boolean"){c.green=1;c.yellow=0;c.red=0;}
      save();
    }));
    el.querySelector(".delete-criterion").onclick=()=>{if(confirm("Kriterium wirklich löschen? Die dazugehörigen Werte der Ferienhäuser werden ebenfalls entfernt.")){state.criteria=state.criteria.filter(x=>x.id!==id);state.homes.forEach(h=>delete h.values?.[id]);save();}};
  });
  const total=state.criteria.reduce((a,c)=>a+Number(c.weight||0),0);
  list.insertAdjacentHTML("afterbegin",`<div class="weight-total ${Math.abs(total-100)<.01?"ok":"warn"} glass">Gewichtung gesamt: <strong>${total}%</strong>${Math.abs(total-100)<.01?"":" – bitte auf 100 % anpassen."}</div>`);
}
function openHome(id=null){
  editingHomeId=id; const h=id?state.homes.find(x=>x.id===id):null;
  document.getElementById("dialogTitle").textContent=id?"Ferienhaus bearbeiten":"Ferienhaus hinzufügen";
  document.getElementById("homeName").value=h?.name||"";document.getElementById("homeUrl").value=h?.url||"";
  document.getElementById("homeFields").innerHTML=state.criteria.map(c=>{
    const val=h?.values?.[c.id]??"";
    if(c.type==="boolean") return `<label>${esc(c.name)}<select data-cid="${c.id}"><option value="">—</option><option value="1" ${Number(val)===1?"selected":""}>Ja</option><option value="0" ${val!==""&&Number(val)===0?"selected":""}>Nein</option></select></label>`;
    const placeholder=c.type==="time"?"Minuten, z. B. 165":c.type==="currency"?"z. B. 1649":"Wert";
    return `<label>${esc(c.name)}<input data-cid="${c.id}" type="number" step="any" value="${esc(val)}" placeholder="${placeholder}"></label>`;
  }).join("");
  document.getElementById("homeDialog").showModal();
}
function saveHome(e){
  e.preventDefault();
  const name=document.getElementById("homeName").value.trim(); if(!name)return; let url=document.getElementById("homeUrl").value.trim(); if(url&&!/^https?:\/\//i.test(url))url="https://"+url;
  const values={};document.querySelectorAll("#homeFields [data-cid]").forEach(x=>{if(x.value!=="")values[x.dataset.cid]=x.value;});
  if(editingHomeId){const h=state.homes.find(x=>x.id===editingHomeId);h.name=name;h.url=url;h.values=values;}
  else state.homes.push({id:uid(),name,url,values});
  document.getElementById("homeDialog").close();save();
}
function openDetail(id){
  const h=state.homes.find(x=>x.id===id);if(!h)return;
  document.getElementById("detailContent").innerHTML=`<div class="eyebrow">Bewertung</div><h2>${esc(h.name)}</h2>${linkHtml(h.url)}<div class="detail-score">${score(h).toFixed(1)}<small>/10</small></div><div class="detail-table">${state.criteria.map(c=>`<div class="detail-row"><div><strong>${esc(c.name)}</strong><span>${c.weight}% Gewichtung</span></div><div class="actual">${esc(fmt(c,h.values?.[c.id]))}</div><div class="points traffic ${status(c,h.values?.[c.id])}">${points(c,h.values?.[c.id]).toFixed(0)} Punkte</div></div>`).join("")}</div>`;
  document.getElementById("detailDialog").showModal();
}
function deleteHome(id){if(confirm("Ferienhaus wirklich löschen?")){state.homes=state.homes.filter(h=>h.id!==id);save();}}
function exportData(matrixOnly=false){
  const data=matrixOnly?{version:2,type:"matrix",criteria:state.criteria}:{version:2,type:"full",criteria:state.criteria,homes:state.homes};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=matrixOnly?"ferienhausmatrix-matrix.json":"ferienhausmatrix-backup.json";a.click();URL.revokeObjectURL(url);
}
function importData(file){
  const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.criteria))throw Error();
    if(d.type==="matrix"){state.criteria=d.criteria;}
    else if(Array.isArray(d.homes)){state.criteria=d.criteria;state.homes=d.homes;}
    else throw Error();save();alert("Import erfolgreich.");}catch(e){alert("Die Datei konnte nicht importiert werden.");}};r.readAsText(file);
}
document.getElementById("addHomeBtn").onclick=()=>openHome();document.getElementById("pdfBtn").onclick=makePdf;
document.getElementById("homeForm").addEventListener("submit",saveHome);
document.getElementById("cancelHome").onclick=()=>document.getElementById("homeDialog").close();
document.getElementById("closeHome").onclick=()=>document.getElementById("homeDialog").close();
document.getElementById("closeDetail").onclick=()=>document.getElementById("detailDialog").close();
document.getElementById("searchInput").oninput=renderOverview;document.getElementById("sortSelect").onchange=renderOverview;
document.getElementById("exportBtn").onclick=()=>exportData(false);document.getElementById("exportFullBtn").onclick=()=>exportData(false);document.getElementById("exportMatrixBtn").onclick=()=>exportData(true);
document.getElementById("importInput").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.getElementById(btn.dataset.tab).classList.add("active");});
document.getElementById("addCriterionBtn").onclick=()=>{state.criteria.push({id:uid(),name:"Neues Kriterium",type:"number",direction:"higher",weight:0,green:10,yellow:5,red:0});save();document.getElementById("matrix").scrollIntoView();};
document.getElementById("installBtnSettings").onclick=()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();}else document.getElementById("installHint").textContent="Die Installationsfunktion wird vom Browser angeboten, sobald die PWA-Bedingungen erfüllt sind. Unter iPhone/iPad: Teilen → Zum Home-Bildschirm.";
};
window.openHome=openHome;window.openDetail=openDetail;window.editHome=openHome;window.deleteHome=deleteHome;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById("installBtn").classList.remove("hidden");});
document.getElementById("installBtn").onclick=async()=>{if(deferredInstallPrompt){await deferredInstallPrompt.prompt();deferredInstallPrompt=null;document.getElementById("installBtn").classList.add("hidden");}};
if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost")) navigator.serviceWorker.register("./sw.js").catch(console.warn);
renderAll();
/* FERienhausMatrix map fix */
(function () {
  const MAP_MARKER = "/* FERienhausMatrix map fix */";
  let mapInstance = null;
  let mapMarkers = [];

  function stateObj() {
    try { return JSON.parse(localStorage.getItem("ferienhausmatrix-v2") || localStorage.getItem("ferienhaus-app-v1") || "{}"); }
    catch(e) { return {}; }
  }
  function getHomes() {
    const s = window.state || stateObj();
    return Array.isArray(s.homes) ? s.homes : [];
  }
  function escHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function setStatus(t) {
    const el = document.getElementById("mapStatus");
    if (el) el.textContent = t || "";
  }

  function ensureLeaflet(cb) {
    if (window.L) return cb();
    if (!document.getElementById("leaflet-css")) {
      const css = document.createElement("link");
      css.id = "leaflet-css";
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = cb;
    s.onerror = () => setStatus("Die Kartenbibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.");
    document.head.appendChild(s);
  }

  function renderMap() {
    const canvas = document.getElementById("mapCanvas");
    if (!canvas) return;
    ensureLeaflet(() => {
      if (!mapInstance) {
        mapInstance = L.map(canvas).setView([53.14, 8.21], 8);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap-Mitwirkende'
        }).addTo(mapInstance);
      }
      mapMarkers.forEach(m => m.remove());
      mapMarkers = [];

      const homes = getHomes();
      const points = [];
      for (const h of homes) {
        const lat = Number(h.lat ?? h.latitude ?? h.coordinates?.lat);
        const lon = Number(h.lon ?? h.lng ?? h.longitude ?? h.coordinates?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const popup = `<strong>${escHtml(h.name || "Ferienhaus")}</strong><br>${escHtml(h.location || "")}` +
          (h.homeUrl ? `<br><a href="${escHtml(h.homeUrl)}" target="_blank" rel="noopener">Zum Ferienhaus</a>` : "");
        const mk = L.marker([lat, lon]).addTo(mapInstance).bindPopup(popup);
        mapMarkers.push(mk);
        points.push([lat, lon]);
      }
      if (points.length) {
        mapInstance.fitBounds(points, {padding:[30,30], maxZoom: 13});
        setStatus(`${points.length} Ferienhaus${points.length === 1 ? "" : "häuser"} auf der Karte.`);
      } else {
        setStatus("Noch keine Ferienhäuser mit Koordinaten vorhanden. Bitte zuerst bei den Häusern ein Ort eingeben und speichern.");
      }
      setTimeout(() => mapInstance.invalidateSize(), 100);
    });
  }

  function isMapPanel() {
    const p = document.getElementById("map");
    return p && !p.hidden;
  }

  function activateMap() {
    const panel = document.getElementById("map");
    if (!panel) return;
    panel.hidden = false;
    renderMap();
  }

  document.addEventListener("click", e => {
    const tab = e.target.closest('[data-tab="map"], #mapTab, .tab-map');
    if (!tab) return;
    e.preventDefault();
    // Hide panels and activate map without relying on existing tab implementation.
    document.querySelectorAll("[data-panel]").forEach(p => p.hidden = true);
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activateMap();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("map");
    if (panel) panel.hidden = true;
    const btn = document.getElementById("geocodeAllBtn");
    if (btn) btn.addEventListener("click", () => {
      if (typeof window.geocodeAllHomes === "function") window.geocodeAllHomes();
      else setStatus("Bitte bei jedem Haus zuerst einen Ort speichern.");
    });
  });

  window.renderFerienhausMap = renderMap;
})();
