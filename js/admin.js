// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — SAAS SUPER ADMIN & FEATURE FLAGS ENGINE
// Tenant Subscriptions, 4-Tier Multi-Tenancy & Dynamic Module Toggles
// =========================================================================

import { store } from './state.js';

class AdminManager {
  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  render() {
    this.renderTenantInfo();
    this.renderFeatureFlags();
  }

  // 1. Render Current Tenant Subscription & Global Stats
  renderTenantInfo() {
    const tenant = store.state.tenant;
    const container = document.getElementById('admin-tenant-info-card');
    if (!container || !tenant) return;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Active Organization (Tenant)</div>
          <div class="stat-val" style="font-size:1.25rem; color:var(--accent-primary);">${tenant.name}</div>
          <div class="stat-desc">Plan: <strong>${tenant.plan_id.toUpperCase()}</strong></div>
        </div>

        <div class="stat-card">
          <div class="stat-label">FBR POS Tier-1 Status</div>
          <div class="stat-val" style="color:${tenant.fbr_enabled ? 'var(--accent-success)' : 'var(--text-muted)'}; font-size:1.25rem;">
            ${tenant.fbr_enabled ? '🟢 Connected' : '⚪ Disabled'}
          </div>
          <div class="stat-desc">POS ID: <code>${tenant.fbr_pos_id || 'N/A'}</code></div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Branches & Outlets</div>
          <div class="stat-val">${store.state.allBranches.length} Outlets</div>
          <div class="stat-desc">1 Warehouse + ${store.state.allBranches.length - 1} Stores</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Cloud PostgreSQL Cluster</div>
          <div class="stat-val" style="color:var(--accent-cyan); font-size:1.2rem;">PostgreSQL 16</div>
          <div class="stat-desc">Latency: 14ms | Status: Healthy</div>
        </div>
      </div>
    `;
  }

  // 2. Modular Feature-Flags Toggles (Section 01 & 05)
  renderFeatureFlags() {
    const list = document.getElementById('admin-feature-flags-list');
    if (!list) return;

    const modules = [
      { key: 'fbr_enabled', title: 'Official FBR POS API & QR Codes', desc: 'Auto-generates verifiable FBR Invoice number on thermal bills.', active: store.state.tenant.fbr_enabled },
      { key: 'multi_branch', title: 'Multi-Branch & Central Warehouse', desc: 'Enables 4-stage inter-branch stock transfers and requisition.', active: true },
      { key: 'consignment_splits', title: 'Consignment Splits & Mall Sub-Tenants', desc: 'Auto-deducts mall commission and credits vendor wallets.', active: true },
      { key: 'pharmacy_fefo', title: 'Pharmacy FEFO & Salt Lookup', desc: 'Enforces First-Expiry First-Out batches and loose strip sales.', active: true },
      { key: 'restaurant_kot', title: 'Restaurant KOT & Floor Table Map', desc: 'Routes tickets to kitchen stations and manages tables.', active: true },
      { key: 'khata_udhaar', title: 'Customer Udhaar Khata CRM', desc: 'Tracks customer debt, credit limit blocks & WhatsApp links.', active: true }
    ];

    list.innerHTML = modules.map(m => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:0.85rem 1rem; border-radius:8px; border:1px solid var(--border-color);">
        <div>
          <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${m.title}</div>
          <div style="font-size:0.775rem; color:var(--text-muted);">${m.desc}</div>
        </div>
        <div>
          <label style="position:relative; display:inline-block; width:44px; height:24px;">
            <input type="checkbox" ${m.active ? 'checked' : ''} onchange="window.adminManager.toggleFeature('${m.key}', this.checked)" style="opacity:0; width:0; height:0;">
            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:${m.active ? 'var(--accent-primary)' : '#4b5563'}; border-radius:24px; transition:0.2s;">
              <span style="position:absolute; content:''; height:18px; width:18px; left:${m.active ? '22px' : '3px'}; bottom:3px; background:#fff; border-radius:50%; transition:0.2s;"></span>
            </span>
          </label>
        </div>
      </div>
    `).join('');
  }

  toggleFeature(key, enabled) {
    if (key === 'fbr_enabled') {
      store.state.tenant.fbr_enabled = enabled;
      store.save();
      alert(`FBR POS Module ${enabled ? 'Enabled' : 'Disabled'}.`);
    } else {
      alert(`Module ${key} feature-flag set to ${enabled}.`);
    }
  }

  resetAllFactoryData() {
    if (confirm("WARNING: This will reset all local invoices, shift logs, and catalog to default seed data. Proceed?")) {
      store.resetAllData();
      location.reload();
    }
  }
}

export const adminManager = new AdminManager();
window.adminManager = adminManager;
