import { cleanVictimRow } from './cleanData.js';

const FOLDER = './data/';
const LETTERS = ['A','B','C','D','E'];
const TAGS = ['CALVCB','UNMET','GEN','VWR'];

function yes(v) {
  return String(v).trim().toLowerCase() === 'yes';
}

function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

async function fetchVictimData(year) {
  try {
    const res = await fetch(`${FOLDER}victims_${year}.xlsx`);
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    return raw.map(cleanVictimRow).filter(Boolean);
  } catch (err) {
    console.error('Failed to load victims data:', err);
    return null;
  }
}

function summarize(data) {
  const counts = {
    totalRecords: 0,
    totalCases: new Set(),
    A: 0, B: 0, C: 0, D: 0, E: 0,
    CALVCB: 0, UNMET: 0, GEN: 0, VWR: 0
  };

  data.forEach(row => {
    counts.totalRecords += row.service_records;
    counts.totalCases.add(row.case_id);
    LETTERS.forEach(L => { if (row[L.toLowerCase()]) counts[L] += 1; });
    TAGS.forEach(T => { if (row[T.toLowerCase()]) counts[T] += 1; });
  });

  return counts;
}

function renderSummary(counts, year) {
  const rows = [
    `<tr><th>Total service records</th><td>${counts.totalRecords.toLocaleString()}</td></tr>`,
    `<tr><th>Total unique cases</th><td>${counts.totalCases.size}</td></tr>`,
    ...LETTERS.map(L => `<tr><th>${L}</th><td>${counts[L]}</td></tr>`),
    ...TAGS.map(T => `<tr><th>${T}</th><td>${counts[T]}</td></tr>`)
  ];

  setHTML('victimSummary', `
    <h2>Victim Services ${year}</h2>
    <table style="margin:20px auto;border-collapse:collapse;font-size:1rem">
      ${rows.join('\n')}
    </table>
  `);
}

(async () => {
  const year = 2023;
  const data = await fetchVictimData(year);
  if (!data || !data.length) {
    setHTML('victimSummary', `<p>No data found for ${year}</p>`);
    return;
  }
  const summary = summarize(data);
  renderSummary(summary, year);
})();
