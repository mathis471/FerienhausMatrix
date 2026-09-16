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
function makePdf(){if(!state.homes.length){alert("Bitte zuerst mindestens ein Ferienhaus anlegen.");return}let rows=[...state.homes].sort((a,b)=>score(b)-score(a));let th=state.criteria.map(c=>`<th>${esc(c.name)}<br><small>${c.weight}%</small></th>`).join("");let body=rows.map((h,i)=>`<tr><td><b>#${i+1}</b><br><strong>${esc(h.name)}</strong><br>${h.url?`<a href="${esc(h.url)}">${esc(h.url)}</a>`:"—"}</td><td>${esc(h.location||"—")}</td>${state.criteria.map(c=>`<td><b>${esc(fmt(c,h.values?.[c.id]))}</b><br><span class="p p-${status(c,h.values?.[c.id])}">${points(c,h.values?.[c.id])} P</span></td>`).join("")}<td class="total"><b>${score(h).toFixed(1)}</b> / 10</td></tr>`).join("");let w=window.open("","_blank");if(!w){alert("Das PDF-Fenster wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben.");return}w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>FerienhausMatrix – Vergleich</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#18202b;font-size:9px}h1{font-size:20px;margin:0 0 4px}p{color:#66717e}table{border-collapse:collapse;width:100%}th{background:#eef2f7;text-align:left;font-size:8px;padding:6px;border:1px solid #cfd6df}td{padding:6px;border:1px solid #d8dee6;vertical-align:top}tr:nth-child(even){background:#fafbfc}a{color:#285ea8;text-decoration:none;word-break:break-all;font-size:7px}.p{display:inline-block;margin-top:3px;padding:2px 5px;border-radius:8px;font-weight:700}.p-green{background:#dff5e5}.p-yellow{background:#fff2c7}.p-red,.p-bad{background:#ffe0df}.p-empty{background:#eef1f4;color:#7b8592}.total{font-size:12px;white-space:nowrap}.footer{margin-top:8px;font-size:8px;color:#707b88}</style></head><body><h1>FerienhausMatrix – Vergleich</h1><p>Alle Daten auf einen Blick · Werte und Bewertungspunkte getrennt dargestellt · ${new Date().toLocaleDateString("de-DE")}</p><table><thead><tr><th>Ferienhaus / Link</th><th>Ort</th>${th}<th>Gesamt</th></tr></thead><tbody>${body}</tbody></table><div class="footer">Erstellt mit FerienhausMatrix.</div><script>setTimeout(()=>window.print(),400)</script></body></html>`);w.document.close()}
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
    return `<article class="home-card glass"><div class="rank">#${rank}</div><div class="card-head"><div><h3>${esc(h.name)}</h3><div class="home-location">📍 ${esc(h.location||"Kein Ort eingetragen")}</div>${linkHtml(h.url)}<span class="muted">Gesamtwertung</span></div><div class="score">${sc.toFixed(1)}<small>/10</small></div></div><div class="mini-list">${rows}</div><div class="card-actions"><button onclick="openDetail('${h.id}')">Details</button><button onclick="editHome('${h.id}')">Bearbeiten</button><button class="danger" onclick="deleteHome('${h.id}')">Löschen</button></div></article>`;
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
  document.getElementById("homeName").value=h?.name||"";document.getElementById("homeLocation").value=h?.location||"";document.getElementById("homeUrl").value=h?.url||"";
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
  let savedHome;
  const location=document.getElementById("homeLocation").value.trim();
  if(editingHomeId){
    const h=state.homes.find(x=>x.id===editingHomeId);
    h.name=name; h.location=location; h.url=url; h.values=values;
    if(h._geocodedLocation!==location) delete h.coordinates;
    savedHome=h;
  } else {
    savedHome={id:uid(),name,location,url,values};
    state.homes.push(savedHome);
  }
  document.getElementById("homeDialog").close();save();geocodeHome(savedHome);
}
function openDetail(id){
  const h=state.homes.find(x=>x.id===id);if(!h)return;
  document.getElementById("detailContent").innerHTML=`<div class="eyebrow">Bewertung</div><h2>${esc(h.name)}</h2><p class="detail-location">📍 ${esc(h.location||"Kein Ort eingetragen")}</p>${linkHtml(h.url)}<div class="detail-score">${score(h).toFixed(1)}<small>/10</small></div><div class="detail-table">${state.criteria.map(c=>`<div class="detail-row"><div><strong>${esc(c.name)}</strong><span>${c.weight}% Gewichtung</span></div><div class="actual">${esc(fmt(c,h.values?.[c.id]))}</div><div class="points traffic ${status(c,h.values?.[c.id])}">${points(c,h.values?.[c.id]).toFixed(0)} Punkte</div></div>`).join("")}</div>`;
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

/* v4: funktionierende Karte und eindeutig gespeicherter Ort je Ferienhaus */
const FH_CACHE_KEY="ferienhausmatrix-geocache-v4";
let fhMap=null, fhMarkers=[];

function geoCache(){try{return JSON.parse(localStorage.getItem(FH_CACHE_KEY)||"{}")}catch(e){return {}}}
function saveGeoCache(c){localStorage.setItem(FH_CACHE_KEY,JSON.stringify(c))}
function homeLocation(h){return (h.location||"").trim()}

async function geocodeHome(h){
  const loc=homeLocation(h); if(!loc) return;
  const key=loc.toLowerCase(), cache=geoCache();
  try{
    let p=cache[key];
    if(!p){
      const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=de&q="+encodeURIComponent(loc));
      if(!r.ok) throw new Error("Geocoding fehlgeschlagen");
      const d=await r.json();
      if(!d.length) throw new Error("Ort nicht gefunden");
      p={lat:Number(d[0].lat),lon:Number(d[0].lon),display:d[0].display_name||loc};
      cache[key]=p; saveGeoCache(cache);
    }
    h.coordinates=p; h._geocodedLocation=loc;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    if(fhMap) renderMap();
  }catch(e){
    const s=document.getElementById("mapStatus");
    if(s) s.textContent=`${h.name}: ${e.message}`;
  }
}

async function geocodeAll(){
  const btn=document.getElementById("geocodeAllBtn"), s=document.getElementById("mapStatus");
  const homes=state.homes.filter(h=>homeLocation(h)&&(!h.coordinates||h._geocodedLocation!==homeLocation(h)));
  if(!homes.length){s.textContent="Alle eingetragenen Orte sind bereits verortet.";renderMap();return}
  btn.disabled=true;
  for(let i=0;i<homes.length;i++){
    s.textContent=`Verorte ${homes[i].name} (${i+1}/${homes.length}) …`;
    await geocodeHome(homes[i]);
    if(i<homes.length-1) await new Promise(r=>setTimeout(r,1100));
  }
  btn.disabled=false; s.textContent="Verortung abgeschlossen."; renderMap();
}

function initMap(){
  const el=document.getElementById("mapCanvas"), s=document.getElementById("mapStatus");
  if(!el||typeof L==="undefined"){if(s)s.textContent="Karte konnte nicht geladen werden. Bitte Internetverbindung prüfen.";return}
  if(!fhMap){
    fhMap=L.map(el).setView([51.2,10.4],6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(fhMap);
  }
  setTimeout(()=>fhMap.invalidateSize(),100); renderMap();
}
function renderMap(){
  if(!fhMap)return;
  fhMarkers.forEach(m=>fhMap.removeLayer(m)); fhMarkers=[];
  const bounds=[];
  state.homes.forEach(h=>{
    const g=h.coordinates;
    if(!g||!Number.isFinite(+g.lat)||!Number.isFinite(+g.lon))return;
    const m=L.marker([+g.lat,+g.lon]).addTo(fhMap);
    const link=h.url?`<br><a href="${esc(h.url)}" target="_blank" rel="noopener">Zum Ferienhaus ↗</a>`:"";
    m.bindPopup(`<strong>${esc(h.name)}</strong><br>📍 ${esc(homeLocation(h))}${link}`);
    fhMarkers.push(m); bounds.push([+g.lat,+g.lon]);
  });
  const missing=state.homes.filter(h=>homeLocation(h)&&(!h.coordinates||h._geocodedLocation!==homeLocation(h)));
  document.getElementById("mapStatus").textContent=bounds.length?`${bounds.length} Ferienhaus/Ferienhäuser auf der Karte.`:"Noch keine Ferienhäuser verortet.";
  document.getElementById("unmappedHomes").textContent=missing.length?"Noch zu verorten: "+missing.map(h=>h.name).join(", "):"";
  if(bounds.length===1)fhMap.setView(bounds[0],10);
  else if(bounds.length>1)fhMap.fitBounds(bounds,{padding:[30,30]});
}

document.getElementById("geocodeAllBtn")?.addEventListener("click",geocodeAll);
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  if(btn.dataset.tab==="map")setTimeout(initMap,120);
}));
