// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — MASTER APPLICATION ORCHESTRATOR
// Screen Switching, Topbar Controllers, Customer Dual Display & Lifecycle
// =========================================================================

import { store } from './state.js?v=3.0';
import { modeEngine, MODES_CONFIG } from './modes.js?v=3.0';
import { posController } from './pos.js?v=3.0';
import { inventoryManager } from './inventory.js?v=3.0';
import { multiVendorEngine } from './multivendor.js?v=3.0';
import { accountingManager } from './accounting.js?v=3.0';
import { analyticsManager } from './analytics.js?v=3.0';
import { adminManager } from './admin.js?v=3.0';

class App {
  constructor() {
    this.currentScreen = 'screen-pos';
  }

  init() {
    console.log("Initializing Universal Multi-Tenant Cloud POS & ERP...");

    // Initialize all modular controllers safely
    try { posController.init(); } catch (e) { console.error("posController init error:", e); }
    try { inventoryManager.init(); } catch (e) { console.error("inventoryManager init error:", e); }
    try { multiVendorEngine.init(); } catch (e) { console.error("multiVendorEngine init error:", e); }
    try { accountingManager.init(); } catch (e) { console.error("accountingManager init error:", e); }
    try { analyticsManager.init(); } catch (e) { console.error("analyticsManager init error:", e); }
    try { adminManager.init(); } catch (e) { console.error("adminManager init error:", e); }

    // Setup global topbar controls
    this.initTopbarControls();

    // Setup navigation links
    this.initNavigation();

    // Subscribe to state changes for topbar updates
    store.subscribe(() => this.updateTopbarState());
    this.updateTopbarState();

    // Apply saved or default light theme
    const savedTheme = localStorage.getItem('pos_app_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.textContent = savedTheme === 'light' ? '☀️ Light' : '🌙 Dark';
    }

    // Default screen
    this.showScreen('screen-pos');
  }

  initTopbarControls() {
    // 1. Business Mode Selector
    const modeSelect = document.getElementById('topbar-mode-select');
    if (modeSelect) {
      modeSelect.innerHTML = Object.values(MODES_CONFIG).map(m => `
        <option value="${m.id}" ${store.state.currentMode === m.id ? 'selected' : ''}>
          ${m.icon} ${m.label}
        </option>
      `).join('');

      modeSelect.addEventListener('change', (e) => {
        store.setBusinessMode(e.target.value);
      });
    }

    // 2. User Role Switcher (4-Tier RBAC)
    const roleSelect = document.getElementById('topbar-role-select');
    if (roleSelect) {
      roleSelect.value = store.state.currentRole;
      roleSelect.addEventListener('change', (e) => {
        store.setUserRole(e.target.value);
        this.applyRolePermissions(e.target.value);
      });
    }

    // 3. Branch Selector
    const branchSelect = document.getElementById('topbar-branch-select');
    if (branchSelect) {
      branchSelect.innerHTML = store.state.allBranches.map(b => `
        <option value="${b.id}" ${store.state.currentBranch.id === b.id ? 'selected' : ''}>
          📍 ${b.name} (${b.branch_code})
        </option>
      `).join('');

      branchSelect.addEventListener('change', (e) => {
        store.setBranch(e.target.value);
      });
    }

    // 4. Online / Offline Status Pill Toggle
    const statusPill = document.getElementById('topbar-status-pill');
    if (statusPill) {
      statusPill.addEventListener('click', () => {
        store.toggleOnlineSimulation();
      });
    }
  }

  updateTopbarState() {
    // Update Online / Offline indicator
    const pill = document.getElementById('topbar-status-pill');
    const text = document.getElementById('topbar-status-text');
    if (pill && text) {
      if (store.state.isOnline) {
        pill.className = 'status-pill';
        text.textContent = 'Cloud Online (Supabase)';
      } else {
        pill.className = 'status-pill offline';
        const pendingCount = store.state.syncOutbox.length;
        text.textContent = `Offline Mode (${pendingCount} queued)`;
      }
    }

    // Update Mode indicator banner if present
    const bannerContainer = document.getElementById('pos-mode-banner-container');
    if (bannerContainer) {
      bannerContainer.innerHTML = modeEngine.getModeBannerHTML(store.state.currentMode);
    }
  }

  applyRolePermissions(role) {
    // Adjust sidebar link visibility according to 4-tier hierarchy (Section 04)
    const cashierOnly = role === 'cashier';
    const vendorOnly = role === 'vendor';

    const adminLink = document.querySelector('[data-screen="screen-admin"]');
    const analyticsLink = document.querySelector('[data-screen="screen-analytics"]');

    if (adminLink) adminLink.style.display = (role === 'super_admin' || role === 'tenant_owner') ? 'flex' : 'none';
    if (analyticsLink) analyticsLink.style.display = (cashierOnly || vendorOnly) ? 'none' : 'flex';
  }

  initNavigation() {
    const links = document.querySelectorAll('.nav-link[data-screen]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetScreen = link.getAttribute('data-screen');
        this.showScreen(targetScreen);
      });
    });
  }

  showScreen(screenId) {
    this.currentScreen = screenId;

    // Toggle panels
    document.querySelectorAll('.screen-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const activePanel = document.getElementById(screenId);
    if (activePanel) activePanel.classList.add('active');

    // Toggle active link
    document.querySelectorAll('.nav-link[data-screen]').forEach(link => {
      if (link.getAttribute('data-screen') === screenId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Refresh components
    if (screenId === 'screen-pos') posController.render();
    if (screenId === 'screen-inventory') inventoryManager.render();
    if (screenId === 'screen-multivendor') multiVendorEngine.render();
    if (screenId === 'screen-accounting') accountingManager.render();
    if (screenId === 'screen-analytics') analyticsManager.render();
    if (screenId === 'screen-admin') adminManager.render();
  }

  // Open Customer-Facing Pole Display Modal
  openCustomerPoleDisplay() {
    const modal = document.getElementById('pole-display-modal');
    const cart = store.getActiveCart();
    const calcs = store.getCartCalculations();

    const lineTop = document.getElementById('pole-line-top');
    const lineSub = document.getElementById('pole-line-sub');

    if (cart && cart.items.length > 0) {
      const lastItem = cart.items[cart.items.length - 1];
      if (lineTop) lineTop.innerHTML = `<span>${lastItem.name}</span><span>Rs. ${(lastItem.unitPrice * lastItem.qty).toFixed(2)}</span>`;
      if (lineSub) lineSub.innerHTML = `<span>TOTAL DUE:</span><span>Rs. ${calcs.grandTotal.toFixed(2)}</span>`;
    } else {
      if (lineTop) lineTop.innerHTML = `<span>WELCOME TO ${store.state.tenant.name}</span><span></span>`;
      if (lineSub) lineSub.innerHTML = `<span>Scan items to begin</span><span>READY</span>`;
    }

    if (modal) modal.classList.add('active');
  }

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('pos_app_theme', newTheme);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.textContent = newTheme === 'light' ? '☀️ Light' : '🌙 Dark';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
}

export const app = new App();
window.app = app;

// Launch immediately if DOM is already ready, or wait for event
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}
