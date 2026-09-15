const KEY = "ferienhaus-app-v1";

const defaultCriteria = [
  {id:"drive",name:"Fahrtzeit",type:"time",unit:"h",weight:20,direction:"lower",green:150,yellow:210,red:300},
  {id:"distance",name:"Entfernung",type:"number",unit:"km",weight:0,direction:"lower",green:180,yellow:260,red:350},
  {id:"area",name:"Wohnfläche",type:"number",unit:"m²",weight:20,direction:"higher",green:90,yellow:75,red:60},
  {id:"bath",name:"Badezimmer",type:"number",unit:"",weight:15,direction:"higher",green:2,yellow:1,red:0},
  {id:"sauna",name:"Sauna",type:"boolean",unit:"",weight:15,direction:"higher",green:1,yellow:0,red:0},
  {id:"pool",name:"Schwimmbad im Park",type:"boolean",unit:"",weight:10,direction:"higher",green:1,yellow:0,red:0},
  {id:"cost",name:"Kosten",type:"currency",unit:"€",weight:20,direction:"lower",green:1500,yellow:1700,red:1900}
];

let state = loadState();
let editingId = null;

function loadState(){
  try {
    const raw = localStorage.getItem(KEY);
    if(raw) return JSON.parse(raw);
  } catch(e){}
  return {criteria: structuredClone(defaultCriteria), houses:[], changed:new Date().toISOString()};
}
function save(){ state.changed = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(state)); render(); }
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random(); }
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function formatEuro(v){return v===""||v==null?"–":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v));}
function formatValue(c,v){
  if(v===""||v==null) return "–";
  if(c.type==="boolean") return Number(v) ? "Ja" : "Nein";
  if(c.type==="currency") return formatEuro(v);
  if(c.type==="time") return formatTime(Number(v));
  return `${v}${c.unit ? " "+c.unit : ""}`;
}
function formatTime(min){
  min=Number(min)||0; const h=Math.floor(min/60), m=min%60;
  return `${h}:${String(m).padStart(2,"0")} h`;
}
function scoreFor(c,v){
  if(v===""||v==null||isNaN(Number(v))) return null;
  let n=Number(v);
  if(c.type==="boolean") return n ? 10 : 0;
  if(c.direction==="higher"){
    if(n>=c.green) return 10;
    if(n>=c.yellow) return 7;
    if(n>c.red) return 4;
    return 0;
  } else {
    if(n<=c.green) return 10;
    if(n<=c.yellow) return 7;
    if(n<=c.red) return 4;
    return 0;
  }
}
function trafficFor(c,v){
  if(v===""||v==null||isNaN(Number(v))) return "";
  let n=Number(v);
  if(c.type==="boolean") return n ? "traffic-green":"traffic-red";
  if(c.direction==="higher") return n>=c.green?"traffic-green":n>=c.yellow?"traffic-yellow":n>c.red?"traffic-red":"traffic-red";
  return n<=c.green?"traffic-green":n<=c.yellow?"traffic-yellow":n<=c.red?"traffic-red":"traffic-red";
}
function totalScore(h){
  let weighted=0,totalWeight=0;
  state.criteria.forEach(c=>{
    if(!c.weight) return;
    const s=scoreFor(c,h.values?.[c.id]);
    if(s!=null){weighted += s*c.weight; totalWeight += c.weight;}
  });
  return totalWeight ? weighted/totalWeight : 0;
}
function render(){
  document.getElementById("criteriaCount").textContent=state.criteria.length;
  document.getElementById("houseCount").textContent=state.houses.length;
  const avg=state.houses.length ? state.houses.reduce((a,h)=>a+totalScore(h),0)/state.houses.length : 0;
  document.getElementById("avgScore").textContent=state.houses.length ? avg.toFixed(1) : "–";
  const best=[...state.houses].sort((a,b)=>totalScore(b)-totalScore(a))[0];
  document.getElementById("bestScore").textContent=best ? totalScore(best).toFixed(1) : "–";
  document.getElementById("bestName").textContent=best ? `${best.park} · ${best.name}` : "Noch keine Häuser";
  document.getElementById("lastChanged").textContent=state.changed ? new Date(state.changed).toLocaleDateString("de-DE") : "–";
  renderHouses();
}
function renderHouses(){
  const grid=document.getElementById("housesGrid"), empty=document.getElementById("emptyState");
  const q=document.getElementById("searchInput").value.toLowerCase();
  const sort=document.getElementById("sortSelect").value;
  let houses=state.houses.filter(h=>(h.park+" "+h.name).toLowerCase().includes(q));
  houses.sort((a,b)=>{
    if(sort==="score") return totalScore(b)-totalScore(a);
    if(sort==="name") return a.name.localeCompare(b.name,"de");
    if(sort==="costAsc") return Number(a.values?.cost||Infinity)-Number(b.values?.cost||Infinity);
    return Number(b.values?.cost||0)-Number(a.values?.cost||0);
  });
  empty.style.display=state.houses.length?"none":"block";
  grid.innerHTML=houses.map(h=>{
    const score=totalScore(h);
    const active=state.criteria.filter(c=>h.values?.[c.id]!=="" && h.values?.[c.id]!=null);
    return `<article class="house-card glass" data-id="${h.id}">
      <div class="house-head">
        <div><div class="eyebrow">${esc(h.park)}</div><h3>${esc(h.name)}</h3></div>
        <div class="score">${score.toFixed(1)}<small>/10</small></div>
      </div>
      <div class="chips">${h.period?`<span class="chip">📅 ${esc(h.period)}</span>`:""}${h.persons?`<span class="chip">👥 ${esc(h.persons)}</span>`:""}<span class="chip">${active.length}/${state.criteria.length} Werte</span></div>
      <div class="value-grid">
        ${state.criteria.map(c=>`<div class="value ${trafficFor(c,h.values?.[c.id])}"><span class="label">${esc(c.name)}</span><strong>${esc(formatValue(c,h.values?.[c.id]))}</strong></div>`).join("")}
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".house-card").forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
}
function openHouse(id=null){
  editingId=id; const h=id?state.houses.find(x=>x.id===id):null;
  document.getElementById("houseModalTitle").textContent=h?"Ferienhaus bearbeiten":"Neues Ferienhaus";
  document.getElementById("houseId").value=id||"";
  ["park","houseName","period","persons","notes"].forEach(k=>document.getElementById(k).value=h?.[k]||"");
  document.getElementById("criteriaInputs").innerHTML=state.criteria.map(c=>{
    const v=h?.values?.[c.id] ?? "";
    let input=c.type==="boolean"
      ? `<select data-cid="${c.id}"><option value="">Nicht angegeben</option><option value="1" ${Number(v)===1?"selected":""}>Ja</option><option value="0" ${v!==""&&Number(v)===0?"selected":""}>Nein</option></select>`
      : `<input data-cid="${c.id}" type="number" step="any" value="${esc(v)}" placeholder="${c.type==="time"?"Minuten":""}">`;
    return `<div class="criteria-input"><label>${esc(c.name)}${c.unit?" · "+esc(c.unit):""}</label>${input}</div>`;
  }).join("");
  openModal("houseModal");
}
function saveHouse(e){
  e.preventDefault();
  const id=document.getElementById("houseId").value||uid();
  const existing=state.houses.find(h=>h.id===id);
  const values={};
  document.querySelectorAll("#criteriaInputs [data-cid]").forEach(el=>values[el.dataset.cid]=el.value);
  const h={id,park:document.getElementById("park").value.trim(),name:document.getElementById("houseName").value.trim(),period:document.getElementById("period").value.trim(),persons:document.getElementById("persons").value,notes:document.getElementById("notes").value.trim(),values};
  if(existing) Object.assign(existing,h); else state.houses.push(h);
  save(); closeModal("houseModal"); toast("Ferienhaus gespeichert");
}
function openDetail(id){
  const h=state.houses.find(x=>x.id===id); if(!h)return;
  document.getElementById("detailTitle").textContent=h.name;
  document.getElementById("detailContent").innerHTML=`
    <div class="chips"><span class="chip">${esc(h.park)}</span>${h.period?`<span class="chip">📅 ${esc(h.period)}</span>`:""}${h.persons?`<span class="chip">👥 ${esc(h.persons)} Personen</span>`:""}</div>
    <table class="detail-table"><tbody>${state.criteria.map(c=>{
      const v=h.values?.[c.id], s=scoreFor(c,v);
      return `<tr class="${trafficFor(c,v)}"><td>${esc(c.name)}</td><td>${esc(formatValue(c,v))}</td><td class="points">${s==null?"–":s.toFixed(1)+" Punkte"}</td></tr>`;
    }).join("")}</tbody></table>
    ${h.notes?`<div class="value" style="margin-top:12px"><span class="label">Notizen</span><div style="margin-top:6px;white-space:pre-wrap">${esc(h.notes)}</div></div>`:""}
    <div class="modal-actions"><button class="btn ghost" id="deleteHouseBtn">Löschen</button><button class="btn primary" id="editHouseBtn">Bearbeiten</button></div>`;
  openModal("detailModal");
  document.getElementById("editHouseBtn").onclick=()=>{closeModal("detailModal");openHouse(id)};
  document.getElementById("deleteHouseBtn").onclick=()=>{if(confirm("Dieses Ferienhaus wirklich löschen?")){state.houses=state.houses.filter(x=>x.id!==id);save();closeModal("detailModal");toast("Ferienhaus gelöscht")}};
}
function openMatrix(){
  renderCriteriaEditor(); openModal("matrixModal");
}
function renderCriteriaEditor(){
  const box=document.getElementById("criteriaEditor");
  box.innerHTML=state.criteria.map((c,i)=>`
    <div class="criteria-row" data-index="${i}">
      <div class="criteria-top">
        <label>Name<input data-field="name" value="${esc(c.name)}"></label>
        <label>Gewichtung %<input data-field="weight" type="number" min="0" max="100" step="1" value="${c.weight}"></label>
        <label>Typ<select data-field="type">
          ${["number","time","currency","boolean"].map(t=>`<option value="${t}" ${c.type===t?"selected":""}>${({number:"Zahl",time:"Zeit",currency:"Geld",boolean:"Ja/Nein"})[t]}</option>`).join("")}
        </select></label>
        <button class="delete-btn" data-delete="${i}">Löschen</button>
      </div>
      ${c.type==="boolean"?"":`<div class="criteria-bottom">
        <label class="mini">Einheit<input data-field="unit" value="${esc(c.unit)}"></label>
        <label class="mini">Richtung<select data-field="direction"><option value="higher" ${c.direction==="higher"?"selected":""}>Höher besser</option><option value="lower" ${c.direction==="lower"?"selected":""}>Niedriger besser</option></select></label>
        <label class="mini">🟢 Grenze<input data-field="green" type="number" step="any" value="${c.green}"></label>
        <label class="mini">🟡 Grenze<input data-field="yellow" type="number" step="any" value="${c.yellow}"></label>
        <label class="mini">🔴 Grenze<input data-field="red" type="number" step="any" value="${c.red}"></label>
        <div class="mini" style="align-self:center">Punkte: 10 / 7 / 4 / 0</div>
      </div>`}
    </div>`).join("");
  box.querySelectorAll("[data-delete]").forEach(btn=>btn.onclick=()=>{if(state.criteria.length<=1)return toast("Mindestens ein Kriterium behalten");state.criteria.splice(Number(btn.dataset.delete),1);renderCriteriaEditor()});
}
function readMatrixEditor(){
  document.querySelectorAll(".criteria-row").forEach(row=>{
    const c=state.criteria[Number(row.dataset.index)];
    row.querySelectorAll("[data-field]").forEach(el=>{
      const f=el.dataset.field; c[f]=["weight","green","yellow","red"].includes(f)?Number(el.value):el.value;
    });
    if(c.type==="boolean"){c.unit="";c.direction="higher";c.green=1;c.yellow=0;c.red=0;}
  });
}
function saveMatrix(){
  readMatrixEditor();
  const sum=state.criteria.reduce((a,c)=>a+Number(c.weight||0),0);
  if(Math.abs(sum-100)>0.001){toast(`Gewichtungen ergeben ${sum} %. Bitte auf 100 % bringen.`);return;}
  save(); closeModal("matrixModal"); toast("Bewertungsmatrix gespeichert");
}
function exportData(matrixOnly=false){
  const payload=matrixOnly?{version:1,type:"matrix",criteria:state.criteria}:{version:1,type:"full-backup",exportedAt:new Date().toISOString(),criteria:state.criteria,houses:state.houses};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=matrixOnly?"bewertungsmatrix.json":"ferienhaus-backup.json"; a.click(); URL.revokeObjectURL(a.href);
  toast(matrixOnly?"Matrix exportiert":"Backup exportiert");
}
function importFile(file,matrixOnly=false){
  const r=new FileReader(); r.onload=()=>{
    try{
      const p=JSON.parse(r.result);
      if(matrixOnly){
        if(!Array.isArray(p.criteria)) throw Error();
        state.criteria=p.criteria; save(); renderCriteriaEditor(); toast("Matrix importiert");
      } else {
        if(!Array.isArray(p.criteria)||!Array.isArray(p.houses)) throw Error();
        state.criteria=p.criteria; state.houses=p.houses; save(); toast("Backup importiert");
      }
    }catch(e){toast("Datei konnte nicht importiert werden.")} 
  }; r.readAsText(file);
}
function openModal(id){document.getElementById(id).classList.add("open")}
function closeModal(id){document.getElementById(id).classList.remove("open")}
let toastTimer; function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600)}

document.getElementById("addHouseBtn").onclick=()=>openHouse();
document.getElementById("emptyAddBtn").onclick=()=>openHouse();
document.getElementById("houseForm").onsubmit=saveHouse;
document.getElementById("matrixBtn").onclick=openMatrix;
document.getElementById("saveMatrixBtn").onclick=saveMatrix;
document.getElementById("addCriterionBtn").onclick=()=>{readMatrixEditor();state.criteria.push({id:uid(),name:"Neues Kriterium",type:"number",unit:"",weight:0,direction:"higher",green:10,yellow:5,red:0});renderCriteriaEditor()};
document.getElementById("exportBtn").onclick=()=>exportData(false);
document.getElementById("matrixExportBtn").onclick=()=>{readMatrixEditor();exportData(true)};
document.getElementById("importBtn").onclick=()=>document.getElementById("fileInput").click();
document.getElementById("fileInput").onchange=e=>e.target.files[0]&&importFile(e.target.files[0],false);
document.getElementById("matrixImportBtn").onclick=()=>document.getElementById("matrixFileInput").click();
document.getElementById("matrixFileInput").onchange=e=>e.target.files[0]&&importFile(e.target.files[0],true);
document.getElementById("searchInput").oninput=renderHouses;
document.getElementById("sortSelect").onchange=renderHouses;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
render();
