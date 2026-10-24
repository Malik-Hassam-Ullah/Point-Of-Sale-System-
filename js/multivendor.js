// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — MALL & MULTI-VENDOR COMMISSION ENGINE
// Consignment Splits, Vendor Self-Service Portal, Royalty Engine & Payouts
// =========================================================================

import { store } from './state.js';

class MultiVendorEngine {
  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  render() {
    this.renderVendorCards();
    this.renderPayoutTable();
    this.renderRoyaltyCalculations();
  }

  // 1. Render Registered Consignment Vendors & Balances
  renderVendorCards() {
    const container = document.getElementById('vendors-grid-container');
    if (!container) return;

    container.innerHTML = store.state.vendors.map(v => `
      <div class="stat-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700; font-size:1.05rem; color:var(--text-primary);">${v.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${v.booth_no || 'Central Booth'} | Type: ${v.type}</div>
          </div>
          <span style="font-size:0.75rem; background:rgba(139,92,246,0.15); color:var(--accent-purple); padding:2px 8px; border-radius:4px; font-weight:bold;">
            ${v.commission_pct}% Comm.
          </span>
        </div>
        <div style="margin-top:0.75rem;">
          <div class="stat-label">Payable Wallet Balance</div>
          <div class="stat-val" style="color:var(--accent-success); font-size:1.4rem;">
            Rs. ${v.wallet_balance.toFixed(2)}
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="window.multiVendorEngine.viewVendorPortal('${v.id}')">📊 Vendor Portal</button>
          <button class="btn btn-primary btn-sm" onclick="window.multiVendorEngine.recordVendorPayout('${v.id}')">💸 Payout</button>
        </div>
      </div>
    `).join('');
  }

  // 2. Dedicated Vendor Self-Service Portal View
  viewVendorPortal(vendorId) {
    const vendor = store.state.vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    const modal = document.getElementById('vendor-portal-modal');
    if (!modal) return;

    document.getElementById('vendor-portal-name').textContent = `${vendor.name} - Self-Service Portal`;
    document.getElementById('vendor-portal-balance').textContent = `Rs. ${vendor.wallet_balance.toFixed(2)}`;
    document.getElementById('vendor-portal-commission').textContent = `${vendor.commission_pct}%`;
    document.getElementById('vendor-portal-phone').textContent = vendor.phone;

    // Filter items owned by this vendor
    const items = store.state.products.filter(p => p.vendor_id === vendorId);
    const tbody = document.getElementById('vendor-portal-items-body');
    if (tbody) {
      tbody.innerHTML = items.map(it => `
        <tr>
          <td><strong>${it.name}</strong></td>
          <td>${it.barcode}</td>
          <td>Rs. ${it.retail_price.toFixed(2)}</td>
          <td>${it.commission_pct}% (Rs. ${(it.retail_price * (it.commission_pct/100)).toFixed(2)})</td>
          <td><strong>Rs. ${(it.retail_price * (1 - it.commission_pct/100)).toFixed(2)}</strong></td>
          <td>${it.stock} units</td>
        </tr>
      `).join('');
    }

    modal.classList.add('active');
  }

  // 3. Automated Payout Sheet Generator (Fortnightly Settlement Cycle)
  generateFortnightlySettlement() {
    let totalSettled = 0;
    const settlementRows = [];

    store.state.vendors.forEach(v => {
      if (v.wallet_balance > 0) {
        totalSettled += v.wallet_balance;
        settlementRows.push({
          vendorName: v.name,
          phone: v.phone,
          amount: v.wallet_balance
        });
      }
    });

    if (settlementRows.length === 0) {
      alert("No pending vendor balances to settle.");
      return;
    }

    const confirmMsg = `Generate Fortnightly Settlement Sheet for ${settlementRows.length} vendors totaling Rs. ${totalSettled.toFixed(2)}?`;
    if (confirm(confirmMsg)) {
      const payoutBatchId = `BATCH-${Date.now().toString().slice(-6)}`;
      
      settlementRows.forEach(row => {
        store.state.vendorPayouts.unshift({
          batch_id: payoutBatchId,
          date: new Date().toLocaleDateString(),
          vendor_name: row.vendorName,
          amount: row.amount,
          status: "Processed / Bank Transferred"
        });
      });

      // Reset vendor wallet balances to 0 upon settlement
      store.state.vendors.forEach(v => v.wallet_balance = 0);
      store.save();

      alert(`Settlement Batch ${payoutBatchId} generated! All vendor balances cleared and recorded.`);
    }
  }

  recordVendorPayout(vendorId) {
    const vendor = store.state.vendors.find(v => v.id === vendorId);
    if (!vendor || vendor.wallet_balance <= 0) {
      alert("Vendor has no pending payable balance.");
      return;
    }

    const amt = prompt(`Enter payout amount for ${vendor.name} (Max: Rs. ${vendor.wallet_balance}):`, vendor.wallet_balance);
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) return;

    const payoutAmt = parseFloat(amt);
    if (payoutAmt > vendor.wallet_balance) {
      alert("Payout amount exceeds current payable balance!");
      return;
    }

    vendor.wallet_balance -= payoutAmt;
    store.state.vendorPayouts.unshift({
      batch_id: `PAY-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleDateString(),
      vendor_name: vendor.name,
      amount: payoutAmt,
      status: "Direct Cash / Bank Payout"
    });

    store.save();
    alert(`Payout of Rs. ${payoutAmt} recorded for ${vendor.name}.`);
  }

  renderPayoutTable() {
    const tbody = document.getElementById('vendor-payouts-table-body');
    if (!tbody) return;

    if (store.state.vendorPayouts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No settlement payouts processed yet. Click 'Generate Settlement Sheet' above.</td></tr>`;
      return;
    }

    tbody.innerHTML = store.state.vendorPayouts.map(p => `
      <tr>
        <td><strong>${p.batch_id}</strong></td>
        <td>${p.date}</td>
        <td>${p.vendor_name}</td>
        <td><strong>Rs. ${p.amount.toFixed(2)}</strong></td>
        <td><span style="background:rgba(16,185,129,0.15); color:var(--accent-success); padding:2px 8px; border-radius:4px; font-weight:bold;">${p.status}</span></td>
      </tr>
    `).join('');
  }

  // 4. Franchise Royalty & Marketing Engine (Section 09, Model C)
  renderRoyaltyCalculations() {
    const royaltyRate = store.state.tenant.royalty_pct || 5.0;
    const marketingRate = store.state.tenant.marketing_fee_pct || 2.0;

    let totalBranchSales = 0;
    store.state.invoices.forEach(inv => totalBranchSales += inv.grand_total);

    const royaltyDue = (totalBranchSales * (royaltyRate / 100));
    const marketingDue = (totalBranchSales * (marketingRate / 100));

    const totalSalesEl = document.getElementById('royalty-total-sales');
    const royaltyDueEl = document.getElementById('royalty-due-amount');
    const marketingDueEl = document.getElementById('marketing-due-amount');

    if (totalSalesEl) totalSalesEl.textContent = `Rs. ${totalBranchSales.toFixed(2)}`;
    if (royaltyDueEl) royaltyDueEl.textContent = `Rs. ${royaltyDue.toFixed(2)} (${royaltyRate}%)`;
    if (marketingDueEl) marketingDueEl.textContent = `Rs. ${marketingDue.toFixed(2)} (${marketingRate}%)`;
  }
}

export const multiVendorEngine = new MultiVendorEngine();
window.multiVendorEngine = multiVendorEngine;
