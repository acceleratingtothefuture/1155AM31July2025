import { fadeColor } from './app.js';

let demoData = {};
let demoCharts = {};

const FOLDER = './data/';

const COLORS = [
  '#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0',
  '#3f51b5', '#795548', '#00bcd4', '#f44336'
];

export async function loadVictimDemographics(YEARS) {
  for (const y of YEARS) {
    try {
      const res = await fetch(`${FOLDER}victim_demographics${y}.xlsx`);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const cleaned = raw.map(r => {
        const id = parseInt(String(r['Case ID']).trim(), 10);
        if (!Number.isFinite(id)) return null;

        const gender = String(r['betterGender'] || r['Gender'] || '').trim();
        const ageRaw = String(r['Victim age']).trim();
        const age = parseInt(ageRaw, 10);
        const age_group =
          !Number.isFinite(age) ? 'Unknown' :
          age < 18  ? '<18' :
          age <= 24 ? '18–24' :
          age <= 34 ? '25–34' :
          age <= 49 ? '35–49' :
          age <= 64 ? '50–64' : '65+';

        return {
          gender: gender === '' || /not reported/i.test(gender) ? 'Unknown' : gender,
          age_group,
          ethnicity: 'Unknown' // future use
        };
      }).filter(Boolean);

      demoData[y] = cleaned;
    } catch (err) {
      console.warn(`Could not load victim demographics for ${y}`, err);
    }
  }
}

export function initVictimDemographics() {
  const years = Object.keys(demoData).sort((a, b) => b - a);
  const btnWrap = document.getElementById('demoYearButtons');

  btnWrap.innerHTML = years.map((y, i) =>
    `<button class="year-btn ${i === 0 ? 'active' : ''}" data-year="${y}">${y}</button>`
  ).join('');

  btnWrap.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderVictimCharts(btn.dataset.year);
    };
  });

  if (years.length) renderVictimCharts(years[0]);
}

function renderVictimCharts(year) {
  const data = demoData[year];
  const gender = {}, age = {}, eth = {};

  data.forEach(row => {
    gender[row.gender] = (gender[row.gender] || 0) + 1;
    age[row.age_group] = (age[row.age_group] || 0) + 1;
    eth[row.ethnicity] = (eth[row.ethnicity] || 0) + 1;
  });

  drawPie('victimDemoChartGender', gender);
  drawPie('victimDemoChartAge', age);
  drawPie('victimDemoChartEthnicity', eth);
}

function drawPie(id, values) {
  const labels = Object.keys(values);
  const counts = labels.map(k => values[k]);
  const ctx = document.getElementById(id).getContext('2d');

  if (demoCharts[id]) demoCharts[id].destroy();

  demoCharts[id] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length])
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right' },
        tooltip: { enabled: true }
      }
    }
  });
}
