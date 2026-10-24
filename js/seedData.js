// =========================================================================
// UNIVERSAL POINT OF SALE & ERP — COMPREHENSIVE MULTI-MODE SEED DATA
// Real-world products, batches, variants, vendors, tables, and customers
// =========================================================================

export const SEED_DATA = {
  // Current Active Tenant
  tenant: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Al-Madina Mega Retailers & Mall",
    business_mode: "supermarket", // Default mode: supermarket
    fbr_enabled: true,
    fbr_pos_id: "POS-LHR-99482",
    tax_ntn: "7291845-3",
    royalty_pct: 5.0,
    marketing_fee_pct: 2.0
  },

  // Branches
  branches: [
    {
      id: "b0000000-0000-0000-0000-000000000001",
      name: "Central Distribution Warehouse",
      branch_code: "WH-01",
      is_warehouse: true,
      city: "Lahore",
      address: "Industrial Area, Kot Lakhpat"
    },
    {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Mall Outlet - Cash Counter 01",
      branch_code: "BR-DHA",
      is_warehouse: false,
      city: "Lahore",
      address: "DHA Phase 5 Mall, Ground Floor"
    },
    {
      id: "b0000000-0000-0000-0000-000000000003",
      name: "Gulberg Super Store",
      branch_code: "BR-GLB",
      is_warehouse: false,
      city: "Lahore",
      address: "Main Boulevard, Gulberg III"
    }
  ],

  // Consignment Vendors & Mall Partners
  vendors: [
    {
      id: "v0000000-0000-0000-0000-000000000001",
      name: "Royal Fragrances (Consignment)",
      type: "consignment",
      commission_pct: 15.0,
      wallet_balance: 18450.00,
      phone: "0300-1122334",
      booth_no: "Booth-12"
    },
    {
      id: "v0000000-0000-0000-0000-000000000002",
      name: "Artisan Bakery Goods",
      type: "consignment",
      commission_pct: 10.0,
      wallet_balance: 9200.00,
      phone: "0321-4455667",
      booth_no: "Booth-04"
    },
    {
      id: "v0000000-0000-0000-0000-000000000003",
      name: "Sapphire Trends Co.",
      type: "mall_subtenant",
      commission_pct: 12.5,
      wallet_balance: 45000.00,
      phone: "0333-8899001",
      booth_no: "Shop-201"
    }
  ],

  // Registered Customers & Udhaar Khata
  customers: [
    {
      id: "c0000000-0000-0000-0000-000000000001",
      name: "Walk-in Customer (Naqad)",
      phone: "0300-0000000",
      credit_limit: 0,
      current_balance: 0,
      loyalty_points: 0
    },
    {
      id: "c0000000-0000-0000-0000-000000000002",
      name: "Haji Muhammad Aslam",
      phone: "0301-7654321",
      credit_limit: 25000.00,
      current_balance: 8400.00,
      loyalty_points: 340
    },
    {
      id: "c0000000-0000-0000-0000-000000000003",
      name: "Dr. Farhan Qureshi",
      phone: "0322-9988776",
      credit_limit: 15000.00,
      current_balance: 2200.00,
      loyalty_points: 180
    },
    {
      id: "c0000000-0000-0000-0000-000000000004",
      name: "Tariq Mehmood (Near Limit)",
      phone: "0345-1234567",
      credit_limit: 10000.00,
      current_balance: 9600.00,
      loyalty_points: 90
    }
  ],

  // Restaurant Tables (Mode: restaurant)
  restaurant_tables: [
    { id: "T1", name: "Table 1 (Family)", capacity: 6, status: "available", active_order: null },
    { id: "T2", name: "Table 2 (Couple)", capacity: 2, status: "occupied", active_order: { items: 3, total: 2450 } },
    { id: "T3", name: "Table 3 (Standard)", capacity: 4, status: "available", active_order: null },
    { id: "T4", name: "Table 4 (VIP Lounge)", capacity: 8, status: "reserved", active_order: null },
    { id: "T5", name: "Table 5 (Terrace)", capacity: 4, status: "available", active_order: null },
    { id: "T6", name: "Table 6 (Corner)", capacity: 4, status: "occupied", active_order: { items: 2, total: 1200 } }
  ],

  // Master Products Catalog
  products: [
    // -------------------------------------------------------------
    // 1. Supermarket / Cash & Carry
    // -------------------------------------------------------------
    {
      id: "p001",
      name: "Olper's Milk Full Cream 1 Litre",
      category: "Dairy & Eggs",
      mode: "supermarket",
      barcode: "896400010101",
      cost_price: 260.00,
      retail_price: 295.00,
      stock: 145,
      unit: "piece",
      pieces_per_carton: 12,
      carton_price: 3450.00,
      tax_rate: 18.0
    },
    {
      id: "p002",
      name: "Lipton Yellow Label Tea 400g",
      category: "Beverages",
      mode: "supermarket",
      barcode: "896400010102",
      cost_price: 680.00,
      retail_price: 760.00,
      stock: 82,
      unit: "piece",
      tax_rate: 18.0
    },
    {
      id: "p003",
      name: "Coca Cola Bottle 1.5L",
      category: "Beverages",
      mode: "supermarket",
      barcode: "896400010103",
      cost_price: 155.00,
      retail_price: 180.00,
      stock: 210,
      unit: "piece",
      tax_rate: 18.0
    },
    // Weighing Scale Prefix-20/21 Embedded Barcode items
    {
      id: "p004",
      name: "Fresh Red Apples (Scale)",
      category: "Fresh Produce",
      mode: "supermarket",
      barcode: "2000040", // Prefix 20, item code 0004
      cost_price: 220.00,
      retail_price: 300.00, // per kg
      stock: 54.5,
      unit: "kg",
      is_scale: true,
      tax_rate: 0.0
    },
    {
      id: "p005",
      name: "Fresh Boneless Chicken (Scale)",
      category: "Meat & Poultry",
      mode: "supermarket",
      barcode: "2000050", // Prefix 20, item code 0005
      cost_price: 650.00,
      retail_price: 780.00, // per kg
      stock: 38.2,
      unit: "kg",
      is_scale: true,
      tax_rate: 0.0
    },

    // -------------------------------------------------------------
    // 2. Micro-Retail / Karyana (Khula Saman)
    // -------------------------------------------------------------
    {
      id: "p006",
      name: "Khuli Cheeni (Sugar Loose)",
      category: "Loose Items",
      mode: "micro_retail",
      barcode: "1001",
      cost_price: 135.00,
      retail_price: 150.00,
      stock: 250,
      unit: "kg",
      is_loose: true,
      tax_rate: 0.0
    },
    {
      id: "p007",
      name: "Daal Chana Super (Loose)",
      category: "Loose Items",
      mode: "micro_retail",
      barcode: "1002",
      cost_price: 240.00,
      retail_price: 270.00,
      stock: 120,
      unit: "kg",
      is_loose: true,
      tax_rate: 0.0
    },
    {
      id: "p008",
      name: "Chaki Atta (Whole Wheat Flour)",
      category: "Flour & Grains",
      mode: "micro_retail",
      barcode: "1003",
      cost_price: 115.00,
      retail_price: 130.00,
      stock: 300,
      unit: "kg",
      is_loose: true,
      tax_rate: 0.0
    },
    {
      id: "p009",
      name: "Kisan Banaspati Ghee 1kg Pouch",
      category: "Cooking Essentials",
      mode: "micro_retail",
      barcode: "896400010109",
      cost_price: 460.00,
      retail_price: 510.00,
      stock: 65,
      unit: "piece",
      tax_rate: 0.0
    },

    // -------------------------------------------------------------
    // 3. Pharmacy & Medical (FEFO Expiry, Generic Salt, Strip Conversion)
    // -------------------------------------------------------------
    {
      id: "p010",
      name: "Panadol 500mg Tablets (Box of 200)",
      generic_name: "Paracetamol",
      category: "Pain Relief",
      mode: "pharmacy",
      barcode: "896400020101",
      cost_price: 520.00,
      retail_price: 600.00,
      box_price: 600.00,
      strip_price: 30.00, // 20 strips per box
      strips_per_box: 20,
      tablets_per_strip: 10,
      stock: 32, // boxes
      unit: "box",
      tax_rate: 0.0,
      batches: [
        { batch_no: "PAN-24A", expiry: "2026-12-15", qty: 10, cost: 510.00 },
        { batch_no: "PAN-25B", expiry: "2027-08-30", qty: 22, cost: 525.00 }
      ]
    },
    {
      id: "p011",
      name: "Augmentin 625mg (Box of 14)",
      generic_name: "Amoxicillin + Clavulanic Acid",
      category: "Antibiotics",
      mode: "pharmacy",
      barcode: "896400020102",
      cost_price: 380.00,
      retail_price: 450.00,
      box_price: 450.00,
      strip_price: 225.00,
      strips_per_box: 2,
      tablets_per_strip: 7,
      stock: 18,
      unit: "box",
      tax_rate: 0.0,
      batches: [
        { batch_no: "AUG-77X", expiry: "2026-11-20", qty: 5, cost: 375.00 }, // Expires sooner (FEFO)
        { batch_no: "AUG-88Y", expiry: "2027-04-10", qty: 13, cost: 385.00 }
      ]
    },
    {
      id: "p012",
      name: "Brufen 400mg Tablets",
      generic_name: "Ibuprofen",
      category: "Anti-Inflammatory",
      mode: "pharmacy",
      barcode: "896400020103",
      cost_price: 290.00,
      retail_price: 340.00,
      strips_per_box: 10,
      strip_price: 34.00,
      stock: 40,
      unit: "box",
      tax_rate: 0.0,
      batches: [
        { batch_no: "BRF-09", expiry: "2027-02-28", qty: 40, cost: 290.00 }
      ]
    },

    // -------------------------------------------------------------
    // 4. Fashion, Garments & Shoes (Matrix: Size x Color)
    // -------------------------------------------------------------
    {
      id: "p013",
      name: "Men's Slim Fit Cotton Kurta",
      category: "Men's Apparel",
      mode: "fashion",
      barcode: "770001",
      has_variants: true,
      variants: [
        { name: "White / M", barcode: "770001-WM", cost: 1400.00, price: 2490.00, stock: 12 },
        { name: "White / L", barcode: "770001-WL", cost: 1400.00, price: 2490.00, stock: 15 },
        { name: "Navy Blue / M", barcode: "770001-NM", cost: 1400.00, price: 2490.00, stock: 8 },
        { name: "Navy Blue / L", barcode: "770001-NL", cost: 1400.00, price: 2490.00, stock: 10 }
      ],
      cost_price: 1400.00,
      retail_price: 2490.00,
      stock: 45,
      unit: "piece",
      tax_rate: 18.0
    },
    {
      id: "p014",
      name: "Leather Formal Oxford Shoes",
      category: "Footwear",
      mode: "fashion",
      barcode: "770002",
      has_variants: true,
      variants: [
        { name: "Black / 41", barcode: "770002-B41", cost: 3200.00, price: 5490.00, stock: 4 },
        { name: "Black / 42", barcode: "770002-B42", cost: 3200.00, price: 5490.00, stock: 6 },
        { name: "Brown / 41", barcode: "770002-BR41", cost: 3200.00, price: 5490.00, stock: 5 },
        { name: "Brown / 42", barcode: "770002-BR42", cost: 3200.00, price: 5490.00, stock: 7 }
      ],
      cost_price: 3200.00,
      retail_price: 5490.00,
      stock: 22,
      unit: "pair",
      tax_rate: 18.0
    },

    // -------------------------------------------------------------
    // 5. Restaurant / Food Court (KOT, BOM Recipe deduction)
    // -------------------------------------------------------------
    {
      id: "p015",
      name: "Crispy Zinger Crunch Burger",
      category: "Fast Food",
      mode: "restaurant",
      barcode: "9001",
      cost_price: 320.00,
      retail_price: 650.00,
      stock: 999, // Prepared fresh
      unit: "order",
      kot_station: "Kitchen 1 - Fryer & Grill",
      recipe: [
        { item: "Burger Bun", qty: "1 pc" },
        { item: "Chicken Crispy Fillet", qty: "150g" },
        { item: "Spicy Mayo Sauce", qty: "30g" }
      ],
      tax_rate: 16.0 // Restaurant Sales Tax
    },
    {
      id: "p016",
      name: "Special Chicken Biryani (Single Plate)",
      category: "Traditional",
      mode: "restaurant",
      barcode: "9002",
      cost_price: 240.00,
      retail_price: 480.00,
      stock: 45,
      unit: "plate",
      kot_station: "Kitchen 2 - Rice & Curry",
      tax_rate: 16.0
    },
    {
      id: "p017",
      name: "Mint Margarita Chilled",
      category: "Beverages",
      mode: "restaurant",
      barcode: "9003",
      cost_price: 70.00,
      retail_price: 220.00,
      stock: 999,
      unit: "glass",
      kot_station: "Beverage Bar Counter",
      tax_rate: 16.0
    },

    // -------------------------------------------------------------
    // 6. Mall & Multi-Vendor Consignment Partners
    // -------------------------------------------------------------
    {
      id: "p018",
      name: "Oud Royale Luxury Perfume 100ml",
      category: "Cosmetics & Scents",
      mode: "mall",
      barcode: "550001",
      vendor_id: "v0000000-0000-0000-0000-000000000001", // Royal Fragrances
      vendor_name: "Royal Fragrances",
      commission_pct: 15.0, // 15% to Mall/Store, 85% to Vendor
      cost_price: 1800.00,
      retail_price: 3500.00,
      stock: 14,
      unit: "bottle",
      tax_rate: 18.0
    },
    {
      id: "p019",
      name: "Belgian Chocolate Fudge Cake 2lb",
      category: "Artisan Bakery",
      mode: "mall",
      barcode: "550002",
      vendor_id: "v0000000-0000-0000-0000-000000000002", // Artisan Bakery Goods
      vendor_name: "Artisan Bakery Goods",
      commission_pct: 10.0, // 10% to Mall, 90% to Vendor
      cost_price: 900.00,
      retail_price: 1600.00,
      stock: 8,
      unit: "cake",
      tax_rate: 18.0
    }
  ],

  // Cashier Active Shift State
  initial_shift: {
    id: "shift-20261024-001",
    cashier_name: "Cashier Ahmed (Counter 01)",
    opened_at: new Date().toISOString(),
    opening_float: 5000.00, // Rs. 5,000 cash in drawer
    cash_sales: 0.00,
    card_sales: 0.00,
    online_sales: 0.00,
    petty_cash_drops: [
      { time: "09:15 AM", reason: "Shop Electricity & Tea Expense", amount: 450.00 }
    ],
    status: "open"
  }
};
