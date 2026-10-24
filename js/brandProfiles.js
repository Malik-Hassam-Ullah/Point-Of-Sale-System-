// =========================================================================
// ENTERPRISE BRAND PROFILES & RETAIL STANDARDS (BATA, AL-FATAH, MEGA MALL)
// Real-world enterprise retail configurations, article schemas & policies
// =========================================================================

export const BRAND_PROFILES = {
  bata: {
    id: "bata",
    name: "Bata Pakistan Ltd.",
    brandLogo: "👞",
    brandColor: "#dc2626",
    tagline: "Surprisingly Bata — Shoes for the entire family",
    storeCode: "BATA-LHR-042",
    storeName: "Bata Flagship Store (Mall of Lahore / DHA)",
    terminalId: "POS-REG-03",
    taxNtn: "0710892-4",
    fbrPosId: "FBR-BATA-9921",
    currency: "Rs.",
    loyaltyProgram: {
      name: "Club Bata VIP",
      pointsPerHundred: 2, // 2 points per Rs. 100
      pointValue: 1.0 // 1 point = Rs. 1.00
    },
    salesmen: [
      { id: "SP-101", name: "Tariq Mehmood", code: "101", target: 250000 },
      { id: "SP-102", name: "Zeeshan Ali", code: "102", target: 200000 },
      { id: "SP-103", name: "Hamza Shafiq", code: "103", target: 200000 }
    ],
    voucherCodes: {
      "BATA-EID-1000": { discount: 1000, minBill: 5000, type: "fixed" },
      "BATA-VIP-15": { discount: 15, minBill: 3000, type: "percent" },
      "GIFT-CARD-2500": { discount: 2500, minBill: 2500, type: "fixed" }
    },
    branchesStock: {
      "Mall of Lahore (Current)": "In Stock",
      "DHA Phase 5 Outlet": "4 Pairs",
      "Gulberg Main Boulevard": "2 Pairs",
      "Packages Mall Branch": "6 Pairs",
      "Central Supply Depot (Kala Shah Kaku)": "120 Pairs"
    },
    returnPolicy: "Exchange valid within 15 days at any Bata store across Pakistan with original box & receipt."
  },

  alfatah: {
    id: "alfatah",
    name: "Al-Fatah Departmental Store",
    brandLogo: "🛒",
    brandColor: "#059669",
    tagline: "The Ultimate Shopping Experience",
    storeCode: "ALF-DHA-01",
    storeName: "Al-Fatah Mall & Department Store (DHA Phase 5)",
    terminalId: "POS-LANE-08",
    taxNtn: "2489102-1",
    fbrPosId: "FBR-ALF-7741",
    currency: "Rs.",
    loyaltyProgram: {
      name: "Al-Fatah Privilege Gold",
      pointsPerHundred: 3,
      pointValue: 1.0
    },
    salesmen: [
      { id: "SP-201", name: "Muhammad Asif", code: "201", target: 500000 },
      { id: "SP-202", name: "Rashid Minhas", code: "202", target: 450000 }
    ],
    voucherCodes: {
      "ALFATAH-GIFT-2000": { discount: 2000, minBill: 4000, type: "fixed" },
      "PRIVILEGE-10": { discount: 10, minBill: 2000, type: "percent" }
    },
    branchesStock: {
      "DHA Phase 5 (Current)": "In Stock",
      "Gulberg Exclusive": "Available",
      "Mall of Defence": "Available",
      "Johar Town Mega Mart": "Low Stock",
      "Central Distribution Warehouse": "Available"
    },
    returnPolicy: "Dry grocery & garments exchangeable within 7 days. Fresh produce non-returnable."
  },

  megamall: {
    id: "megamall",
    name: "Packages Mall & Consignment ERP",
    brandLogo: "🏢",
    brandColor: "#2563eb",
    tagline: "Pakistan's Premier Shopping & Entertainment Destination",
    storeCode: "PKG-CENTRAL-01",
    storeName: "Central Checkout Counter A1 (Packages Mall)",
    terminalId: "POS-MALL-01",
    taxNtn: "3891022-7",
    fbrPosId: "FBR-MALL-4401",
    currency: "Rs.",
    loyaltyProgram: {
      name: "Mall Pass Rewards",
      pointsPerHundred: 2.5,
      pointValue: 1.0
    },
    salesmen: [
      { id: "SP-301", name: "Usman Ghani", code: "301", target: 800000 }
    ],
    voucherCodes: {
      "MALL-FESTIVAL-1500": { discount: 1500, minBill: 6000, type: "fixed" }
    },
    branchesStock: {
      "Packages Mall Central": "In Stock",
      "Centaurus Mall Outlet": "Available",
      "Emporium Mall Booth": "Available"
    },
    returnPolicy: "Central checkout consignment items refundable at Customer Service Desk within 7 days."
  }
};
