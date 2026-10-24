// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — HIGH-SPEED CASHIER TERMINAL ENGINE
// 100% Keyboard Shortcuts, Barcode Scanning, Multi-Tab Hold & Split Payments
// =========================================================================

import { store } from './state.js';
import { hardware } from './hardware.js';
import { modeEngine } from './modes.js';

class POSController {
  constructor() {
    this.selectedCartIndex = -1;
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.initKeyboardShortcuts();
  }

  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  // Keyboard Shortcuts (Section 10)
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing inside a text input other than fast scanner
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // F1: Focus Search/Scanner
      if (e.key === 'F1') {
        e.preventDefault();
        const input = document.getElementById('pos-barcode-input');
        if (input) input.focus();
        return;
      }

      // F2: Quick Quantity Change
      if (e.key === 'F2') {
        e.preventDefault();
        const cart = store.getActiveCart();
        if (cart && cart.items.length > 0) {
          const newQty = prompt("Enter new quantity for last item:", cart.items[cart.items.length - 1].qty);
          if (newQty && !isNaN(newQty) && parseFloat(newQty) > 0) {
            store.updateItemQty(cart.items.length - 1, parseFloat(newQty));
          }
        }
        return;
      }

      // F4: Hold / Park Bill
      if (e.key === 'F4') {
        e.preventDefault();
        this.holdCurrentBill();
        return;
      }

      // F8: Instant Cash Checkout
      if (e.key === 'F8') {
        e.preventDefault();
        this.executeInstantCashCheckout();
        return;
      }

      // F9: Split Payment
      if (e.key === 'F9') {
        e.preventDefault();
        this.openSplitPaymentModal();
        return;
      }

      // Escape: Cancel / Clear
      if (e.key === 'Escape') {
        const cart = store.getActiveCart();
        if (cart && cart.items.length > 0) {
          if (confirm("Cancel and clear current cart?")) {
            store.clearCurrentCart();
          }
        }
        return;
      }
    });
  }

  // Fast Barcode Scanner & Search Handler
  handleBarcodeInput(barcode) {
    if (!barcode || !barcode.trim()) return;
    const clean = barcode.trim();

    // 1. Check if it's an Electronic Weighing Scale Barcode (Prefix 20/21)
    const scaleData = hardware.parseScaleBarcode(clean);
    if (scaleData) {
      const scaleProduct = store.state.products.find(p => p.barcode === scaleData.lookupBarcode);
      if (scaleProduct) {
        hardware.playBeep();
        store.addItemToCart(scaleProduct, scaleData.weightKg, null, null, 'kg');
        this.clearScannerInput();
        return;
      }
    }

    // 2. Direct Barcode Match in Master Catalog
    const product = store.state.products.find(p => p.barcode === clean);
    if (product) {
      hardware.playBeep();
      store.addItemToCart(product, 1);
      this.clearScannerInput();
      return;
    }

    // 3. Variant Barcode Match (Fashion Matrix)
    for (const p of store.state.products) {
      if (p.has_variants && p.variants) {
        const variant = p.variants.find(v => v.barcode === clean);
        if (variant) {
          hardware.playBeep();
          store.addItemToCart(p, 1, null, variant);
          this.clearScannerInput();
          return;
        }
      }
    }

    // If not exact barcode, set as filter search query
    this.searchQuery = clean.toLowerCase();
    this.renderProducts();
  }

  clearScannerInput() {
    const input = document.getElementById('pos-barcode-input');
    if (input) {
      input.value = '';
      this.searchQuery = '';
      this.renderProducts();
    }
  }

  // Hold / Park Bill (Multi-Tab)
  holdCurrentBill() {
    const cart = store.getActiveCart();
    if (!cart || cart.items.length === 0) {
      alert("Current cart is empty. Add items before holding.");
      return;
    }
    store.addNewCartTab();
  }

  // Instant Cash Checkout (F8)
  executeInstantCashCheckout() {
    const cart = store.getActiveCart();
    if (!cart || cart.items.length === 0) {
      alert("Cart is empty! Add items first.");
      return;
    }

    const calcs = store.getCartCalculations();
    const invoiceNo = store.generateInvoiceNumber();
    
    // Generate FBR Details if enabled
    let fbrData = { fbrInvoiceNumber: null, qrPayload: invoiceNo };
    if (store.state.tenant.fbr_enabled) {
      fbrData = hardware.generateFBRDetails(store.state.tenant, invoiceNo, calcs.grandTotal, calcs.tax);
    }

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoice_no: invoiceNo,
      created_at: new Date().toISOString(),
      cashier_name: store.state.activeShift?.cashier_name || "Cashier 01",
      customer_id: cart.customerId,
      customer_name: cart.customerName,
      items: [...cart.items],
      subtotal: calcs.subtotal,
      discount_amount: calcs.discount,
      tax_amount: calcs.tax,
      grand_total: calcs.grandTotal,
      payment_method: 'CASH',
      split_details: { cash: calcs.grandTotal },
      fbr_invoice_no: fbrData.fbrInvoiceNumber,
      fbr_qr_code: fbrData.qrPayload,
      sync_status: store.state.isOnline ? 'synced' : 'pending'
    };

    // 1. Record Sale Invoice
    store.state.invoices.unshift(newInvoice);

    // 2. Offline Sync Outbox Queue
    if (!store.state.isOnline) {
      store.state.syncOutbox.push(newInvoice);
    }

    // 3. Update Shift Cash Drawer
    if (store.state.activeShift) {
      store.state.activeShift.cash_sales += calcs.grandTotal;
    }

    // 4. Multi-Vendor Commission Splits (Section 09)
    cart.items.forEach(item => {
      if (item.vendorId) {
        const vendor = store.state.vendors.find(v => v.id === item.vendorId);
        if (vendor) {
          const itemTotal = item.unitPrice * item.qty;
          const commAmt = itemTotal * ((item.commissionPct || 10) / 100);
          const vendorNet = itemTotal - commAmt;
          vendor.wallet_balance += vendorNet;
        }
      }
    });

    // 5. Automated Double-Entry Journal Entries (Section 11)
    store.state.journalEntries.unshift({
      id: `je-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      reference: invoiceNo,
      debit_account: "1001 Cash in Drawer",
      debit_amount: calcs.grandTotal,
      credit_account: "4001 Sales Revenue",
      credit_amount: calcs.subtotal,
      tax_credit: calcs.tax
    });

    // Play sounds (cash drawer kick)
    hardware.playDrawerKick();

    // Clear cart and show receipt
    store.clearCurrentCart();
    this.openReceiptModal(newInvoice);
  }

  // Open Split Payment Modal (F9)
  openSplitPaymentModal() {
    const cart = store.getActiveCart();
    if (!cart || cart.items.length === 0) {
      alert("Cart is empty! Add items first.");
      return;
    }

    const calcs = store.getCartCalculations();
    const modal = document.getElementById('split-payment-modal');
    if (!modal) return;

    document.getElementById('split-total-due').textContent = `Rs. ${calcs.grandTotal.toFixed(2)}`;
    document.getElementById('split-cash-input').value = Math.floor(calcs.grandTotal / 2);
    document.getElementById('split-digital-input').value = Math.ceil(calcs.grandTotal / 2);
    
    this.calculateSplitBalance();
    modal.classList.add('active');
  }

  calculateSplitBalance() {
    const calcs = store.getCartCalculations();
    const cash = parseFloat(document.getElementById('split-cash-input')?.value || 0);
    const digital = parseFloat(document.getElementById('split-digital-input')?.value || 0);
    const totalPaid = cash + digital;
    const diff = totalPaid - calcs.grandTotal;

    const diffEl = document.getElementById('split-diff-text');
    if (diffEl) {
      if (diff >= 0) {
        diffEl.innerHTML = `<span style="color:var(--accent-success);">Ready to Pay (Change: Rs. ${diff.toFixed(2)})</span>`;
      } else {
        diffEl.innerHTML = `<span style="color:var(--accent-danger);">Remaining Due: Rs. ${Math.abs(diff).toFixed(2)}</span>`;
      }
    }
  }

  confirmSplitPayment() {
    const calcs = store.getCartCalculations();
    const cart = store.getActiveCart();
    const cash = parseFloat(document.getElementById('split-cash-input')?.value || 0);
    const digital = parseFloat(document.getElementById('split-digital-input')?.value || 0);
    const digitalType = document.getElementById('split-digital-type')?.value || 'Visa/Mastercard';

    if (cash + digital < calcs.grandTotal) {
      alert("Total paid is less than the bill amount!");
      return;
    }

    const invoiceNo = store.generateInvoiceNumber();
    let fbrData = { fbrInvoiceNumber: null, qrPayload: invoiceNo };
    if (store.state.tenant.fbr_enabled) {
      fbrData = hardware.generateFBRDetails(store.state.tenant, invoiceNo, calcs.grandTotal, calcs.tax);
    }

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoice_no: invoiceNo,
      created_at: new Date().toISOString(),
      cashier_name: store.state.activeShift?.cashier_name || "Cashier 01",
      customer_id: cart.customerId,
      customer_name: cart.customerName,
      items: [...cart.items],
      subtotal: calcs.subtotal,
      discount_amount: calcs.discount,
      tax_amount: calcs.tax,
      grand_total: calcs.grandTotal,
      payment_method: `SPLIT (Cash + ${digitalType})`,
      split_details: { cash, digital, digitalType },
      fbr_invoice_no: fbrData.fbrInvoiceNumber,
      fbr_qr_code: fbrData.qrPayload,
      sync_status: store.state.isOnline ? 'synced' : 'pending'
    };

    store.state.invoices.unshift(newInvoice);
    if (!store.state.isOnline) store.state.syncOutbox.push(newInvoice);

    if (store.state.activeShift) {
      store.state.activeShift.cash_sales += cash;
      store.state.activeShift.card_sales += digital;
    }

    hardware.playDrawerKick();
    store.clearCurrentCart();
    
    document.getElementById('split-payment-modal').classList.remove('active');
    this.openReceiptModal(newInvoice);
  }

  // Open Thermal Receipt Modal
  openReceiptModal(invoice) {
    const modal = document.getElementById('receipt-modal');
    const container = document.getElementById('receipt-content-container');
    if (!modal || !container) return;

    container.innerHTML = hardware.buildThermalReceiptHTML(
      invoice,
      store.state.tenant,
      store.state.currentBranch,
      '80mm'
    );

    // Setup WhatsApp Button
    const waBtn = document.getElementById('btn-receipt-whatsapp');
    if (waBtn) {
      const cust = store.state.customers.find(c => c.id === invoice.customer_id);
      const phone = cust ? cust.phone : '03001234567';
      const link = hardware.createWhatsAppLink(phone, invoice, store.state.tenant);
      waBtn.onclick = () => window.open(link, '_blank');
    }

    modal.classList.add('active');
  }

  // Render Full POS UI
  render() {
    this.renderTabs();
    this.renderCustomerBar();
    this.renderAdaptiveQuickBar();
    this.renderCategories();
    this.renderProducts();
    this.renderCartItems();
    this.renderCartSummary();
  }

  renderTabs() {
    const bar = document.getElementById('pos-cart-tabs');
    if (!bar) return;

    bar.innerHTML = store.state.cartTabs.map((tab, idx) => `
      <div class="cart-tab ${idx === store.state.activeTabIndex ? 'active' : ''}" onclick="window.posController.selectTab(${idx})">
        <span>${tab.name} (${tab.items.length})</span>
        ${store.state.cartTabs.length > 1 ? `
          <span class="tab-close" onclick="event.stopPropagation(); window.posController.closeTab(${idx})">×</span>
        ` : ''}
      </div>
    `).join('') + `
      <button class="btn-add-tab" onclick="window.posController.addTab()" title="Park/Hold New Bill (F4)">+ Hold Bill</button>
    `;
  }

  selectTab(index) {
    store.setActiveTab(index);
  }

  addTab() {
    store.addNewCartTab();
  }

  closeTab(index) {
    store.closeCartTab(index);
  }

  renderCustomerBar() {
    const select = document.getElementById('pos-customer-select');
    if (!select) return;

    const cart = store.getActiveCart();
    select.innerHTML = store.state.customers.map(c => `
      <option value="${c.id}" ${cart && cart.customerId === c.id ? 'selected' : ''}>
        ${c.name} ${c.current_balance > 0 ? `(Khata: Rs. ${c.current_balance})` : ''}
      </option>
    `).join('');
  }

  renderCategories() {
    const container = document.getElementById('pos-category-pills');
    if (!container) return;

    const categories = ['all', ...new Set(store.state.products.map(p => p.category))];
    container.innerHTML = categories.map(cat => `
      <button class="category-pill ${this.selectedCategory === cat ? 'active' : ''}" onclick="window.posController.setCategory('${cat}')">
        ${cat === 'all' ? '🌟 All Items' : cat}
      </button>
    `).join('');
  }

  setCategory(cat) {
    this.selectedCategory = cat;
    this.renderProducts();
  }

  renderProducts() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const activeMode = store.state.currentMode;
    let list = modeEngine.filterProductsForMode(store.state.products, activeMode);

    if (this.selectedCategory !== 'all') {
      list = list.filter(p => p.category === this.selectedCategory);
    }

    if (this.searchQuery) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.barcode.includes(this.searchQuery) ||
        (p.generic_name && p.generic_name.toLowerCase().includes(this.searchQuery))
      );
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">
          No items found matching "${this.searchQuery || this.selectedCategory}".
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(prod => {
      // FEFO Expiry Badge for Pharmacy
      let fefoBadge = '';
      if (activeMode === 'pharmacy' && prod.batches && prod.batches.length > 0) {
        const nextBatch = prod.batches[0];
        fefoBadge = `<span class="product-tag" style="background:rgba(245,158,11,0.2); color:var(--accent-warning);">FEFO: ${nextBatch.expiry}</span>`;
      }

      // Consignment Vendor Badge for Mall
      let vendorBadge = '';
      if (prod.vendor_name) {
        vendorBadge = `<span class="product-tag" style="background:rgba(139,92,246,0.2); color:var(--accent-purple);">${prod.vendor_name} (${prod.commission_pct}%)</span>`;
      }

      return `
        <div class="product-card" onclick="window.posController.onProductClick('${prod.id}')">
          <div class="card-top">
            <div class="product-title">${prod.name}</div>
          </div>
          <div>
            ${prod.generic_name ? `<div style="font-size:0.7rem; color:var(--accent-cyan); font-style:italic;">${prod.generic_name}</div>` : ''}
            <div class="product-price">Rs. ${prod.retail_price.toFixed(2)}</div>
            <div class="product-meta">
              <span>Stock: ${prod.stock}</span>
              ${fefoBadge || vendorBadge || `<span class="product-tag">${prod.category}</span>`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  onProductClick(productId) {
    const product = store.state.products.find(p => p.id === productId);
    if (!product) return;

    // If Fashion mode with variants, ask or add default
    if (product.has_variants && product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      hardware.playBeep();
      store.addItemToCart(product, 1, null, variant);
      return;
    }

    hardware.playBeep();
    store.addItemToCart(product, 1);
  }

  renderCartItems() {
    const wrapper = document.getElementById('pos-cart-items');
    if (!wrapper) return;

    const cart = store.getActiveCart();
    if (!cart || cart.items.length === 0) {
      wrapper.innerHTML = `
        <div class="cart-empty">
          <div style="font-size:2.5rem;">🛒</div>
          <div style="font-weight:600; font-size:1rem;">Your Cart is Empty</div>
          <div style="font-size:0.8rem;">Scan a barcode or tap products from the left to start billing.</div>
        </div>
      `;
      return;
    }

    wrapper.innerHTML = cart.items.map((item, idx) => `
      <div class="cart-row">
        <div class="cart-row-info">
          <div class="cart-row-title">${item.name}</div>
          <div class="cart-row-sub">
            <span>Rs. ${item.unitPrice.toFixed(2)} / ${item.unitType}</span>
            ${item.taxRate > 0 ? `<span style="color:var(--text-muted); font-size:0.7rem;">+${item.taxRate}% Tax</span>` : ''}
            ${item.vendorName ? `<span style="color:var(--accent-purple); font-size:0.7rem;">${item.vendorName}</span>` : ''}
          </div>
        </div>
        <div class="cart-qty-control">
          <button class="cart-qty-btn" onclick="window.posController.changeQty(${idx}, -1)">-</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button class="cart-qty-btn" onclick="window.posController.changeQty(${idx}, 1)">+</button>
        </div>
        <div class="cart-row-total">Rs. ${(item.unitPrice * item.qty).toFixed(2)}</div>
        <button class="cart-row-remove" onclick="window.posController.removeItem(${idx})">🗑️</button>
      </div>
    `).join('');
  }

  changeQty(index, delta) {
    const cart = store.getActiveCart();
    if (cart && cart.items[index]) {
      const newQty = cart.items[index].qty + delta;
      store.updateItemQty(index, newQty);
    }
  }

  removeItem(index) {
    store.removeItem(index);
  }

  renderCartSummary() {
    const calcs = store.getCartCalculations();
    const subtotalEl = document.getElementById('summary-subtotal');
    const taxEl = document.getElementById('summary-tax');
    const discountEl = document.getElementById('summary-discount');
    const grandTotalEl = document.getElementById('summary-grand-total');

    if (subtotalEl) subtotalEl.textContent = `Rs. ${calcs.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `Rs. ${calcs.tax.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `Rs. ${calcs.discount.toFixed(2)}`;
    if (grandTotalEl) grandTotalEl.textContent = `Rs. ${calcs.grandTotal.toFixed(2)}`;
  }

  // Adaptive Quick-Bar Render (Section 05)
  renderAdaptiveQuickBar() {
    const bar = document.getElementById('pos-adaptive-quickbar');
    if (!bar) return;

    const mode = store.state.currentMode;

    if (mode === 'micro_retail') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-primary); margin-right:0.25rem;">KHULA SAMAN:</span>
        <button class="quickbar-btn" onclick="window.posController.addLooseItem('p006', 1, '1kg Cheeni')">🍚 Cheeni 1kg (Rs. 150)</button>
        <button class="quickbar-btn" onclick="window.posController.addLooseItem('p007', 1, '1kg Daal')">🍲 Daal Chana 1kg (Rs. 270)</button>
        <button class="quickbar-btn" onclick="window.posController.addLooseItem('p008', 5, '5kg Atta')">🌾 Atta 5kg (Rs. 650)</button>
        <button class="quickbar-btn" onclick="window.posController.addLooseItem('p009', 1, 'Kisan Ghee')">🧈 Ghee 1kg (Rs. 510)</button>
      `;
    } else if (mode === 'supermarket') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-success); margin-right:0.25rem;">⚖️ SCALE SCANNER:</span>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('200004012509')">🍎 Scan 1.25kg Apples (Prefix-20)</button>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('200005024508')">🍗 Scan 2.45kg Chicken (Prefix-20)</button>
        <button class="quickbar-btn" onclick="window.posController.addCartonPiece('p001')">📦 Olper's Carton (12 pcs)</button>
      `;
    } else if (mode === 'pharmacy') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-warning); margin-right:0.25rem;">💊 PHARMACY:</span>
        <button class="quickbar-btn" onclick="window.posController.setCategory('Pain Relief')">⚠️ FEFO Expiry Filter</button>
        <button class="quickbar-btn" onclick="window.posController.quickStripSale('p010')">💊 Panadol 1 Strip (Rs. 30)</button>
        <button class="quickbar-btn" onclick="window.posController.quickStripSale('p011')">💊 Augmentin 1 Strip (Rs. 225)</button>
      `;
    } else if (mode === 'restaurant') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-danger); margin-right:0.25rem;">🍽️ TABLE MAP:</span>
        <button class="quickbar-btn" onclick="window.posController.selectTable('Table 1')">🪑 Table 1 (Family)</button>
        <button class="quickbar-btn" onclick="window.posController.selectTable('Table 2')">🪑 Table 2 (Couple)</button>
        <button class="quickbar-btn" onclick="window.posController.selectTable('Table 3')">🪑 Table 3 (Standard)</button>
        <button class="quickbar-btn" onclick="window.posController.selectTable('Takeaway / Delivery')">🛵 Takeaway</button>
      `;
    } else if (mode === 'fashion') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-purple); margin-right:0.25rem;">👔 VARIANTS:</span>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('770001-WM')">Kurta White/M (Rs. 2490)</button>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('770001-NL')">Kurta Navy/L (Rs. 2490)</button>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('770002-B42')">Shoes Black/42 (Rs. 5490)</button>
      `;
    } else if (mode === 'mall') {
      bar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-cyan); margin-right:0.25rem;">🏢 CONSIGNMENT:</span>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('550001')">🌸 Royal Oud Perfume (15% Comm)</button>
        <button class="quickbar-btn" onclick="window.posController.handleBarcodeInput('550002')">🎂 Artisan Fudge Cake (10% Comm)</button>
      `;
    }
  }

  addLooseItem(productId, qty, label) {
    const prod = store.state.products.find(p => p.id === productId);
    if (prod) {
      hardware.playBeep();
      store.addItemToCart(prod, qty, null, null, prod.unit || 'kg');
    }
  }

  addCartonPiece(productId) {
    const prod = store.state.products.find(p => p.id === productId);
    if (prod) {
      hardware.playBeep();
      const cartonQty = prod.pieces_per_carton || 12;
      const cartonPrice = prod.carton_price || (prod.retail_price * cartonQty);
      store.addItemToCart(prod, cartonQty, cartonPrice / cartonQty, null, 'carton');
    }
  }

  quickStripSale(productId) {
    const prod = store.state.products.find(p => p.id === productId);
    if (prod && prod.strip_price) {
      hardware.playBeep();
      store.addItemToCart(prod, 1, prod.strip_price, null, 'strip');
    }
  }

  selectTable(tableName) {
    const cart = store.getActiveCart();
    if (cart) {
      cart.notes = `Dine-in: ${tableName}`;
      store.save();
      alert(`Active Cart assigned to ${tableName}. KOT Kitchen tickets will route to station.`);
    }
  }

  // Smart Exchange & Return Modal (Section 10)
  openReturnModal() {
    const modal = document.getElementById('exchange-modal');
    if (modal) {
      document.getElementById('return-invoice-input').value = '';
      document.getElementById('return-invoice-results').innerHTML = `
        <div style="text-align:center; padding:1.5rem; color:var(--text-muted);">
          Scan or enter previous invoice number (e.g. <code>BR-DHA-POS1-...</code>) to load items.
        </div>
      `;
      modal.classList.add('active');
    }
  }

  lookupInvoiceForReturn() {
    const query = document.getElementById('return-invoice-input')?.value.trim();
    if (!query) {
      alert("Please enter or scan an invoice number!");
      return;
    }

    const invoice = store.state.invoices.find(inv => 
      inv.invoice_no.toLowerCase().includes(query.toLowerCase()) ||
      (inv.fbr_invoice_no && inv.fbr_invoice_no.toLowerCase().includes(query.toLowerCase()))
    );

    const container = document.getElementById('return-invoice-results');
    if (!container) return;

    if (!invoice) {
      container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--accent-danger);">No matching invoice found for "${query}". Ensure invoice was generated on this system.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:1rem; margin-top:0.5rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
          <div>
            <strong>Invoice: ${invoice.invoice_no}</strong><br>
            <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(invoice.created_at).toLocaleString()} | Customer: ${invoice.customer_name}</span>
          </div>
          <div style="text-align:right;">
            <strong style="color:var(--accent-success);">Total: Rs. ${invoice.grand_total.toFixed(2)}</strong><br>
            <span style="font-size:0.75rem; color:var(--text-muted);">${invoice.payment_method}</span>
          </div>
        </div>

        <h4 style="font-size:0.85rem; margin-bottom:0.5rem;">Select Item to Return / Exchange:</h4>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${invoice.items.map((it, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:0.6rem 0.8rem; border-radius:6px;">
              <div>
                <strong>${it.name}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${it.qty} × Rs. ${it.unitPrice.toFixed(2)} = Rs. ${(it.unitPrice * it.qty).toFixed(2)}</div>
              </div>
              <button class="btn btn-warning btn-sm" onclick="window.posController.processItemReturn('${invoice.invoice_no}', ${idx})">
                Return & Refund
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  processItemReturn(invoiceNo, itemIdx) {
    const invoice = store.state.invoices.find(inv => inv.invoice_no === invoiceNo);
    if (!invoice || !invoice.items[itemIdx]) return;

    const item = invoice.items[itemIdx];
    const refundAmt = item.unitPrice * item.qty;

    if (confirm(`Confirm return of "${item.name}"? Refund amount: Rs. ${refundAmt.toFixed(2)}`)) {
      // Deduct from shift cash
      if (store.state.activeShift) {
        store.state.activeShift.cash_sales -= refundAmt;
      }

      // Restore product stock
      const prod = store.state.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += item.qty;
      }

      // Record in journal
      store.state.journalEntries.unshift({
        id: `je-ret-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        reference: `RETURN-${invoiceNo}`,
        debit_account: "4002 Sales Returns & Allowances",
        debit_amount: refundAmt,
        credit_account: "1001 Cash in Drawer",
        credit_amount: refundAmt,
        tax_credit: 0
      });

      hardware.playDrawerKick();
      store.save();

      document.getElementById('exchange-modal').classList.remove('active');
      alert(`Return processed successfully! Refund Rs. ${refundAmt.toFixed(2)} handed to customer. Stock restored.`);
    }
  }
}

export const posController = new POSController();
window.posController = posController;
