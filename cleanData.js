// cleanData.js
/* =========================================================
   1.  CASES  ── helpers + normaliser
   ========================================================= */
export const AGENCY_MAP = {
  'attorney':               "Imperial County District Attorney's Office",
  'el centro':              "El Centro Police Department",
  'calexico':               "Calexico Police Department",
  'brawley':                "Brawley Police Department",
  'calipatria state':       "Calipatria State Prison",
  'centinela':              "Centinela State Prison",
  'sheriff':                "Imperial County Sheriff's Office",
  'probation':              "Imperial County Probation Department",
  'highway':                "California Highway Patrol",
  'westmorland':            "Westmorland Police Department",
  'narcotics':              "Imperial County Narcotics Task Force",
  'homeland':               "Department of Homeland Security",
  'parks':                  "CA State Parks",
  'cdcr':                   "California Department of Corrections and Rehabilitation",
  'parole':                 "California Department of Corrections and Rehabilitation",
  'drug enforcement':       "Drug Enforcement Administration",
  'border':                 "U.S. Customs and Border Patrol",
  'land':                   "Bureau of Land Management",
  'riverside sheriff':      "Riverside County Sheriff's Department",
};

export const SUBTYPE_MAP = {
  'dv':                     'Domestic Violence',
  'dvrt':                   'Domestic Violence',
  'spu':                    'Special Prosecution Unit (SPU)',
  'svu':                    'Special Victims Unit (SVU)',
  'icac':                   'Internet Crimes Against Children (ICAC)',
  'dui':                    'DUI',
  'welfare':                'Welfare Fraud',
  'fraud':                  'Fraud',
  'elder':                  'Elder Abuse',
  'parole':                 'Parole Revocation',
  'mandatory supervision':  'Mandatory Supervision',
  // …add more as needed
};

/* ---------- small helpers ---------- */
function tidy (s)        { return String(s ?? '').trim(); }
function lcase(s)        { return tidy(s).toLowerCase(); }

export function canonicalAgency(raw){
  const txt = lcase(raw);
  for (const key in AGENCY_MAP){
    if (txt.includes(key)) return AGENCY_MAP[key];
  }
  return 'Other Arresting Agency';
}

export function canonicalSubtype(raw){
  if (!raw) return 'General Criminal Case';
  const tokens = raw.split(/[,/]/).map(lcase);
  for (const t of tokens){
    for (const k in SUBTYPE_MAP){
      if (t.includes(k)) return SUBTYPE_MAP[k];
    }
  }
  // fallback: nicely-capitalised original
  return tidy(raw).replace(/\s+/g,' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
}

/* ---------- CASES normaliser ---------- */
export function cleanCaseRow(row){
  /* skip access-denied rows (Case ID non-numeric) */
  const id = parseInt(tidy(row['Case ID']),10);
  if (!Number.isInteger(id)) return null;

  return {
    case_id         : id,
    date_da         : row['Case Received By DA'],
    severity        : (t => t.toUpperCase() === 'VOP' ? 'Violation of Probation' : t)(tidy(row['Severity'])),
    agency          : canonicalAgency(row['Arresting Agency']),
    city            : tidy(row['Location City']),
    status          : tidy(row['Status']),
    sub_type        : canonicalSubtype(row['Case Sub Type']),
    days_to_file    : +row['Days to file requested charges']                         || 0,
    days_file_to_sent: parseInt(tidy(row['Days from charges filed to sentencing']),10) || null,
    victim_case     : /case has a victim/i.test(row['Victim Case']),
  };
}

/* =========================================================
   2.  DEFENDANTS ── helpers + normaliser
   ========================================================= */
function canonicalGender(raw){
  const t = lcase(raw);
  if (t.startsWith('m')) return 'Male';
  if (t.startsWith('f')) return 'Female';
  return 'Unknown';
}
function canonicalResident(raw){
  const t = lcase(raw);
  if (t.startsWith('county')) return 'Resident';
  if (t.startsWith('not'))    return 'Non-resident';
  return 'Unknown';
}
/* turn header names into trimmed / lower-case to dodge extra spaces */
function normKeys(rec){
  const out = {};
  for (const k in rec) out[k.trim().toLowerCase()] = rec[k];
  return out;
}

/* ---------- DEFENDANTS normaliser ---------- */
export function cleanDefRow(rawRec){
  const row = normKeys(rawRec);

  const id = parseInt(tidy(row['case id']),10);
  if (!Number.isInteger(id)) return null;        // access denied row

  return {
    case_id   : id,
    ethnicity : tidy(row['ethnicity']),
    gender    : canonicalGender(row['gender'] || row['bettergender']),
    county_res: canonicalResident(row['county resident']),
    age       : (()=>{ const n = parseInt(tidy(row['defendant age']),10);
                       return Number.isFinite(n) ? n : null; })(),
  };
}
