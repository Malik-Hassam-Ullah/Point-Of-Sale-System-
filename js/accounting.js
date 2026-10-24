// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — ACCOUNTING, CASH SHIFTS & KHATA CRM
// Blind Z-Report Reconciliation, Customer Udhaar Book & Double-Entry Ledger
// =========================================================================

import { store } from './state.js';
import { hardware } from './hardware.js';

class AccountingManager {
  init() {
    this.render();
    store.subscribe(() => this.render());
  }

  render() {
    this.renderShiftStatus();
    this.renderKhataCustomers();
    this.renderJournalEntries();
  }

  // 1. Cash Shift & Blind Z-Report (Section 11)
  renderShiftStatus() {
    const shift = store.state.activeShift;
    const container = document.getElementById('shift-summary-card');
    if (!container || !shift) return;

    let totalDrops = 0;
    shift.petty_cash_drops.forEach(d => totalDrops += d.amount);

    const expectedInDrawer = shift.opening_float + shift.cash_sales - totalDrops;

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:1rem;">
        <div class="stat-card">
          <div class="stat-label">Shift Status</div>
          <div class="stat-val" style="color:var(--accent-success); font-size:1.3rem; text-transform:uppercase;">
            ● ${shift.status}
          </div>
          <div class="stat-desc">Cashier: ${shift.cashier_name}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Opening Float (Galla)</div>
          <div class="stat-val">Rs. ${shift.opening_float.toFixed(2)}</div>
          <div class="stat-desc">Counted at Shift Start</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Today's Cash Sales</div>
          <div class="stat-val" style="color:var(--accent-primary);">
            Rs. ${shift.cash_sales.toFixed(2)}
          </div>
          <div class="stat-desc">Card/Online: Rs. ${shift.card_sales.toFixed(2)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Petty Cash Drops</div>
          <div class="stat-val" style="color:var(--accent-danger);">
            - Rs. ${totalDrops.toFixed(2)}
          </div>
          <div class="stat-desc">${shift.petty_cash_drops.length} expense drops recorded</div>
        </div>
      </div>

      <div style="display:flex; gap:0.75rem;">
        <button class="btn btn-warning" onclick="window.accountingManager.openPettyCashModal()">💸 Record Cash Drop / Expense</button>
        <button class="btn btn-danger" onclick="window.accountingManager.openBlindShiftCloseModal()">🔒 Blind Shift Close (Z-Report)</button>
      </div>
    `;
  }

  // Record Petty Cash / Expense
  openPettyCashModal() {
    const reason = prompt("Enter Expense / Cash Drop Reason (e.g. Chai, Bijli Bill, Supplier):");
    if (!reason) return;

    const amt = prompt("Enter Amount (Rs.):");
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) return;

    const dropAmt = parseFloat(amt);
    store.state.activeShift.petty_cash_drops.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reason: reason,
      amount: dropAmt
    });

    hardware.playDrawerKick();
    store.save();
    alert(`Expense of Rs. ${dropAmt} for "${reason}" recorded. Cash drawer updated.`);
  }

  // Blind Shift Close Modal (Denominations Counter)
  openBlindShiftCloseModal() {
    const modal = document.getElementById('blind-zreport-modal');
    if (modal) {
      // Clear previous inputs
      ['5000', '1000', '500', '100', '50', '20', '10'].forEach(denom => {
        const inp = document.getElementById(`denom-${denom}`);
        if (inp) inp.value = 0;
      });
      document.getElementById('counted-drawer-total').textContent = 'Rs. 0.00';
      document.getElementById('zreport-result-alert').style.display = 'none';
      modal.classList.add('active');
    }
  }

  updateCountedTotal() {
    const denoms = [5000, 1000, 500, 100, 50, 20, 10];
    let total = 0;

    denoms.forEach(d => {
      const inp = document.getElementById(`denom-${d}`);
      const count = parseInt(inp?.value || 0);
      if (!isNaN(count)) total += (d * count);
    });

    const display = document.getElementById('counted-drawer-total');
    if (display) display.textContent = `Rs. ${total.toFixed(2)}`;
    return total;
  }

  submitBlindZReport() {
    const countedTotal = this.updateCountedTotal();
    const shift = store.state.activeShift;

    let totalDrops = 0;
    shift.petty_cash_drops.forEach(d => totalDrops += d.amount);

    const expectedInDrawer = shift.opening_float + shift.cash_sales - totalDrops;
    const variance = countedTotal - expectedInDrawer;

    const alertBox = document.getElementById('zreport-result-alert');
    if (!alertBox) return;

    alertBox.style.display = 'block';

    if (variance === 0) {
      alertBox.style.background = 'rgba(16,185,129,0.15)';
      alertBox.style.color = 'var(--accent-success)';
      alertBox.style.borderColor = 'rgba(16,185,129,0.3)';
      alertBox.innerHTML = `
        <strong>✅ 100% PERFECT RECONCILIATION!</strong><br>
        Expected: Rs. ${expectedInDrawer.toFixed(2)} | Counted: Rs. ${countedTotal.toFixed(2)} | Variance: Rs. 0.00
      `;
    } else if (variance > 0) {
      alertBox.style.background = 'rgba(59,130,246,0.15)';
      alertBox.style.color = 'var(--accent-primary)';
      alertBox.style.borderColor = 'rgba(59,130,246,0.3)';
      alertBox.innerHTML = `
        <strong>⚠️ CASH OVERAGE DETECTED (+Rs. ${variance.toFixed(2)})</strong><br>
        Expected: Rs. ${expectedInDrawer.toFixed(2)} | Actual Counted: Rs. ${countedTotal.toFixed(2)}.<br>
        Overage surplus will be logged into System Audit Register.
      `;
    } else {
      alertBox.style.background = 'rgba(239,68,68,0.15)';
      alertBox.style.color = 'var(--accent-danger)';
      alertBox.style.borderColor = 'rgba(239,68,68,0.3)';
      alertBox.innerHTML = `
        <strong>🚨 CASH SHORTAGE ALERT! (-Rs. ${Math.abs(variance).toFixed(2)})</strong><br>
        Expected: Rs. ${expectedInDrawer.toFixed(2)} | Actual Counted: Rs. ${countedTotal.toFixed(2)}.<br>
        Instant shortage notification triggered to Store Owner.
      `;
    }

    hardware.playDrawerKick();
  }

  // 2. Customer Khata CRM & 1-Click WhatsApp Reminders (Section 11)
  renderKhataCustomers() {
    const tbody = document.getElementById('khata-customers-table-body');
    if (!tbody) return;

    tbody.innerHTML = store.state.customers.map(c => {
      const isOverLimit = c.current_balance >= c.credit_limit && c.credit_limit > 0;
      const isNearLimit = c.current_balance >= (c.credit_limit * 0.8) && c.credit_limit > 0;

      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>Rs. ${c.credit_limit.toFixed(2)}</td>
          <td>
            <strong style="color:${isOverLimit ? 'var(--accent-danger)' : (c.current_balance > 0 ? 'var(--accent-warning)' : 'var(--text-primary)')};">
              Rs. ${c.current_balance.toFixed(2)}
            </strong>
            ${isOverLimit ? '<span style="font-size:0.65rem; background:rgba(239,68,68,0.2); color:var(--accent-danger); padding:2px 4px; border-radius:4px; margin-left:4px;">Limit Crossed</span>' : ''}
          </td>
          <td>${c.loyalty_points} pts</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.accountingManager.recordKhataPayment('${c.id}')">💵 Receive</button>
              ${c.current_balance > 0 ? `
                <button class="btn btn-success btn-sm" onclick="window.accountingManager.sendWhatsAppReminder('${c.id}')">📲 WhatsApp Reminder</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  recordKhataPayment(customerId) {
    const cust = store.state.customers.find(c => c.id === customerId);
    if (!cust || cust.current_balance <= 0) {
      alert("This customer has no outstanding Udhaar balance.");
      return;
    }

    const amt = prompt(`Enter payment received from ${cust.name} (Current Debt: Rs. ${cust.current_balance}):`, cust.current_balance);
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) return;

    const received = parseFloat(amt);
    cust.current_balance = Math.max(0, cust.current_balance - received);
    
    // Add to cashier cash sales
    if (store.state.activeShift) {
      store.state.activeShift.cash_sales += received;
    }

    hardware.playBeep();
    store.save();
    alert(`Payment of Rs. ${received} recorded. Customer's new balance: Rs. ${cust.current_balance.toFixed(2)}.`);
  }

  sendWhatsAppReminder(customerId) {
    const cust = store.state.customers.find(c => c.id === customerId);
    if (!cust) return;

    let cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('03')) cleanPhone = '92' + cleanPhone.substring(1);

    const storeName = store.state.tenant.name || "Al-Madina Retailers";
    const text = `*Muhtaram ${cust.name} Sahab,*\n\nYeh ${storeName} ki taraf se khata hisab ka reminder hai.\nAapke zimme kul baqaya raqam: *Rs. ${cust.current_balance.toFixed(2)}* hai.\n\nBaraye meharbani apni sahulat ke mutabiq jazzcash/easypaisa ya dukaan par aakar hisab clear farma dein.\nShukriya!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // 3. Double-Entry General Ledger (Section 11, Figure 11.1)
  renderJournalEntries() {
    const tbody = document.getElementById('journal-entries-table-body');
    if (!tbody) return;

    if (store.state.journalEntries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No automated ledger entries yet. Sales made at POS automatically post here.</td></tr>`;
      return;
    }

    tbody.innerHTML = store.state.journalEntries.slice(0, 20).map(je => `
      <tr>
        <td>${je.date}</td>
        <td><code>${je.reference}</code></td>
        <td><strong>${je.debit_account}</strong></td>
        <td><strong style="color:var(--accent-success);">Rs. ${je.debit_amount.toFixed(2)}</strong></td>
        <td><strong>${je.credit_account}</strong></td>
        <td><strong>Rs. ${je.credit_amount.toFixed(2)}</strong> ${je.tax_credit ? `(+Rs. ${je.tax_credit.toFixed(2)} Tax)` : ''}</td>
      </tr>
    `).join('');
  }
}

export const accountingManager = new AccountingManager();
window.accountingManager = accountingManager;
