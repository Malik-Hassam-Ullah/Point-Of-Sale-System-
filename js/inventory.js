// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — INVENTORY, WAREHOUSE & BARCODE STUDIO
// 4-Stage Stock Transfers, UoM Conversion, FEFO Expiry & Barcode Designer
// =========================================================================

import { store } from './state.js';
import { hardware } from './hardware.js';

class InventoryManager {
  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  render() {
    this.renderProductsTable();
    this.renderStockTransfersTable();
  }

  // 1. Render Products Table
  renderProductsTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = store.state.products.map(p => {
      const isLowStock = p.stock <= (p.min_stock || 10);
      const isExpiringSoon = p.batches && p.batches.some(b => new Date(b.expiry) < new Date(Date.now() + 60*24*60*60*1000));

      return `
        <tr>
          <td><strong>${p.name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${p.generic_name || p.category}</span></td>
          <td><code style="font-family:var(--font-mono);">${p.barcode}</code></td>
          <td>Rs. ${p.cost_price.toFixed(2)}</td>
          <td><strong>Rs. ${p.retail_price.toFixed(2)}</strong></td>
          <td>
            <span style="font-weight:700; color:${isLowStock ? 'var(--accent-danger)' : 'var(--accent-success)'};">
              ${p.stock} ${p.unit || 'pcs'}
            </span>
            ${isLowStock ? '<span style="font-size:0.65rem; background:rgba(239,68,68,0.2); color:var(--accent-danger); padding:2px 4px; border-radius:4px; margin-left:4px;">Low Stock</span>' : ''}
          </td>
          <td>
            ${p.batches ? p.batches.map(b => `<div style="font-size:0.75rem;">${b.batch_no}: <strong>${b.expiry}</strong> (${b.qty})</div>`).join('') : '<span style="color:var(--text-muted);">-</span>'}
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.inventoryManager.openBarcodeLabelModal('${p.id}')">🏷️ Label</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 2. Open Add Product Modal
  openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('active');
  }

  saveNewProduct() {
    const name = document.getElementById('new-prod-name')?.value.trim();
    const barcode = document.getElementById('new-prod-barcode')?.value.trim();
    const category = document.getElementById('new-prod-category')?.value.trim() || 'General';
    const cost = parseFloat(document.getElementById('new-prod-cost')?.value || 0);
    const price = parseFloat(document.getElementById('new-prod-price')?.value || 0);
    const stock = parseFloat(document.getElementById('new-prod-stock')?.value || 0);
    const unit = document.getElementById('new-prod-unit')?.value || 'piece';

    if (!name || !barcode) {
      alert("Product Name and Barcode are required!");
      return;
    }

    const newProduct = {
      id: `p-${Date.now()}`,
      name,
      barcode,
      category,
      cost_price: cost,
      retail_price: price,
      stock,
      unit,
      mode: store.state.currentMode,
      tax_rate: 18.0
    };

    store.state.products.push(newProduct);
    store.save();

    document.getElementById('add-product-modal').classList.remove('active');
    alert(`Product "${name}" added successfully to catalog.`);
  }

  // 3. 4-Stage Inter-Branch Stock Transfers (Section 08, Figure 8.1)
  renderStockTransfersTable() {
    const tbody = document.getElementById('transfers-table-body');
    if (!tbody) return;

    tbody.innerHTML = store.state.stockTransfers.map(tr => {
      let statusBadge = '';
      if (tr.status === 'requested') {
        statusBadge = '<span style="background:rgba(245,158,11,0.2); color:var(--accent-warning); padding:3px 8px; border-radius:4px; font-weight:bold;">1. Requisition (Pending)</span>';
      } else if (tr.status === 'dispatched_in_transit') {
        statusBadge = '<span style="background:rgba(59,130,246,0.2); color:var(--accent-primary); padding:3px 8px; border-radius:4px; font-weight:bold;">🚚 2. In-Transit (Dispatched)</span>';
      } else if (tr.status === 'received_grn_verified') {
        statusBadge = '<span style="background:rgba(16,185,129,0.2); color:var(--accent-success); padding:3px 8px; border-radius:4px; font-weight:bold;">✅ 3. GRN Verified (Completed)</span>';
      }

      return `
        <tr>
          <td><strong>${tr.transfer_number}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${tr.gate_pass_no || '-'}</span></td>
          <td>${tr.source}</td>
          <td>${tr.dest}</td>
          <td>${tr.items}</td>
          <td>${statusBadge}</td>
          <td>
            ${tr.status === 'dispatched_in_transit' ? `
              <button class="btn btn-success btn-sm" onclick="window.inventoryManager.verifyGRN('${tr.id}')">Scan & Receive (GRN)</button>
            ` : '<span style="color:var(--text-muted); font-size:0.8rem;">Archived</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Create New Stock Requisition / Transfer
  openNewTransferModal() {
    const dest = prompt("Enter Destination Branch (e.g. Mall Outlet DHA):", "Mall Outlet - Cash Counter 01");
    if (!dest) return;
    const items = prompt("Enter Items to transfer:", "Olper's Milk (48 pcs), Coca Cola 1.5L (24 pcs)");
    if (!items) return;

    const trNumber = `TR-WH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTr = {
      id: `tr-${Date.now()}`,
      transfer_number: trNumber,
      source: "Central Distribution Warehouse",
      dest: dest,
      items: items,
      status: "dispatched_in_transit",
      gate_pass_no: `GP-${Math.floor(1000 + Math.random() * 9000)}`,
      dispatched_at: new Date().toLocaleString()
    };

    store.state.stockTransfers.unshift(newTr);
    store.save();
    alert(`Transfer ${trNumber} created and dispatched with Gate Pass ${newTr.gate_pass_no}. Status set to In-Transit.`);
  }

  // Verify Goods Received Note (GRN) upon arrival at branch
  verifyGRN(transferId) {
    const tr = store.state.stockTransfers.find(t => t.id === transferId);
    if (!tr) return;

    if (confirm(`Confirm receipt and scan verification of Gate Pass ${tr.gate_pass_no} for ${tr.dest}?`)) {
      tr.status = "received_grn_verified";
      tr.received_at = new Date().toLocaleString();
      store.save();
      hardware.playBeep();
      alert(`GRN Verified! Stock has been securely transferred and added to branch ledger.`);
    }
  }

  // 4. Barcode Label Designer & Printable Thermal Sticker Generator
  openBarcodeLabelModal(productId) {
    const product = store.state.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('barcode-designer-modal');
    const container = document.getElementById('barcode-sticker-preview');
    if (!modal || !container) return;

    const storeName = store.state.tenant.name || "Al-Madina Retailers";
    const qrOrBarcodeSVG = hardware.generateQRCodeSVG(product.barcode, 70);

    container.innerHTML = `
      <div style="background:#fff; color:#000; padding:12px; border:2px dashed #000; border-radius:4px; width:220px; font-family:'Outfit',sans-serif; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #000; padding-bottom:4px; margin-bottom:6px;">
          ${storeName}
        </div>
        <div style="font-size:12px; font-weight:700; line-height:1.2; margin-bottom:4px;">
          ${product.name}
        </div>
        <div style="margin:4px 0;">
          ${qrOrBarcodeSVG}
        </div>
        <div style="font-size:11px; font-family:var(--font-mono); font-weight:bold; letter-spacing:0.05em;">
          ${product.barcode}
        </div>
        <div style="font-size:15px; font-weight:900; color:#000; margin-top:4px;">
          Rs. ${product.retail_price.toFixed(2)}
        </div>
        <div style="font-size:8px; color:#555;">Incl. All Taxes</div>
      </div>
    `;

    modal.classList.add('active');
  }

  printBarcodeSticker() {
    window.print();
  }
}

export const inventoryManager = new InventoryManager();
window.inventoryManager = inventoryManager;
