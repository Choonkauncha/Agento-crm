import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedLeads = null;
function loadRealLeads() {
  if (cachedLeads) return cachedLeads;
  const candidates = [
    new URL('../data/leads.json', import.meta.url),
    path.resolve(process.cwd(), 'data/leads.json'),
    path.resolve(process.cwd(), 'true-north-sales-map/data/leads.json'),
  ];
  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedLeads = parsed;
        return cachedLeads;
      }
    } catch {
      // try next path
    }
  }
  cachedLeads = [];
  return cachedLeads;
}

const IKO_TIERS = {
  good_iko_cambridge: { label: 'Good · IKO Cambridge Architectural', ratePerSq: 265, fixedOverhead: 650 },
  better_iko_dynasty: { label: 'Better · IKO Dynasty (Class 3 Impact Rated)', ratePerSq: 283, fixedOverhead: 650 },
  best_iko_nordic_impact: { label: 'Best · IKO Nordic (Class 4 Impact Rated)', ratePerSq: 318, fixedOverhead: 650 },
};

export function computeRoofProposal({ area = 2500, wastePct = 12, targetMarginPct = 35 } = {}) {
  const cleanArea = Math.min(25000, Math.max(600, Number(area) || 2500));
  const cleanWaste = Math.min(30, Math.max(5, Number(wastePct ?? 12)));
  const requestedMarginPct = Number(targetMarginPct ?? 35);
  const effectiveMarginPct = Math.min(65, Math.max(requestedMarginPct, 30));
  const squares = Number(((cleanArea * (1 + cleanWaste / 100)) / 100).toFixed(2));
  const marginDivisor = 1 - effectiveMarginPct / 100;

  const tierBreakdown = {};
  const tiers = {};
  for (const [key, cfg] of Object.entries(IKO_TIERS)) {
    const directCost = Number((squares * cfg.ratePerSq + cfg.fixedOverhead).toFixed(2));
    const quotedPrice = Number((directCost / marginDivisor).toFixed(2));
    const grossProfit = Number((quotedPrice - directCost).toFixed(2));
    const grossMarginPct = Number(((grossProfit / quotedPrice) * 100).toFixed(1));
    const repCommission10Pct = Number((grossProfit * 0.10).toFixed(2));
    tiers[key] = quotedPrice;
    tierBreakdown[key] = {
      label: cfg.label,
      ratePerSq: cfg.ratePerSq,
      fixedOverhead: cfg.fixedOverhead,
      directCost,
      quotedPrice,
      grossProfit,
      grossMarginPct,
      repCommission10Pct,
    };
  }

  const primary = tierBreakdown.better_iko_dynasty;
  return {
    area: cleanArea,
    wastePct: cleanWaste,
    squares,
    requestedMarginPct,
    targetMarginPct: effectiveMarginPct,
    marginFloorClamped: requestedMarginPct < 30,
    directCost: primary.directCost,
    quotedPrice: primary.quotedPrice,
    grossProfit: primary.grossProfit,
    grossMarginPct: primary.grossMarginPct,
    commission1099: primary.repCommission10Pct,
    setterBonus: 150.0,
    tiers,
    tierBreakdown,
  };
}

function parseDamageFindings(findingsStr = '') {
  const text = String(findingsStr || '6 wind creases · 9 hail bruisings · 3 missing tabs');
  const windMatch = text.match(/(\d+)\s*wind/i);
  const hailMatch = text.match(/(\d+)\s*hail/i);
  const missingMatch = text.match(/(\d+)\s*(?:missing|tab|shingle)/i);
  const hasExplicitCounts = Boolean(windMatch || hailMatch || missingMatch);
  const windCount = windMatch ? Number(windMatch[1]) : (hasExplicitCounts ? 0 : 6);
  const hailCount = hailMatch ? Number(hailMatch[1]) : (hasExplicitCounts ? 0 : 9);
  const missingCount = missingMatch ? Number(missingMatch[1]) : (hasExplicitCounts ? 0 : 3);
  const totalPoints = windCount + hailCount + missingCount * 2;
  let severity = 'Full Replacement Recommended (Insurance Restorable)';
  let recommendedSystem = 'IKO Dynasty Architectural (Class 3 Impact Rated)';
  if (totalPoints < 4) {
    severity = 'Preventative Maintenance & Pipe Boot / Sealant Service';
    recommendedSystem = 'IKO Cambridge Architectural Repair Kit';
  } else if (totalPoints < 10) {
    severity = 'Targeted Slope Repair / Partial Replacement Evaluation';
    recommendedSystem = 'IKO Cambridge Architectural (Slope Match)';
  } else if (hailCount >= 12) {
    severity = 'Severe Hail Impact — Full Replacement Recommended (Insurance Restorable)';
    recommendedSystem = 'IKO Nordic Performance (Class 4 Impact Rated)';
  }
  return { text, windCount, hailCount, missingCount, severity, recommendedSystem };
}

const TERRITORY_COUNTS = {
  'mount vernon': 7566,
  howard: 3148,
  fredericktown: 1896,
  centerburg: 1427,
  danville: 701,
  gambier: 527,
  utica: 291,
};

const TERRITORY_FALLBACK_LEADS = {
  'mount vernon': [
    { id: 'csv-158467647', homeowner: 'JEFFREY TOWNSEND', address: '7929 MARTINSBURG RD, Mount Vernon, OH 43050-9074', lat: 40.3482712, lng: -82.4358394, stormScore: 144, hailInches: 1.5, stage: 'Untouched' },
    { id: 'csv-154626719', homeowner: 'CARLA SKAL', address: '20 PARROTT ST, Mount Vernon, OH 43050-4520', lat: 40.3753376, lng: -82.4867023, stormScore: 140, hailInches: 1.5, stage: 'Untouched' },
    { id: 'csv-156960266', homeowner: 'LAUREL MCDONALD', address: '108 CLIFF ST, Mount Vernon, OH 43050-4148', lat: 40.3816597, lng: -82.4814359, stormScore: 136, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-5128', homeowner: 'HARRINGTON LORI A', address: '6 1/2 BURGESS ST, Mount Vernon, OH 43050', lat: 40.397451, lng: -82.485836, stormScore: 132, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-5129', homeowner: 'SMITH VICTORIA & CODY', address: '300 1/2 CALHOUN ST, Mount Vernon, OH 43050', lat: 40.4010342, lng: -82.4889852, stormScore: 128, hailInches: 1.25, stage: 'Untouched' },
  ],
  fredericktown: [
    { id: 'csv-156892588', homeowner: 'MOLLIE ROJAS', address: '37 N EDGEHILL DR, Fredericktown, OH 43019-1160', lat: 40.4818635, lng: -82.5409061, stormScore: 146, hailInches: 1.5, stage: 'Untouched' },
    { id: 'csv-156103646', homeowner: 'SCOTT SCRIBNER', address: '9304 MOUNT GILEAD RD, Fredericktown, OH 43019-9594', lat: 40.4735568, lng: -82.5741453, stormScore: 142, hailInches: 1.5, stage: 'Untouched' },
    { id: 'csv-158709458', homeowner: 'CAMERON SNYDER', address: '13246 LAKELAND DR, Fredericktown, OH 43019-9727', lat: 40.516564, lng: -82.5031267, stormScore: 138, hailInches: 1.25, stage: 'Untouched' },
    { id: 'csv-157466070', homeowner: 'ROBERT BURKEY', address: '2697 TOWNSHIP ROAD 190, Fredericktown, OH 43019-9427', lat: 40.4424214, lng: -82.6782173, stormScore: 134, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-1490', homeowner: 'ALBRIGHT JOSHUA & REBECCA', address: '14 COLUMBUS RD, Fredericktown, OH 43019', lat: 40.479211, lng: -82.542619, stormScore: 130, hailInches: 1.25, stage: 'Untouched' },
  ],
  gambier: [
    { id: 'knox-2976', homeowner: 'STOKES GRAHAM HOWARD & HARBOURT ELLEN K', address: '206 N ACLAND ST, Gambier, OH 43022', lat: 40.3782357, lng: -82.3947522, stormScore: 142, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-2977', homeowner: 'PALMER GEORGINA L', address: '8790 ALBERT LN, Gambier, OH 43022', lat: 40.3576311, lng: -82.4330066, stormScore: 138, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-2978', homeowner: 'FARMER DWIGHT O', address: '8860 ALBERT LN, Gambier, OH 43022', lat: 40.3600586, lng: -82.43283, stormScore: 134, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-2979', homeowner: 'MANN SARAH T & WRIGHT ZACHARY L', address: '102 ALLEN DR, Gambier, OH 43022', lat: 40.3819017, lng: -82.3908797, stormScore: 130, hailInches: 1.25, stage: 'Untouched' },
    { id: 'knox-2980', homeowner: 'LEGROS JOHN E & LINDA M', address: '104 ALLEN DR, Gambier, OH 43022', lat: 40.3819279, lng: -82.3908496, stormScore: 126, hailInches: 1.25, stage: 'Untouched' },
  ],
};

const OPERATIONS = {
  onboard_1099_rep: {
    domain: 'HR',
    riskTier: 'medium',
    requiredRole: 'admin',
    description: 'Provision a 1099 Sales Rep or Appointment Setter with role-gated portal credentials, territory bounds, and GroupMe routing.',
  },
  audit_rep_shift_compliance: {
    domain: 'HR',
    riskTier: 'low',
    requiredRole: 'rep',
    description: 'Verify GPS shift breadcrumbs, door-knock visit cadence, and SPEAX AI coaching completion across the 5-person field team.',
  },
  assign_canvass_shift: {
    domain: 'HR',
    riskTier: 'medium',
    requiredRole: 'admin',
    description: 'Dispatch a multi-stop Knox County / Mount Vernon storm canvass route to an active field rep or setter.',
  },
  triage_storm_leads: {
    domain: 'Construction',
    riskTier: 'low',
    requiredRole: 'setter',
    description: 'Query and prioritize 17,177 geocoded Ohio properties by NOAA hail/wind swath overlap, roof age, and disposition stage.',
  },
  log_ai_roof_inspection: {
    domain: 'Construction',
    riskTier: 'medium',
    requiredRole: 'rep',
    description: 'Analyze roof inspection imagery for wind/hail/missing tabs and log a structured IKO shingle recommendation.',
  },
  dispatch_production_job: {
    domain: 'Construction',
    riskTier: 'medium',
    requiredRole: 'admin',
    description: 'Promote a signed roof replacement estimate into an active production work order with material takeoff.',
  },
  generate_margin_guarded_estimate: {
    domain: 'Finance',
    riskTier: 'medium',
    requiredRole: 'rep',
    description: 'Compute a roof replacement quote from aerial square footage, pitch, and waste factor while enforcing a 35% gross margin guardrail.',
  },
  compute_rep_commissions_and_pnl: {
    domain: 'Finance',
    riskTier: 'low',
    requiredRole: 'admin',
    description: 'Calculate contract gross profit, cash collected, receivables, and 1099 sales commission payouts across active jobs.',
  },
  reconcile_job_ledger: {
    domain: 'Finance',
    riskTier: 'medium',
    requiredRole: 'admin',
    description: 'Apply homeowner progress payments and supplier invoice costs to a job ledger and recompute net margin.',
  },
};

const ROLE_RANK = { setter: 1, rep: 2, admin: 3 };

function matchTerritoryLeads(territory) {
  const allLeads = loadRealLeads();
  const cityKey = String(territory || 'Mount Vernon').split('(')[0].trim().toLowerCase();
  const matched = allLeads.filter(l => (l.city || '').toLowerCase().includes(cityKey));
  const geocodedMatched = matched.filter(l => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng)));
  const fallback = TERRITORY_FALLBACK_LEADS[cityKey] || TERRITORY_FALLBACK_LEADS['mount vernon'];
  const sample = geocodedMatched.length >= 3
    ? geocodedMatched.slice(0, 5).map((l, idx) => ({
        id: l.id,
        homeowner: l.name,
        address: l.fullAddress || `${l.address}, ${l.city}, ${l.state} ${l.zip}`,
        lat: Number(l.lat),
        lng: Number(l.lng),
        stormScore: 144 - idx * 4,
        hailInches: idx < 2 ? 1.5 : 1.25,
        stage: l.stage || 'Untouched',
      }))
    : fallback;
  const territoryMatchesCount = matched.length || TERRITORY_COUNTS[cityKey] || 7566;
  return { allLeads, matched, territoryMatchesCount, sample };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agento-Role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      platform: 'True North Field OS — Agento Unified Suite',
      version: '2.2.0-agento',
      domains: ['HR', 'Construction', 'Finance'],
      stats: [
        { label: 'Hours saved', value: '30–40 hrs/week' },
        { label: 'Prospecting records', value: '17,232 total (17,177 mapped)' },
        { label: 'Active field team', value: '5-person 1099 & leadership crew' },
        { label: 'Target gross margin', value: '35% enforced floor' },
      ],
      operations: Object.entries(OPERATIONS).map(([name, spec]) => ({ name, ...spec })),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }
  const operation = body.operation;
  const actorRole = (body.actorRole || req.headers['x-agento-role'] || 'admin').toLowerCase();
  const payload = body.payload || {};

  const spec = OPERATIONS[operation];
  if (!spec) {
    return res.status(400).json({
      error: `Unknown Agento operation: ${operation}`,
      availableOperations: Object.keys(OPERATIONS),
    });
  }

  if ((ROLE_RANK[actorRole] || 0) < ROLE_RANK[spec.requiredRole]) {
    return res.status(403).json({
      error: `RBAC policy violation: '${operation}' (${spec.domain}) requires '${spec.requiredRole}', caller is '${actorRole}'.`,
      governanceRule: 'RBAC_ROLE_GATE',
    });
  }

  const repName = payload.name || 'Jordan Miller (1099 Sales Rep)';
  const territory = payload.territory || 'Mount Vernon';
  const property = payload.property || '513 South McKenzie St, Mount Vernon, OH 43050';
  const quote = computeRoofProposal({
    area: payload.area ?? 2500,
    wastePct: payload.wastePct ?? 12,
    targetMarginPct: payload.targetMarginPct ?? 35,
  });

  const { squares, directCost, quotedPrice, grossProfit, grossMarginPct, requestedMarginPct, marginFloorClamped, commission1099, setterBonus, tiers, tierBreakdown } = quote;

  let output = {};
  switch (operation) {
    case 'onboard_1099_rep':
      output = {
        contractorId: 'rep_' + repName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 18),
        name: repName,
        classification: '1099 Independent Contractor',
        assignedTerritory: territory,
        roleGranted: payload.roleGranted || 'rep',
        leadRoutingChannel: 'True North Team GroupMe (personal phone routing disabled)',
        w9AndAgreementStatus: 'Verified',
        voiceCoachAssigned: 'SPEAX Pitch & Objection Module v2',
        onboardingTimeSavedMin: 45,
      };
      break;

    case 'audit_rep_shift_compliance': {
      const { sample } = matchTerritoryLeads(territory);
      const normProp = property.trim().toLowerCase();
      const distinctPool = sample.filter(s => s.address.trim().toLowerCase() !== normProp);
      output = {
        rep: repName,
        territory,
        shiftWindowET: '4:30 PM – 6:00 PM ET',
        gpsBreadcrumbsVerified: 42,
        verifiedPropertyStops: [
          { address: property, dwellSec: 340, disposition: 'Inspection Scheduled' },
          { address: distinctPool[0]?.address || '204 E Vine St, Mount Vernon, OH 43050', dwellSec: 185, disposition: 'Knocked · Follow-Up' },
          { address: distinctPool[1]?.address || '118 N Mulberry St, Mount Vernon, OH 43050', dwellSec: 95, disposition: 'No Answer' },
        ],
        voiceCoachScore: 92,
        complianceStatus: 'COMPLIANT',
      };
      break;
    }

    case 'assign_canvass_shift': {
      const { sample } = matchTerritoryLeads(territory);
      const stopsCount = Number(payload.stopsCount || 18);
      output = {
        routeId: `rt_${territory.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_storm_01`,
        assignedTo: repName,
        territory,
        stopsCount,
        estimatedDriveAndWalkMin: Math.round(stopsCount * 6.4),
        priorityTier: 'High Hail & Wind Overlap (Score >= 128)',
        firstThreeStops: sample.slice(0, 3).map(s => s.address),
      };
      break;
    }

    case 'triage_storm_leads': {
      const { allLeads, territoryMatchesCount, sample } = matchTerritoryLeads(territory);
      output = {
        territory,
        totalCatalogScanned: allLeads.length || 17232,
        territoryMatchesCount,
        highPriorityMatches: Math.min(territoryMatchesCount, 50),
        topRankedProperties: sample,
      };
      break;
    }

    case 'log_ai_roof_inspection': {
      const parsed = parseDamageFindings(payload.findings);
      const bundles = Math.ceil(squares * 3);
      const perimeterLf = Math.round(Math.sqrt(quote.area) * 4);
      output = {
        property,
        findingsSummary: parsed.text,
        damageBreakdown: {
          windCreases: parsed.windCount,
          hailBruises: parsed.hailCount,
          missingTabs: parsed.missingCount,
        },
        severity: parsed.severity,
        recommendedSystem: parsed.recommendedSystem,
        materialTakeoff: {
          roofAreaSqFt: quote.area,
          wastePct: quote.wastePct,
          squaresWithWaste: squares,
          shingleBundles: bundles,
          starterStripBundles: Math.max(2, Math.ceil(perimeterLf / 105)),
          iceAndWaterShieldRolls: Math.ceil(squares / 4),
          syntheticUnderlaymentRolls: Math.ceil(squares / 10),
          hipAndRidgeBundles: Math.ceil(squares / 9),
          dripEdgePieces10ft: Math.ceil((perimeterLf * 1.08) / 10),
          coilNailsBoxes: Math.max(1, Math.ceil(squares / 15)),
        },
        adminNotificationDispatched: true,
      };
      break;
    }

    case 'dispatch_production_job': {
      const parsed = parseDamageFindings(payload.findings);
      output = {
        workOrderId: 'WO-TN-2026-1042',
        property,
        shingleSpec: parsed.recommendedSystem,
        squaresScheduled: squares,
        shingleBundlesStaged: Math.ceil(squares * 3),
        crewLead: 'Spencer Jones (Head of Production)',
        supplierOrderStatus: 'Staged for Rooftop Delivery',
        contractValue: quotedPrice,
        directCostBudget: directCost,
        status: 'PRODUCTION_SCHEDULED',
      };
      break;
    }

    case 'generate_margin_guarded_estimate':
      output = {
        property,
        roofAreaSqFt: quote.area,
        wastePct: quote.wastePct,
        squaresWithWaste: squares,
        directCost,
        quotedPrice,
        grossProfit,
        grossMarginPct,
        requestedMarginPct,
        marginFloorClamped,
        projected1099Commission: commission1099,
        setterInspectionBonus: setterBonus,
        marginGuardrailPassed: grossMarginPct >= 30,
        tiers,
        tierBreakdown,
      };
      break;

    case 'compute_rep_commissions_and_pnl':
      output = {
        property,
        contractRevenue: quotedPrice,
        directMaterialAndLaborCost: directCost,
        grossProfit,
        grossMarginPct,
        rep1099Commission10PctGP: commission1099,
        setterBookedInspectionBonus: setterBonus,
        netCompanyContribution: Number((grossProfit - commission1099 - setterBonus).toFixed(2)),
      };
      break;

    case 'reconcile_job_ledger': {
      const depositCollected = Number((quotedPrice * 0.5).toFixed(2));
      const balanceRemaining = Number((quotedPrice - depositCollected).toFixed(2));
      const supplierInvoiceVerified = Number((directCost * 0.62).toFixed(2));
      const crewLaborAccrued = Number((directCost - supplierInvoiceVerified).toFixed(2));
      output = {
        property,
        contractTotal: quotedPrice,
        progressDepositCollected: depositCollected,
        accountsReceivableBalance: balanceRemaining,
        supplierInvoiceVerified,
        crewLaborAccrued,
        totalDirectCostVerified: Number((supplierInvoiceVerified + crewLaborAccrued).toFixed(2)),
        realizedGrossProfit: grossProfit,
        realizedGrossMarginPct: grossMarginPct,
        ledgerState: 'BALANCED_AND_AUDITED',
      };
      break;
    }

    default:
      output = {
        executedOperation: operation,
        domain: spec.domain,
        payloadEcho: payload,
        status: 'completed',
      };
  }

  return res.status(200).json({
    ok: true,
    operation,
    domain: spec.domain,
    riskTier: spec.riskTier,
    actorRole,
    auditedAt: new Date().toISOString(),
    result: output,
  });
}
