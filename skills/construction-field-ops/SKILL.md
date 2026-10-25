---
name: construction-field-ops
primary_domain: Construction
secondary_domains: ['HR', 'Finance']
risk_tier: medium
pack_tier: enterprise
---

# construction-field-ops (Construction Pillar — True North Field OS)

## Taxonomy
- **primary_domain:** Construction
- **secondary_domains:** HR, Finance
- **capabilities:** triage_storm_leads, log_ai_roof_inspection, dispatch_production_job
- **mechanisms:** REST gateway `/api/agento`, RBAC role gate, activity audit log
- **verticals:** Roofing & Restoration, Construction Field Ops
- **standards:** RBAC-3-Tier, 35% Gross Margin Guardrail
- **tags:** powerhouse, time-machine, craftsman, construction
- **pack_tier:** enterprise

## Stats
- **Hours saved:** 30–40 hrs/week
- **Prospecting records:** 17,232 properties
- **Target gross margin:** 35% floor

## Operations
- **triage_storm_leads:** Query and prioritize 17,177 geocoded Ohio properties by NOAA hail/wind swath overlap, roof age, and disposition stage.
- **log_ai_roof_inspection:** Analyze roof inspection imagery for wind/hail/missing tabs and log a structured IKO shingle recommendation.
- **dispatch_production_job:** Promote a signed roof replacement estimate into an active production work order with material takeoff.

## Call flow
1. Validate caller role via `X-Agento-Role` header against operation `requiredRole`.
2. Execute `triage_storm_leads` -> `log_ai_roof_inspection` -> `dispatch_production_job` in sequence.
3. Record structured audit entry and return deterministic JSON payload.

## Audit
- **RBAC Role Gate:** Enforces `setter` / `rep` / `admin` permissions with HTTP 403 on violation.
- **Risk Tier:** `low` to `medium` (no external autonomous funds movement).

## Use case
- **title:** Construction Automation in True North Field OS
- **1. Trigger |** Field rep or manager invokes `triage_storm_leads` from the route map or Agento workflow.
- **2. Verification |** Gateway validates role and guardrails (`log_ai_roof_inspection`).
- **3. Completion |** State updates across construction, HR, and finance ledgers (`dispatch_production_job`).
