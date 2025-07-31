// victims.js
import { fadeColor } from './app.js';

const WRAP = document.getElementById('victimStatsWrap');
const DESC = document.getElementById('victimDescWrap');
const SUB = document.getElementById('victimSub');
const NAV = document.getElementById('victimYearNav');

const COLORS = [
  '#2196f3', '#e91e63', '#ff9800', '#4caf50', '#9c27b0', '#f44336', '#00bcd4'
];

const SERVICE_GROUPS = {
  'Information and Referral': [
    'Information about the criminal justice process',
    'Information about victim rights',
    'Help with obtaining notifications',
    'Referral to other programs, services, or legal resources'
  ],
  'Personal Advocacy / Accompaniment': [
    'Advocacy for interviews or exams',
    'Help with benefits, housing, schools, immigration',
    'Transportation and interpreter services'
  ],
  'Emotional Support or Safety Services': [
    'Crisis counseling, on-scene response, and safety planning',
    'Therapy and support groups',
    'Emergency financial aid or housing support'
  ],
  'Shelter / Housing Services': [
    'Emergency shelter or transitional housing',
    'Relocation help and securing housing'
  ],
  'Criminal / Civil Justice System Assistance': [
    'Help with court notifications and victim impact statements',
    'Help with restitution and legal support',
    'Support during criminal proceedings'
  ]
};

const DETAIL = document.createElement('div');
DETAIL.className = 'victim-detail-card';
DESC.appendChild(DETAIL);

function buildVictimPanel(rows) {
  const year = 2023;
  const services = {};
  rows.filter(r => r.year === year).forEach(row => {
    for (const type in SERVICE_GROUPS) {
      if (!services[type]) services[type] = 0;
      if (row[type]) services[type]++;
    }
  });

  WRAP.innerHTML = '';
  const total = Object.values(services).reduce((a, b) => a + b, 0);
  SUB.textContent = `${total.toLocaleString()} total services recorded in ${year}`;

  Object.entries(services).forEach(([label, val], i) => {
    const card = document.createElement('div');
    card.className = 'victim-card';
    card.style.borderLeftColor = COLORS[i % COLORS.length];
    card.innerHTML = `
      <div class="victim-title">${label}</div>
      <div class="victim-value">${Math.round((val / total) * 100)}%</div>
    `;
    card.onmouseenter = () => showDescription(label);
    WRAP.appendChild(card);
  });

  showDescription(Object.keys(SERVICE_GROUPS)[0]);
}

function showDescription(key) {
  DETAIL.innerHTML = `
    <h3>${key}</h3>
    <ul>
      ${SERVICE_GROUPS[key].map(txt => `<li>${txt}</li>`).join('')}
    </ul>
  `;
}

window.afterDataReady = window.afterDataReady || [];
window.afterDataReady.push(() => buildVictimPanel(window.rows || []));
