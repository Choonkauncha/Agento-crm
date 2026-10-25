---
name: true-north-field-os
title: True North Field OS — Unified HR, Construction & Finance Suite
version: 2.0.0-agento
risk_tier: medium
primary_domain: Construction
secondary_domains:
  - HR
  - Finance
capabilities:
  - storm-lead-triage
  - vlm-roof-inspection
  - 1099-rep-onboarding
  - gps-shift-compliance
  - margin-guarded-estimating
  - commission-and-pnl-reconciliation
mechanisms:
  - rest-api-gateway
  - rbac-role-gate
  - margin-floor-guardrail
  - audit-log-ledger
verticals:
  - roofing-and-restoration
  - residential-construction
  - field-sales-operations
standards:
  - RBAC-3-Tier
  - Gross-Margin-Floor-35pct
  - 1099-Contractor-Compliance
tags:
  - powerhouse
  - time-machine
  - craftsman
  - construction
  - hr
  - finance
  - roofing
pack_tier: enterprise
---

# True North Field OS — Agento Unified Suite

Autonomous field operations platform built for **True North Restorations** (Mount Vernon, OH), uniting **HR**, **Construction**, and **Finance** workflows in one role-gated system.

## Taxonomy
- **primary_domain:** Construction
- **secondary_domains:** HR, Finance
- **capabilities:** Storm-lead triage across 17,232 properties, AI roof damage inspection, 1099 rep onboarding & GPS shift compliance, margin-guarded roof estimating, and automated commission & P&L reconciliation
- **mechanisms:** Unified `/api/agento` gateway, 3-tier RBAC (`setter`, `rep`, `admin`), 35% gross-margin floor enforcement, immutable `activity_logs` audit trail
- **verticals:** Roofing & Storm Restoration, Residential Construction, Field Sales
- **standards:** RBAC-3-Tier, 35% Gross Margin Guardrail, 1099 Shift Verification
- **tags:** powerhouse, time-machine, craftsman, construction, hr, finance
- **pack_tier:** enterprise (`medium` risk — instant activation without manual money-movement lock)

## Stats
- **Hours saved:** 30–40 hrs/week across a 5-person field & leadership crew
- **Prospecting records:** 17,232 total homeowners (17,177 geocoded on route map)
- **Target gross margin:** 35% enforced minimum floor (30% hard floor)
- **Active domains:** 3 unified (HR + Construction + Finance, 9 operations)

## Operations
- **onboard_1099_rep:** Provision a 1099 Sales Rep or Appointment Setter with role-gated portal credentials, territory bounds, and GroupMe routing.
- **audit_rep_shift_compliance:** Verify GPS shift breadcrumbs, door-knock visit cadence, and SPEAX AI coaching completion across the 5-person field team.
- **assign_canvass_shift:** Dispatch a multi-stop Knox County / Mount Vernon storm canvass route to an active field rep or setter.
- **triage_storm_leads:** Query and prioritize 17,177 geocoded Ohio properties by NOAA hail/wind swath overlap, roof age, and disposition stage.
- **log_ai_roof_inspection:** Analyze roof inspection imagery for wind/hail/missing tabs and log a structured IKO shingle recommendation.
- **dispatch_production_job:** Promote a signed roof replacement estimate into an active production work order with material takeoff.
- **generate_margin_guarded_estimate:** Compute a roof replacement quote from aerial square footage, pitch, and waste factor while enforcing a 35% gross margin guardrail.
- **compute_rep_commissions_and_pnl:** Calculate contract gross profit, cash collected, receivables, and 1099 sales commission payouts across active jobs.
- **reconcile_job_ledger:** Apply homeowner progress payments and supplier invoice costs to a job ledger and recompute net margin.

## Call flow
1. Authenticate caller and resolve `X-Agento-Role` (`setter`, `rep`, or `admin`) against the operation's `requiredRole` rank.
2. Triage storm-impacted properties (`triage_storm_leads`) and dispatch an optimized multi-stop canvass route (`assign_canvass_shift`).
3. Verify 1099 rep clock-in, GPS house-visit breadcrumbs, and AI voice-coach readiness (`audit_rep_shift_compliance`).
4. Capture roof damage imagery on site and log structured IKO shingle recommendations (`log_ai_roof_inspection`).
5. Generate a margin-guarded replacement estimate (`generate_margin_guarded_estimate`) enforcing the 35% gross margin guardrail.
6. Promote the signed contract to production (`dispatch_production_job`) and reconcile job P&L and 1099 commission splits (`compute_rep_commissions_and_pnl`, `reconcile_job_ledger`).

## Audit
- **RBAC Role Gate:** Every operation enforces minimum role rank (`setter: 1`, `rep: 2`, `admin: 3`) and rejects unauthorized calls with HTTP 403 `RBAC_ROLE_GATE`.
- **Margin Floor Guardrail:** `generate_margin_guarded_estimate` clamps gross margin to a minimum 30–35% floor before returning a quote or commission projection.
- **PII & Data Minimization:** Homeowner contact records stay scoped to authenticated territory sessions; audit responses log timestamps, actor role, and operation metadata without leaking raw credentials.
- **Risk Tier Classification:** All operations are scoped to `low` or `medium` risk (calculations, scheduling, and ledger reconciliation without autonomous external funds transfer).

## Use case
- **title:** Storm-to-Close Autonomous Field Loop (Mount Vernon, OH)
- **1. Storm Triage & Route Dispatch |** Filter 17,177 Knox County properties after a hail event and assign a 25-door route to an active setter/rep in under 30 seconds.
- **2. GPS Shift & Knock Compliance |** Track rep clock-in and verify property dwell times automatically instead of manual end-of-week timesheet checks.
- **3. Instant Margin-Guarded Quote |** Convert a 2,400 sq ft aerial roof trace (26.88 squares with 12% waste) into an IKO Dynasty quote with guaranteed 35% gross margin.
- **4. Commission & Ledger Closeout |** Reconcile supplier invoices against homeowner payments and calculate exact 10% gross-profit 1099 rep commissions automatically.
