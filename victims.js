import { cleanVictimRow } from './cleanData.js';

const FOLDER  = './data/';
const LETTERS = ['A','B','C','D','E'];
const TAGS    = ['CALVCB','UNMET','GEN','VWR'];
const DESC = {
  A: 'Information and Referral',
  B: 'Personal Advocacy / Accompaniment',
  C: 'Emotional Support or Safety Services',
  D: 'Shelter / Housing Services',
  E: 'Criminal / Civil Justice System Assistance',
  CALVCB: 'California Victim Compensation Board',
  UNMET: 'Unmet services due to org capacity',
  GEN: 'Generic service category',
  VWR: 'Victim Witness Room usage'
};

let yearData = {};
let allYears = [];
let currentYear = null;

function setHTML(id, html){
  document.getElementById(id).innerHTML = html;
}

async function discoverVictimYears(){
  const found = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--){
    try {
      const head = await fetch(`${FOLDER}victims_${y}.xlsx`, { method:'HEAD' });
      if (head.ok) found.push(y);
      else if (found.length) break;
    } catch {}
  }
  return found;
}

async function loadVictimData(years){
  for (const y of years){
    try {
      const buf = await fetch(`${FOLDER}victims_${y}.xlsx`).then(r=>r.arrayBuffer());
      const wb  = XLSX.read(buf,{type:'array'});
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      yearData[y] = raw.map(cleanVictimRow).filter(Boolean);
    } catch(err){
      console.warn(`Victim ${y} failed:`, err);
      yearData[y] = [];
    }
  }
}

function buildYearNav(){
  const wrap = document.getElementById('victimYearNav');
  wrap.innerHTML = allYears.map(y=>
    `<button data-year="${y}" class="${y===currentYear ? 'active' : ''}">
      ${y}
    </button>`
  ).join('');
  wrap.querySelectorAll('button').forEach(btn=>{
    btn.onclick = () => {
      currentYear = +btn.dataset.year;
      renderVictimDashboard(currentYear);
      buildYearNav();
    };
  });
}

function renderVictimDashboard(year){
  const rows = yearData[year] || [];
  const totalRecords = rows.reduce((sum,r)=>sum + r.service_records, 0);
  const uniqueCases = new Set(rows.map(r=>r.case_id));

  const counts = {};
  [...LETTERS, ...TAGS].forEach(k => counts[k] = 0);
  rows.forEach(r=>{
    if (r.a) counts.A++;
    if (r.b) counts.B++;
    if (r.c) counts.C++;
    if (r.d) counts.D++;
    if (r.e) counts.E++;
    if (r.calvcb) counts.CALVCB++;
    if (r.unmet)  counts.UNMET++;
    if (r.gen)    counts.GEN++;
    if (r.vwr)    counts.VWR++;
  });

  setHTML('victimSub', `<strong>${totalRecords.toLocaleString()}</strong> service records · <strong>${uniqueCases.size}</strong> unique cases`);

  const statWrap = document.getElementById('victimStatsWrap');
  statWrap.innerHTML = Object.entries(counts).map(([k,v])=>`
    <div class="victim-card">
      <div class="victim-title">${DESC[k] || k}</div>
      <div class="victim-value">${v.toLocaleString()}</div>
    </div>
  `).join('');

  const descWrap = document.getElementById('victimDescWrap');
  descWrap.innerHTML = `
    <h3>A. Information and Referral</h3>
    <ul>
      <li>Info on justice process, victim rights, referrals, notifications</li>
    </ul>
    <h3>B. Personal Advocacy / Accompaniment</h3>
    <ul>
      <li>Support with interviews, benefits, employers, immigration</li>
    </ul>
    <h3>C. Emotional Support or Safety Services</h3>
    <ul>
      <li>Crisis response, counseling, healing, safety planning</li>
    </ul>
    <h3>D. Shelter / Housing Services</h3>
    <ul>
      <li>Emergency shelter, relocation, transitional housing</li>
    </ul>
    <h3>E. Criminal / Civil Justice System Assistance</h3>
    <ul>
      <li>Court events, restitution, legal help, impact statements</li>
    </ul>
  `;
}

(async ()=>{
  setHTML('victimSub','Loading…');
  allYears = await discoverVictimYears();
  if (!allYears.length){
    setHTML('victimSub','No victim-service files found.');
    return;
  }
  await loadVictimData(allYears);
  currentYear = allYears[0];
  buildYearNav();
  renderVictimDashboard(currentYear);
})();
