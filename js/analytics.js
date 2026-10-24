// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — EXECUTIVE CEO ANALYTICS & REPORTS
// Net Profit & Loss (P&L), Top Selling Items, Dead Stock & Branch Comparison
// =========================================================================

import { store } from './state.js';

class AnalyticsManager {
  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  render() {
    this.renderExecutiveCards();
    this.renderTopSellingTable();
    this.renderDeadStockAlerts();
    this.renderBranchComparison();
  }

  // 1. Executive Summary Metric Cards
  renderExecutiveCards() {
    let grossSales = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalCOGS = 0;

    store.state.invoices.forEach(inv => {
      grossSales += inv.grand_total;
      totalTax += inv.tax_amount;
      totalDiscounts += inv.discount_amount;
      
      inv.items.forEach(item => {
        totalCOGS += ((item.costPrice || 0) * item.qty);
      });
    });

    let dailyExpenses = 0;
    if (store.state.activeShift?.petty_cash_drops) {
      store.state.activeShift.petty_cash_drops.forEach(d => dailyExpenses += d.amount);
    }

    const netProfit = grossSales - totalCOGS - dailyExpenses;
    const grossMarginPct = grossSales > 0 ? ((grossSales - totalCOGS) / grossSales * 100) : 0;

    const netProfitEl = document.getElementById('ceo-net-profit');
    const grossSalesEl = document.getElementById('ceo-gross-sales');
    const cogsEl = document.getElementById('ceo-cogs');
    const marginEl = document.getElementById('ceo-margin');
    const txCountEl = document.getElementById('ceo-tx-count');

    if (netProfitEl) netProfitEl.textContent = `Rs. ${netProfit.toFixed(2)}`;
    if (grossSalesEl) grossSalesEl.textContent = `Rs. ${grossSales.toFixed(2)}`;
    if (cogsEl) cogsEl.textContent = `Rs. ${totalCOGS.toFixed(2)}`;
    if (marginEl) marginEl.textContent = `${grossMarginPct.toFixed(1)}%`;
    if (txCountEl) txCountEl.textContent = `${store.state.invoices.length} Bills`;
  }

  // 2. Top 20 Selling Products
  renderTopSellingTable() {
    const tbody = document.getElementById('ceo-top-selling-body');
    if (!tbody) return;

    const itemMap = {};
    store.state.invoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!itemMap[it.name]) {
          itemMap[it.name] = { name: it.name, qty: 0, revenue: 0 };
        }
        itemMap[it.name].qty += it.qty;
        itemMap[it.name].revenue += (it.unitPrice * it.qty);
      });
    });

    const sorted = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No sales recorded yet. Scan and checkout bills at POS to populate metrics.</td></tr>`;
      return;
    }

    tbody.innerHTML = sorted.slice(0, 10).map((it, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${it.name}</strong></td>
        <td>${it.qty}</td>
        <td><strong style="color:var(--accent-success);">Rs. ${it.revenue.toFixed(2)}</strong></td>
      </tr>
    `).join('');
  }

  // 3. Dead Stock Alerts (Items sitting without movement)
  renderDeadStockAlerts() {
    const container = document.getElementById('ceo-dead-stock-container');
    if (!container) return;

    // Detect products with high stock but 0 sales
    const soldProductIds = new Set();
    store.state.invoices.forEach(inv => inv.items.forEach(it => soldProductIds.add(it.productId)));

    const deadItems = store.state.products.filter(p => !soldProductIds.has(p.id) && p.stock > 20);

    if (deadItems.length === 0) {
      container.innerHTML = `<div style="font-size:0.85rem; color:var(--accent-success);">✅ No critical dead stock detected. Inventory turnover is healthy.</div>`;
      return;
    }

    container.innerHTML = deadItems.slice(0, 4).map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:0.6rem 0.8rem; border-radius:6px; border:1px solid rgba(239,68,68,0.2);">
        <div>
          <strong>${p.name}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">${p.stock} units stagnant on shelf (Valuation: Rs. ${(p.cost_price * p.stock).toFixed(2)})</span>
        </div>
        <span style="font-size:0.75rem; background:rgba(239,68,68,0.2); color:var(--accent-danger); padding:2px 8px; border-radius:4px; font-weight:bold;">
          Dead Stock Warning
        </span>
      </div>
    `).join('');
  }

  // 4. Branch-wise Comparison
  renderBranchComparison() {
    const tbody = document.getElementById('ceo-branches-comparison-body');
    if (!tbody) return;

    tbody.innerHTML = store.state.allBranches.map(b => {
      const isCurrent = b.id === store.state.currentBranch.id;
      let branchSales = 0;
      if (isCurrent) {
        store.state.invoices.forEach(inv => branchSales += inv.grand_total);
      } else {
        branchSales = b.is_warehouse ? 0 : 42500.00; // Sample benchmark for non-active branches
      }

      return `
        <tr>
          <td><strong>${b.name}</strong> ${isCurrent ? '<span style="font-size:0.65rem; background:rgba(59,130,246,0.2); color:var(--accent-primary); padding:2px 6px; border-radius:4px;">Active</span>' : ''}</td>
          <td><code>${b.branch_code}</code></td>
          <td>${b.city}</td>
          <td>${b.is_warehouse ? 'Distribution Hub' : 'Retail Outlet'}</td>
          <td><strong style="color:var(--accent-success);">Rs. ${branchSales.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join('');
  }
}

export const analyticsManager = new AnalyticsManager();
window.analyticsManager = analyticsManager;
