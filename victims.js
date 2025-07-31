/* victims.js  ───────────────────────────────────────────── */
import { cleanVictimRow } from './cleanData.js';
import { fadeColor }      from './app.js';          // reuse helper
import { Chart }          from 'https://cdn.jsdelivr.net/npm/chart.js';

const FOLDER  = './data/';          // same as app.js
const LETTERS = ['A','B','C','D','E'];
const TAGS    = ['CALVCB','UNMET','GEN','VWR'];
const COLORS  = [
  '#000','#e91e63','#ff9800','#ffe600ff','#4caf50',
  '#00bcd4','#9c27b0','#f44336','#3f51b5','#2196f3','#795548'
];

let yearData = {};   // {2023:[…], 2024:[…]…}
let charts   = [];   // keep refs so we can sync hovers

/* Helper: quick DOM text setter */
function setHTML(id,html){ document.getElementById(id).innerHTML = html; }

/* ---------- 1.  discover which victims_YYYY.xlsx files exist */
async function discoverVictimYears(){
  const found = [];
  const thisYear = new Date().getFullYear();
  for (let y=thisYear; y>=2015; y--){
    try{
      const head = await fetch(`${FOLDER}victims_${y}.xlsx`,{method:'HEAD'});
      if (head.ok) found.push(y); else if (found.length) break;
    }catch{ /* network error – ignore */ }
  }
  return found;
}

/* ---------- 2.  load & clean every victims_YYYY.xlsx we found */
async function loadVictimData(years){
  for (const y of years){
    try{
      const buf = await fetch(`${FOLDER}victims_${y}.xlsx`).then(r=>r.arrayBuffer());
      const wb  = XLSX.read(buf,{type:'array'});
      const raw = XLSX.utils.sheet_to_json(
                  wb.Sheets[wb.SheetNames[0]],{defval:''});
      yearData[y] = raw.map(cleanVictimRow).filter(Boolean);
    }catch(err){
      console.error(`victims_${y}.xlsx failed to load:`,err);
      yearData[y] = [];                    // keep array to avoid crashes
    }
  }
}

/* ---------- 3.  build the panel for ONE year ---------- */
function buildVictimPanel(year){
  const mount = document.getElementById('victimContent');
  mount.innerHTML = '<p style="text-align:center">Loading…</p>';

  const rows = yearData[year] || [];
  if (!rows.length){
    mount.innerHTML = `<p style="text-align:center;font-size:1.1rem">
                         No victim-service data for ${year}.
                       </p>`;
    return;
  }

  /* reset any previous charts */
  charts.forEach(c=>c.destroy()); charts=[];

  /* ---------- aggregates ---------- */
  const months = Array.from({length:12}, ()=>0);
  const letterCounts = Object.fromEntries(LETTERS.map(L=>[L,0]));
  const tagCounts    = Object.fromEntries(TAGS.map(T=>[T,0]));
  let totalRecords   = 0;
  const uniqueCases  = new Set();

  rows.forEach(r=>{
    months[r.month-1] += r.service_records;
    totalRecords      += r.service_records;
    uniqueCases.add(r.case_id);
    r.letters.forEach(L => letterCounts[L] += 1);
    r.tags   .forEach(T => tagCounts[T]    += 1);
  });

  /* ---------- scaffold ---------- */
  mount.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <h2 style="margin:4px 0;">Victim Services ${year}</h2>
      <p style="margin:4px 0;font-size:1.2rem">
        <strong>${totalRecords.toLocaleString()}</strong> service records ·
        <strong>${uniqueCases.size}</strong> unique cases
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

  /* ---------- month bar ---------- */
  const bar = new Chart(
    document.getElementById('victimMonth'),
    {
      type:'bar',
      data:{
        labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets:[{ data:months, backgroundColor:'#2196f3' }]
      },
      options:{
        plugins:{legend:{display:false},tooltip:{callbacks:{
          label:c=>`${c.parsed.y} record${c.parsed.y!==1?'s':''}`
        }}},
        scales:{y:{beginAtZero:true}}
      }
    }
  );
  charts.push(bar);

  /* ---------- donuts for A–E ---------- */
  const letterWrap = document.getElementById('letterWrap');
  LETTERS.forEach((L,i)=>{
    const id=`donut${L}`;
    letterWrap.insertAdjacentHTML('beforeend',`
      <div style="width:160px;text-align:center">
        <canvas id="${id}" width="160" height="160"></canvas>
        <div style="margin-top:4px;font-weight:600">${L}</div>
      </div>`
    );
    const yes = letterCounts[L];
    const donut = new Chart(
      document.getElementById(id),
      {
        type:'doughnut',
        data:{
          labels:['Provided','Not provided'],
          datasets:[{
            data:[yes, rows.length-yes],
            backgroundColor:[COLORS[(i+3)%COLORS.length],'#eee'],
            borderWidth:0
          }]
        },
        options:{
          cutout:'60%',
          plugins:{legend:{display:false},tooltip:{enabled:false}}
        }
      }
    );
    charts.push(donut);
  });

  /* ---------- little tag chips ---------- */
  const tagWrap = document.getElementById('tagWrap');
  TAGS.forEach(T=>{
    tagWrap.insertAdjacentHTML('beforeend',`
      <span style="background:#f3f3f3;padding:6px 12px;border-radius:16px;
                   font-size:0.85rem;font-weight:600">
        ${T}: ${tagCounts[T]}
      </span>
    `);
  });
}

/* ---------- 4.  year switcher with ← / → arrows ---------- */
function addYearArrows(years){
  let cur = years[0];
  const jump = dir =>{
    const i = years.indexOf(cur) + dir;
    if (i>=0 && i<years.length){ cur=years[i]; buildVictimPanel(cur); }
  };
  document.addEventListener('keydown',e=>{
    if (e.key==='ArrowLeft')  jump(+1);   // newer → older
    if (e.key==='ArrowRight') jump(-1);   // older → newer
  });
}

/* ---------- 5.  kick everything off ---------- */
(async ()=>{
  setHTML('victimContent','<p style="text-align:center">Loading…</p>');

  const years = await discoverVictimYears();
  if (!years.length){
    setHTML('victimContent',
            '<p style="text-align:center">No victim-service files found.</p>');
    return;
  }

  await loadVictimData(years);
  buildVictimPanel(years[0]);     // newest first
  addYearArrows(years);
})();
