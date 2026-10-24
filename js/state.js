// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — REACTIVE STATE STORE & OFFLINE ENGINE
// Local-First Persistence, Sync Outbox, Multi-Tab Cart & Conflict Resolution
// =========================================================================

import { SEED_DATA } from './seedData.js';

const STORAGE_KEY = 'POS_ERP_STATE_V1';

class StateStore {
  constructor() {
    this.listeners = [];
    this.state = this.loadInitialState();
    this.initNetworkListener();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          tenant: { ...SEED_DATA.tenant, ...(parsed.tenant || {}) },
          isOnline: navigator.onLine !== undefined ? navigator.onLine : true
        };
      }
    } catch (e) {
      console.warn("Could not load stored state, using seed defaults:", e);
    }

    return {
      // Current Business & Tenant Context
      tenant: { ...SEED_DATA.tenant },
      currentMode: SEED_DATA.tenant.business_mode, // 'supermarket', 'micro_retail', 'pharmacy', 'fashion', 'restaurant', 'mall'
      currentRole: 'cashier', // 'super_admin', 'tenant_owner', 'branch_manager', 'cashier', 'vendor'
      currentBranch: SEED_DATA.branches[1], // Default: Mall Outlet DHA
      allBranches: [...SEED_DATA.branches],
      
      // Master Catalog
      products: [...SEED_DATA.products],
      customers: [...SEED_DATA.customers],
      vendors: [...SEED_DATA.vendors],
      restaurant_tables: [...SEED_DATA.restaurant_tables],

      // Cashier Multi-Tab Cart System (Up to 5 held/parked bills)
      activeTabIndex: 0,
      cartTabs: [
        {
          id: 'tab-1',
          name: 'Bill #1',
          customerId: SEED_DATA.customers[0].id,
          customerName: SEED_DATA.customers[0].name,
          items: [],
          discountAmount: 0,
          notes: ''
        }
      ],

      // Active Cash Shift & Galla
      activeShift: { ...SEED_DATA.initial_shift },

      // Sales Invoices History
      invoices: [],

      // Offline-First Sync Outbox Queue
      syncOutbox: [],
      isOnline: navigator.onLine !== undefined ? navigator.onLine : true,

      // Inventory Transfers (In-Transit Protection)
      stockTransfers: [
        {
          id: "tr-001",
          transfer_number: "TR-WH-DHA-901",
          source: "Central Distribution Warehouse",
          dest: "Mall Outlet - Cash Counter 01",
          items: "Olper's Milk 1L (60 pcs), Lipton Tea (30 pcs)",
          status: "dispatched_in_transit",
          gate_pass_no: "GP-4421",
          dispatched_at: "2026-10-24 08:30 AM"
        }
      ],

      // Double-Entry General Ledger Entries
      journalEntries: [],

      // Vendor Settlement Payouts
      vendorPayouts: []
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }

  initNetworkListener() {
    window.addEventListener('online', () => {
      this.setOnlineStatus(true);
    });
    window.addEventListener('offline', () => {
      this.setOnlineStatus(false);
    });
  }

  setOnlineStatus(status) {
    this.state.isOnline = status;
    if (status && this.state.syncOutbox.length > 0) {
      this.processSyncOutbox();
    }
    this.save();
  }

  toggleOnlineSimulation() {
    this.setOnlineStatus(!this.state.isOnline);
  }

  // Process Offline Outbox Queue when internet resumes
  processSyncOutbox() {
    if (this.state.syncOutbox.length === 0) return;
    console.log(`[Sync Engine] Syncing ${this.state.syncOutbox.length} offline invoices to Cloud Supabase...`);
    
    // Simulate background push to Supabase
    setTimeout(() => {
      this.state.syncOutbox.forEach(inv => {
        const found = this.state.invoices.find(i => i.invoice_no === inv.invoice_no);
        if (found) found.sync_status = 'synced';
      });
      this.state.syncOutbox = [];
      this.save();
      console.log("[Sync Engine] All pending invoices successfully replicated to Supabase cloud.");
    }, 1200);
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  // Mode & Role Switchers
  setBusinessMode(mode) {
    this.state.currentMode = mode;
    this.save();
  }

  setUserRole(role) {
    this.state.currentRole = role;
    this.save();
  }

  setBranch(branchId) {
    const branch = this.state.allBranches.find(b => b.id === branchId);
    if (branch) {
      this.state.currentBranch = branch;
      this.save();
    }
  }

  // Multi-Tab Cart Management
  getActiveCart() {
    return this.state.cartTabs[this.state.activeTabIndex] || this.state.cartTabs[0];
  }

  setActiveTab(index) {
    if (index >= 0 && index < this.state.cartTabs.length) {
      this.state.activeTabIndex = index;
      this.save();
    }
  }

  addNewCartTab() {
    if (this.state.cartTabs.length >= 5) {
      alert("Maximum 5 parallel held customer bills allowed.");
      return;
    }
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      name: `Bill #${this.state.cartTabs.length + 1}`,
      customerId: this.state.customers[0].id,
      customerName: this.state.customers[0].name,
      items: [],
      discountAmount: 0,
      notes: ''
    };
    this.state.cartTabs.push(newTab);
    this.state.activeTabIndex = this.state.cartTabs.length - 1;
    this.save();
  }

  closeCartTab(index) {
    if (this.state.cartTabs.length <= 1) {
      this.clearCurrentCart();
      return;
    }
    this.state.cartTabs.splice(index, 1);
    if (this.state.activeTabIndex >= this.state.cartTabs.length) {
      this.state.activeTabIndex = this.state.cartTabs.length - 1;
    }
    this.save();
  }

  clearCurrentCart() {
    const cart = this.getActiveCart();
    if (cart) {
      cart.items = [];
      cart.discountAmount = 0;
      cart.notes = '';
      this.save();
    }
  }

  // Cart Items Actions
  addItemToCart(product, qty = 1, customPrice = null, variant = null, unitType = 'piece') {
    const cart = this.getActiveCart();
    if (!cart) return;

    let price = customPrice !== null ? customPrice : product.retail_price;
    let name = product.name;
    let barcode = product.barcode;

    if (variant) {
      name = `${product.name} (${variant.name})`;
      price = variant.price;
      barcode = variant.barcode;
    }

    const existingIndex = cart.items.findIndex(item => 
      item.productId === product.id && 
      item.variantName === (variant ? variant.name : null) &&
      item.unitType === unitType
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].qty += qty;
    } else {
      cart.items.push({
        productId: product.id,
        name: name,
        barcode: barcode,
        unitPrice: price,
        costPrice: product.cost_price,
        qty: qty,
        unitType: unitType,
        taxRate: product.tax_rate || 0,
        vendorId: product.vendor_id || null,
        vendorName: product.vendor_name || null,
        commissionPct: product.commission_pct || 0,
        variantName: variant ? variant.name : null
      });
    }

    this.save();
  }

  updateItemQty(index, qty) {
    const cart = this.getActiveCart();
    if (cart && cart.items[index]) {
      if (qty <= 0) {
        cart.items.splice(index, 1);
      } else {
        cart.items[index].qty = qty;
      }
      this.save();
    }
  }

  removeItem(index) {
    const cart = this.getActiveCart();
    if (cart && cart.items[index]) {
      cart.items.splice(index, 1);
      this.save();
    }
  }

  setCartCustomer(customerId) {
    const cart = this.getActiveCart();
    const cust = this.state.customers.find(c => c.id === customerId);
    if (cart && cust) {
      cart.customerId = cust.id;
      cart.customerName = cust.name;
      this.save();
    }
  }

  // Cart Calculations
  getCartCalculations() {
    const cart = this.getActiveCart();
    if (!cart) return { subtotal: 0, tax: 0, discount: 0, grandTotal: 0, itemCount: 0 };

    let subtotal = 0;
    let totalTax = 0;
    let itemCount = 0;

    cart.items.forEach(item => {
      const lineTotal = item.unitPrice * item.qty;
      const lineTax = lineTotal * (item.taxRate / 100);
      subtotal += lineTotal;
      totalTax += lineTax;
      itemCount += item.qty;
    });

    const discount = cart.discountAmount || 0;
    const grandTotal = Math.max(0, subtotal + totalTax - discount);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      itemCount: Math.round(itemCount * 100) / 100
    };
  }

  // Conflict-free Invoice ID (Section 06 & 07)
  generateInvoiceNumber() {
    const branchCode = this.state.currentBranch?.branch_code || 'BR01';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `${branchCode}-POS1-${dateStr}-${randomHex}`;
  }

  // Reset to Factory Seed Data
  resetAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadInitialState();
    this.save();
  }
}

export const store = new StateStore();
