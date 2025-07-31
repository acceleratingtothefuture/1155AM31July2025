/* victims.js  ───────────────────────────────────────────── */
import { fadeColor } from './app.js';        // reuse helper
import { Chart }     from 'https://cdn.jsdelivr.net/npm/chart.js';

const FOLDER = './data/';   // same as app.js
const LETTERS = ['A','B','C','D','E'];
const TAGS    = ['CALVCB','UNMET','GEN','VWR'];

let yearData = {};          // {2023: rows[] , 2024: rows[] …}
let charts   = [];          // keep refs so we can sync hovers

/* ---------- 1.  discover which victims_YYYY.xlsx files exist */
async function discoverVictimYears() {
  const found = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const head = await fetch(`${FOLDER}victims_${y}.xlsx`, { method:'HEAD' });
    if (head.ok) found.push(y); else if (found.length) break;
  }
  return found;
}

/* ---------- 2.  quick row normaliser */
function cleanVictimRow(r) {
  const id = parseInt(String(r['Case ID']).trim(),10);
  if (!Number.isInteger(id)) return null;          // skip access-denied
  const dt = new Date(r['Case Received By DA']);
  return {
    case_id : id,
    ts      : dt.getTime(),
    year    : dt.getFullYear(),
    month   : dt.getMonth()+1,
    letters : LETTERS.filter(L => String(r[L]).trim().toLowerCase()==='yes'),
    tags    : TAGS.filter(T => String(r[T]).trim().toLowerCase()==='yes'),
    count   : +r['service records'] || 0
  };
}

/* ---------- 3.  load every victims_YYYY.xlsx we found */
async function loadVictimData(years) {
  for (const y of years) {
    const buf = await fetch(`${FOLDER}victims_${y}.xlsx`).then(r=>r.arrayBuffer());
    const wb  = XLSX.read(buf,{type:'array'});
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    yearData[y] = raw.map(cleanVictimRow).filter(Boolean);
  }
}

/* ---------- 4.  build the panel for a given year ---------- */
function buildVictimPanel(year) {
  const mount = document.getElementById('victimContent');
  mount.innerHTML = '';                      // clear old stuff
  charts.forEach(c=>c.destroy()); charts=[]; // reset sync

  const rows = yearData[year] || [];
  const months = Array.from({length:12},(_,$)=>0);
  let totalRecords = 0, totalCases = new Set();

  /* aggregate */
  const letterCounts = Object.fromEntries(LETTERS.map(L=>[L,0]));
  const tagCounts    = Object.fromEntries(TAGS.map(T=>[T,0]));

  rows.forEach(r=>{
    months[r.month-1] += r.count;
    totalRecords      += r.count;
    totalCases.add(r.case_id);
    r.letters.forEach(L=>letterCounts[L] += 1);
    r.tags   .forEach(T=>tagCounts[T]    += 1);
  });

  /* ---------- DOM scaffold ---------- */
  mount.insertAdjacentHTML('beforeend',`
    <div style="text-align:center;margin-bottom:24px">
      <h2 style="margin:4px 0;">Victim Services ${year}</h2>
      <p style="margin:4px 0;font-size:1.2rem">
        <strong>${totalRecords.toLocaleString()}</strong> service records ·
        <strong>${totalCases.size}</strong> unique cases
      </p>
    </div>

    <div style="max-width:760px;margin:0 auto">
      <canvas id="victimMonth" height="150"></canvas>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:16px;
                justify-content:center;margin-top:32px" id="letterWrap"></div>

    <div style="display:flex;flex-wrap:wrap;gap:12px;
                justify-content:center;margin-top:24px" id="tagWrap"></div>
  `);

  /* ---------- month bar chart ---------- */
  const barCtx = document.getElementById('victimMonth').getContext('2d');
  const bar = new Chart(barCtx,{
    type:'bar',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets:[{
        data:months,
        backgroundColor:'#2196f3'
      }]
    },
    options:{
      plugins:{legend:{display:false},tooltip:{callbacks:{
        label:(c)=>`${c.parsed.y} records`
      }}},
      scales:{y:{beginAtZero:true}}
    }
  });
  charts.push(bar);

  /* ---------- donut / ring for each letter ---------- */
  const wrap = document.getElementById('letterWrap');
  LETTERS.forEach((L,i)=>{
    const id=`donut${L}`;
    wrap.insertAdjacentHTML('beforeend',`
      <div style="width:160px;text-align:center">
        <canvas id="${id}" width="160" height="160"></canvas>
        <div style="margin-top:4px;font-weight:600">${L}</div>
      </div>`
    );
    const ctx=document.getElementById(id).getContext('2d');
    const chart=new Chart(ctx,{
      type:'doughnut',
      data:{
        labels:['Yes','No'],
        datasets:[{
          data:[letterCounts[L], rows.length-letterCounts[L]],
          backgroundColor:[COLORS[(i+2)%COLORS.length],'#eee'],
          borderWidth:0
        }]
      },
      options:{
        cutout:'60%',
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        interaction:{mode:'nearest',intersect:false},
        onHover:(e,els)=>{
          ctx.canvas.style.cursor = els.length?'pointer':'default';
        }
      }
    });
    charts.push(chart);
  });

  /* ---------- little tag pills ---------- */
  const tagWrap=document.getElementById('tagWrap');
  TAGS.forEach(T=>{
    tagWrap.insertAdjacentHTML('beforeend',`
      <span style="background:#f3f3f3;padding:6px 12px;border-radius:16px;
                   font-size:0.85rem;font-weight:600">
        ${T}: ${tagCounts[T]}
      </span>
    `);
  });
}

/* ---------- 5.  year switcher (← / →) ---------- */
function addYearArrows(years) {
  const idx = years.indexOf(years[0]);
  let cur   = years[0];

  const mount = document.querySelector('#panelVictims h2');
  const renderYear = y => { buildVictimPanel(y); cur=y; };

  document.addEventListener('keydown',e=>{
    if (e.key==='ArrowLeft'){
      const i=years.indexOf(cur); if (i<years.length-1) renderYear(years[i+1]);
    }
    if (e.key==='ArrowRight'){
      const i=years.indexOf(cur); if (i>0) renderYear(years[i-1]);
    }
  });
}

/* ---------- 6.  kick everything off ---------- */
(async ()=>{
  const yrs = await discoverVictimYears();
  await loadVictimData(yrs);
  buildVictimPanel(yrs[0]);   // start with newest year
  addYearArrows(yrs);
})();
