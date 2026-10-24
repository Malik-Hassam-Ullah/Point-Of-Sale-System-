// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — 6 ADAPTIVE BUSINESS MODES CONTROLLER
// Micro-Retail Lite, Supermarket, Fashion Matrix, Pharmacy FEFO, Restaurant KOT, Mall
// =========================================================================

export const MODES_CONFIG = {
  micro_retail: {
    id: "micro_retail",
    label: "Micro-Retail (Karyana / Lite)",
    badge: "Karyana Lite",
    icon: "🏪",
    description: "Ultra-simple 1-screen billing, loose item buttons, and Udhaar Khata.",
    visibleColumns: ["name", "qty", "price", "total"],
    features: {
      looseItemsQuickBar: true,
      cartonPieceToggle: false,
      variantMatrix: false,
      pharmacyFEFO: false,
      restaurantTables: false,
      consignmentSplits: false,
      fbrCompliance: false
    }
  },

  supermarket: {
    id: "supermarket",
    label: "Supermarket & Cash & Carry",
    badge: "Supermarket Pro",
    icon: "🛒",
    description: "High-speed barcode scanning, scale-embedded barcodes, carton pricing & multi-tab hold bills.",
    visibleColumns: ["barcode", "name", "qty", "unit", "price", "tax", "total"],
    features: {
      looseItemsQuickBar: true,
      cartonPieceToggle: true,
      variantMatrix: false,
      pharmacyFEFO: false,
      restaurantTables: false,
      consignmentSplits: false,
      fbrCompliance: true
    }
  },

  fashion: {
    id: "fashion",
    label: "Fashion, Garments & Shoes",
    badge: "Apparel & Shoes",
    icon: "👔",
    description: "Matrix inventory (Size × Color), custom barcode stickers, salesman commission tracking.",
    visibleColumns: ["name", "variant", "qty", "price", "total"],
    features: {
      looseItemsQuickBar: false,
      cartonPieceToggle: false,
      variantMatrix: true,
      pharmacyFEFO: false,
      restaurantTables: false,
      consignmentSplits: false,
      fbrCompliance: true
    }
  },

  pharmacy: {
    id: "pharmacy",
    label: "Pharmacy & Medical Store",
    badge: "Pharmacy FEFO",
    icon: "💊",
    description: "First-Expiry First-Out (FEFO), salt/generic formula search, Box-to-Strip calculator.",
    visibleColumns: ["name", "generic", "batch", "expiry", "qty", "price", "total"],
    features: {
      looseItemsQuickBar: false,
      cartonPieceToggle: false,
      variantMatrix: false,
      pharmacyFEFO: true,
      restaurantTables: false,
      consignmentSplits: false,
      fbrCompliance: true
    }
  },

  restaurant: {
    id: "restaurant",
    label: "Restaurant, Cafe & Food Court",
    badge: "Restaurant & KOT",
    icon: "🍕",
    description: "Interactive floor table mapping, Dine-In/Takeaway, KOT kitchen routing, recipe BOM deduction.",
    visibleColumns: ["table", "name", "kot_station", "qty", "price", "total"],
    features: {
      looseItemsQuickBar: false,
      cartonPieceToggle: false,
      variantMatrix: false,
      pharmacyFEFO: false,
      restaurantTables: true,
      consignmentSplits: false,
      fbrCompliance: true
    }
  },

  mall: {
    id: "mall",
    label: "Multi-Vendor Mall & Franchise ERP",
    badge: "Mall Consignment",
    icon: "🏢",
    description: "Central checkout consignment splits, automated vendor commission, and franchise royalty engine.",
    visibleColumns: ["vendor", "name", "qty", "price", "commission", "vendor_net", "total"],
    features: {
      looseItemsQuickBar: false,
      cartonPieceToggle: false,
      variantMatrix: false,
      pharmacyFEFO: false,
      restaurantTables: false,
      consignmentSplits: true,
      fbrCompliance: true
    }
  }
};

class ModeEngine {
  getCurrentConfig(modeKey) {
    return MODES_CONFIG[modeKey] || MODES_CONFIG.supermarket;
  }

  // Filter products by current active mode
  filterProductsForMode(products, activeMode) {
    if (activeMode === 'all') return products;
    return products.filter(p => p.mode === activeMode || p.mode === 'supermarket' || !p.mode);
  }

  // Render mode-specific top banner or badge
  getModeBannerHTML(modeKey) {
    const config = this.getCurrentConfig(modeKey);
    return `
      <div class="mode-indicator-bar" style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); padding:0.35rem 0.75rem; border-radius:6px; margin-bottom:0.5rem;">
        <span>${config.icon}</span>
        <strong>Mode: ${config.label}</strong>
        <span style="color:var(--text-muted); font-size:0.75rem;">— ${config.description}</span>
      </div>
    `;
  }
}

export const modeEngine = new ModeEngine();
