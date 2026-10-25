import { activateAdminTab } from '../lib/admin-tabs.js';

/**
 * Mounts the unified "Agento & Finance" tab inside the Management Dashboard (/admin)
 * so admins and managers can run Good/Better/Best 35%-margin roof proposals,
 * 1099 rep & setter commission payouts, and live Agento HR + Construction + Finance skills
 * without leaving the CRM.
 */
export function mountAgentoAdmin(sb, me) {
  if (!me || document.getElementById('tab-agento')) return;
  const rail = document.querySelector('#app .rail');
  const main = document.querySelector('#app .dashMain');
  if (!rail || !main) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.tab = 'agento';
  button.dataset.tnTabBound = '1';
  button.textContent = 'Agento & Finance';
  rail.append(button);

  const section = document.createElement('section');
  section.id = 'tab-agento';
  section.className = 'hidden';
  section.innerHTML = `
    <div class="dashTitle">
      <div>
        <div class="eyebrow">AGENTO UNIFIED OPERATIONS · HR + CONSTRUCTION + FINANCE</div>
        <h1>Finance, Proposals &amp; Agento Hub</h1>
        <p>Run 35%-margin-guarded Good/Better/Best roof quotes, 1099 commission payouts, and unified Agento skills across all 17,177 mapped properties.</p>
      </div>
      <div class="inlineActions">
        <a class="btn primary" href="/agento.html">Open Full Agento Command Center</a>
      </div>
    </div>

    <div class="grid grid4" style="margin-bottom:20px">
      <div class="card pad">
        <div class="small">Measured Team Time Saved</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px">30–40 hrs/wk</div>
        <div class="small" style="margin-top:4px">Across 5-person field &amp; leadership crew</div>
      </div>
      <div class="card pad">
        <div class="small">Mapped Knox &amp; Ohio Properties</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px">17,177</div>
        <div class="small" style="margin-top:4px">17,232 total prospecting records</div>
      </div>
      <div class="card pad">
        <div class="small">Enforced Gross Margin Floor</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px" id="agAdminMarginKpi">35.0%</div>
        <div class="small" style="margin-top:4px">Hard 30% minimum floor guardrail</div>
      </div>
      <div class="card pad">
        <div class="small">Projected 1099 Rep Commission</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px" id="agAdminCommKpi">$461.68</div>
        <div class="small" style="margin-top:4px">10% of verified gross profit + $150 setter</div>
      </div>
    </div>

    <div class="grid grid2" style="gap:20px;align-items:start">
      <div class="card pad">
        <h2>Instant Roof Proposal &amp; 1099 Commission Calculator</h2>
        <p class="small">Computes Good / Better / Best IKO shingle systems with automatic waste factor, 35% target gross margin enforcement, and 1099 rep/setter payout split.</p>
        <form id="agAdminQuoteForm" style="display:grid;gap:12px;margin-top:14px">
          <div class="field">
            <label for="agPropAddress">Property Address</label>
            <input id="agPropAddress" type="text" value="513 South McKenzie St, Mount Vernon, OH 43050" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div class="field">
              <label for="agRoofArea">Roof Area (sq ft)</label>
              <input id="agRoofArea" type="number" value="2500" min="600" max="25000" step="50" required>
            </div>
            <div class="field">
              <label for="agWastePct">Waste %</label>
              <input id="agWastePct" type="number" value="12" min="5" max="30" required>
            </div>
            <div class="field">
              <label for="agTargetMargin">Target Margin %</label>
              <input id="agTargetMargin" type="number" value="35" min="20" max="65" required>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
            <button type="submit" class="btn primary">Calculate Good / Better / Best Quote</button>
            <button type="button" class="btn" id="agRunFullCycle">⚡ Run Full HR → Construction → Finance Agento Flow</button>
          </div>
        </form>
        <div id="agQuoteTiers" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px"></div>
      </div>

      <div class="card pad">
        <h2>Live Agento Gateway Trace (<code>/api/agento</code>)</h2>
        <p class="small">Every action below executes against the governed Agento endpoint and records an RBAC-verified audit trail.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
          <button type="button" class="btn" data-ag-op="onboard_1099_rep">HR: Onboard 1099 Rep</button>
          <button type="button" class="btn" data-ag-op="audit_rep_shift_compliance">HR: Shift GPS Audit</button>
          <button type="button" class="btn" data-ag-op="triage_storm_leads">Construction: Storm Triage</button>
          <button type="button" class="btn" data-ag-op="log_ai_roof_inspection">Construction: AI VLM Roof Scan</button>
          <button type="button" class="btn" data-ag-op="compute_rep_commissions_and_pnl">Finance: P&amp;L &amp; Commissions</button>
        </div>
        <pre id="agAdminTrace" style="background:#0c1424;color:#e2e8f0;padding:14px;border-radius:10px;font-size:12px;max-height:300px;overflow:auto;margin:0">Ready. Click any operation or calculate a quote to inspect the live Agento JSON payload.</pre>
      </div>
    </div>
  `;
  main.append(section);

  const tiersEl = section.querySelector('#agQuoteTiers');
  const traceEl = section.querySelector('#agAdminTrace');

  function renderTierCards(area, wastePct, requestedMargin) {
    const marginPct = Math.max(Number(requestedMargin || 35), 30);
    const squares = Number(((area * (1 + wastePct / 100)) / 100).toFixed(2));
    const tiers = [
      { tier: 'Good · Architectural', product: 'IKO Cambridge', ratePerSq: 265 },
      { tier: 'Better · Impact Class 3', product: 'IKO Dynasty (Recommended)', ratePerSq: 283 },
      { tier: 'Best · Impact Class 4', product: 'IKO Nordic Performance', ratePerSq: 318 },
    ];
    tiersEl.innerHTML = tiers
      .map((t) => {
        const directCost = Number((squares * t.ratePerSq + 650).toFixed(2));
        const price = Number((directCost / (1 - marginPct / 100)).toFixed(2));
        const grossProfit = Number((price - directCost).toFixed(2));
        const repComm = Number((grossProfit * 0.1).toFixed(2));
        return `<div class="card pad" style="border:1px solid rgba(30,107,255,0.28)">
          <div class="small" style="font-weight:700">${t.tier}</div>
          <div style="font-size:13px;margin:2px 0 6px">${t.product}</div>
          <div style="font-size:20px;font-weight:800">$${Math.round(price).toLocaleString()}</div>
          <div class="small" style="margin-top:6px">${squares} sq · GP: $${Math.round(grossProfit).toLocaleString()} (${marginPct}%)</div>
          <div class="small">1099 Rep Comm: <strong>$${repComm.toLocaleString()}</strong></div>
        </div>`;
      })
      .join('');
  }

  async function callAgento(operation) {
    const area = Number(section.querySelector('#agRoofArea').value || 2500);
    const wastePct = Number(section.querySelector('#agWastePct').value || 12);
    const targetMarginPct = Number(section.querySelector('#agTargetMargin').value || 35);
    const property = section.querySelector('#agPropAddress').value;
    renderTierCards(area, wastePct, targetMarginPct);

    try {
      const res = await fetch('/api/agento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          actorRole: me.role === 'admin' ? 'admin' : 'rep',
          payload: { property, area, wastePct, targetMarginPct, name: me.name || 'Travis Mackie' },
        }),
      });
      const data = await res.json();
      if (data?.result?.grossMarginPct) {
        section.querySelector('#agAdminMarginKpi').textContent = `${data.result.grossMarginPct}%`;
      }
      if (data?.result?.projected1099Commission) {
        section.querySelector('#agAdminCommKpi').textContent = `$${Number(data.result.projected1099Commission).toLocaleString()}`;
      }
      traceEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      traceEl.textContent = `Error: ${err.message}`;
    }
  }

  renderTierCards(2500, 12, 35);

  button.onclick = () => {
    activateAdminTab(document, 'agento');
  };

  section.querySelector('#agAdminQuoteForm').onsubmit = (e) => {
    e.preventDefault();
    callAgento('generate_margin_guarded_estimate');
  };

  section.querySelectorAll('[data-ag-op]').forEach((btn) => {
    btn.onclick = () => callAgento(btn.dataset.agOp);
  });

  section.querySelector('#agRunFullCycle').onclick = async () => {
    await callAgento('onboard_1099_rep');
    await callAgento('triage_storm_leads');
    await callAgento('log_ai_roof_inspection');
    await callAgento('generate_margin_guarded_estimate');
  };
}
