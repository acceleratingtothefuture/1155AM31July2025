/* victims.js  ───────────────────────────────────────────── */
import { cleanVictimRow } from './cleanData.js';
import { Chart }          from 'https://cdn.jsdelivr.net/npm/chart.js';

const FOLDER  = './data/';
const LETTERS = ['A','B','C','D','E'];
const TAGS    = ['CALVCB','UNMET','GEN','VWR'];
const COLORS  = [
  '#000','#e91e63','#ff9800','#ffe600ff','#4caf50',
  '#00bcd4','#9c27b0','#f44336','#3f51b5','#2196f3','#795548'
];

let dataByYear = {};   // { 2023:[rows…], 2024:[…] }
let charts      = [];

/* -------------------------------------------------- helpers */
const qs   = sel => document.querySelector(sel);
const set  = (id,html) => (qs(id).innerHTML = html);
const yes  = v => String(v).trim().toLowerCase() === 'yes';

/* -------------------------------------------------- 1. find which victim_* files exist */
async function discoverYears(){
  const out = [];
  const now = new Date().getFullYear();
  for (let y = now; y >= 2015; y--){
    try{
      const h = await fetch(`${FOLDER}victims_${y}.xlsx`,{method:'HEAD'});
      if (h.ok) out.push(y);
      else if (out.length) break;          // stop at first gap
    }catch{/* ignore network error */}
  }
  return out;
}

/* -------------------------------------------------- 2. load + clean */
async function load(years){
  for (const y of years){
    try{
      const buf = await fetch(`${FOLDER}victims_${y}.xlsx`).then(r=>r.arrayBuffer());
      const wb  = XLSX.read(buf,{type:'array'});
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      // first, run through cleanVictimRow (trims headers + yes/blank → booleans)
      const rows = raw.map(cleanVictimRow).filter(Boolean);

      // …then add the derived fields (month, letters[], tags[])
      rows.forEach(r=>{
        const dt        = new Date(r.date_da);
        r.monthIndex    = dt.getMonth();               // 0-based
        r.letters       = LETTERS.filter(L => r[L.toLowerCase()]);
        r.tagsProvided  = TAGS.filter(T => r[T.toLowerCase()]);
      });
      dataByYear[y] = rows;
    }catch(err){
      console.error(`victims_${y}.xlsx`,err);
      dataByYear[y] = [];
    }
  }
}

/* -------------------------------------------------- 3. build a single year panel */
function buildYear(year){
  const mount = qs('#victimContent');
  mount.innerHTML = '<p style="text-align:center">Loading…</p>';

  const rows = dataByYear[year] || [];
  if (!rows.length){
    mount.innerHTML = `<p style="text-align:center">No victim-service data for ${year}.</p>`;
    return;
  }

  /* reset old charts */
  charts.forEach(c=>c.destroy());
  charts.length = 0;

  /* aggregate */
  const monthly = Array.from({length:12},()=>0);
  const byLetter = Object.fromEntries(LETTERS.map(L=>[L,0]));
  const byTag    = Object.fromEntries(TAGS.map(T=>[T,0]));
  let totalRecords = 0;
  const cases = new Set();

  rows.forEach(r=>{
    monthly[r.monthIndex]   += r.service_records;
    totalRecords            += r.service_records;
    cases.add(r.case_id);
    r.letters.forEach(L=> byLetter[L] += 1);
    r.tagsProvided.forEach(T=> byTag[T] += 1);
  });

  /* scaffold */
  mount.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <h2 style="margin:4px 0;">Victim Services ${year}</h2>
      <p style="margin:4px 0;font-size:1.15rem">
        <strong>${totalRecords.toLocaleString()}</strong> service records · 
        <strong>${cases.size}</strong> unique cases
      </p>
    </div>

    <div style="max-width:760px;margin:0 auto">
      <canvas id="victimMonth" height="150"></canvas>
    </div>

    <div id="letterWrap"
         style="display:flex;flex-wrap:wrap;gap:16px;
                justify-content:center;margin-top:32px"></div>

    <div id="tagWrap"
         style="display:flex;flex-wrap:wrap;gap:12px;
                justify-content:center;margin-top:24px"></div>
  `;

  /* month bar */
  const bar = new Chart(qs('#victimMonth'),{
    type:'bar',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets:[{ data:monthly, backgroundColor:'#2196f3' }]
    },
    options:{
      plugins:{legend:{display:false},tooltip:{callbacks:{
        label:c=>`${c.parsed.y} record${c.parsed.y!==1?'s':''}`
      }}},
      scales:{y:{beginAtZero:true}}
    }
  });
  charts.push(bar);

  /* doughnuts A-E */
  const letterWrap = qs('#letterWrap');
  LETTERS.forEach((L,i)=>{
    const id=`d_${L}`;
    letterWrap.insertAdjacentHTML('beforeend',`
      <div style="width:160px;text-align:center">
        <canvas id="${id}" width="160" height="160"></canvas>
        <div style="margin-top:6px;font-weight:600">${L}</div>
      </div>
    `);
    const yes = byLetter[L];
    const donut = new Chart(qs('#'+id),{
      type:'doughnut',
      data:{
        labels:['Provided','Not provided'],
        datasets:[{
          data:[yes, rows.length-yes],
          backgroundColor:[COLORS[(i+3)%COLORS.length],'#e5e5e5'],
          borderWidth:0
        }]
      },
      options:{cutout:'60%',plugins:{legend:{display:false},tooltip:{enabled:false}}}
    });
    charts.push(donut);
  });

  /* tag chips */
  const tagWrap = qs('#tagWrap');
  TAGS.forEach(T=>{
    tagWrap.insertAdjacentHTML('beforeend',`
      <span style="background:#f3f3f3;padding:6px 12px;border-radius:16px;
                   font-size:0.85rem;font-weight:600">
        ${T}: ${byTag[T]}
      </span>
    `);
  });
}

/* -------------------------------------------------- 4. arrow nav */
function enableArrowNav(yearList){
  let current = yearList[0];
  const jump = dir=>{
    const idx = yearList.indexOf(current)+dir;
    if (idx>=0 && idx<yearList.length){
      current = yearList[idx];
      buildYear(current);
    }
  };
  document.addEventListener('keydown',e=>{
    if (e.key==='ArrowLeft')  jump(+1);
    if (e.key==='ArrowRight') jump(-1);
  });
}

/* -------------------------------------------------- kick-off */
(async ()=>{
  set('#victimContent','<p style="text-align:center">Loading…</p>');
  const years = await discoverYears();
  if (!years.length){
    set('#victimContent','<p style="text-align:center">No victim-service files found.</p>');
    return;
  }
  await load(years);
  buildYear(years[0]);        // newest first
  enableArrowNav(years);
})();
