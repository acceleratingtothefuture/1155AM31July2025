/* victims.js — VICTIM SERVICES DASHBOARD */
import { fadeColor } from './app.js';

const FOLDER = './data/';
const LETTERS = ['A','B','C','D','E'];
const LETTER_DESC = {
  A: 'Information and Referral',
  B: 'Personal Advocacy / Accompaniment',
  C: 'Emotional Support or Safety Services',
  D: 'Shelter / Housing Services',
  E: 'Criminal / Civil Justice System Assistance'
};

const COLORS = [
  '#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'
];

async function loadVictimData() {
  const buf = await fetch(`${FOLDER}victims_2023.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'array' });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  return raw.map(row => {
    const id = parseInt(String(row['Case ID']).trim(), 10);
    if (!Number.isInteger(id)) return null;
    const count = +row['service records'] || 0;
    return {
      count,
      letters: LETTERS.filter(L => String(row[L]).trim().toLowerCase() === 'yes')
    };
  }).filter(Boolean);
}

function renderVictimDashboard(data) {
  const total = data.reduce((sum, r) => sum + r.count, 0);
  const letterCounts = Object.fromEntries(LETTERS.map(L => [L, 0]));
  data.forEach(r => r.letters.forEach(L => letterCounts[L]++));

  document.getElementById('victimSub').innerHTML = `
    <strong>${total.toLocaleString()}</strong> service records across
    <strong>${data.length}</strong> cases
  `;

  const statsWrap = document.getElementById('victimStatsWrap');
  statsWrap.innerHTML = '';

  LETTERS.forEach((L, i) => {
    const count = letterCounts[L];
    const percent = ((count / data.length) * 100).toFixed(1);
    const color = COLORS[i % COLORS.length];
    const div = document.createElement('div');
    div.className = 'victim-card';
    div.style.borderLeftColor = color;
    div.innerHTML = `
      <div class="victim-title">${LETTER_DESC[L]}</div>
      <div class="victim-value" style="color:${color}">${count} cases</div>
      <div style="font-size:0.9rem;color:#666">(${percent}% of total)</div>
    `;
    div.onmouseenter = () => div.style.background = fadeColor(color, 0.1);
    div.onmouseleave = () => div.style.background = '#fff';
    statsWrap.appendChild(div);
  });

  renderDescriptions();
}

function renderDescriptions() {
  const wrap = document.getElementById('victimDescWrap');
  wrap.innerHTML = `
    <h3>Service Descriptions</h3>
    <ul>
      <li><strong>A. Information and Referral:</strong> Info about victim rights, justice process, and referrals.</li>
      <li><strong>B. Personal Advocacy / Accompaniment:</strong> Advocacy during interviews, help with public benefits, interpreter services, immigration help.</li>
      <li><strong>C. Emotional Support or Safety Services:</strong> Crisis counseling, community response, emergency financial help, support groups.</li>
      <li><strong>D. Shelter / Housing Services:</strong> Emergency shelter, relocation help, transitional housing.</li>
      <li><strong>E. Criminal / Civil Justice Assistance:</strong> Updates on legal events, court support, restitution help, legal guidance.</li>
    </ul>
  `;
}

(async () => {
  const data = await loadVictimData();
  renderVictimDashboard(data);
})();
