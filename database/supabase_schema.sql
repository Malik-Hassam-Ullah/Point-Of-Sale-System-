-- =========================================================================
-- UNIVERSAL MULTI-TENANT CLOUD POS, FRANCHISE & MULTI-VENDOR MALL ERP
-- MASTER SUPABASE (POSTGRESQL 16) DATABASE SCHEMA WITH ROW LEVEL SECURITY
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. TENANTS (SaaS Subscriptions & Brands)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_mode VARCHAR(50) NOT NULL DEFAULT 'micro_retail' 
        CHECK (business_mode IN ('micro_retail', 'supermarket', 'fashion', 'pharmacy', 'restaurant', 'mall')),
    plan_id VARCHAR(50) NOT NULL DEFAULT 'standard' 
        CHECK (plan_id IN ('starter', 'standard', 'franchise_pro', 'enterprise_mall')),
    enabled_modules JSONB NOT NULL DEFAULT '{
        "multi_branch": false,
        "fbr_pos": false,
        "consignment_splits": false,
        "pharmacy_fefo": false,
        "restaurant_kot": false,
        "khata_udhaar": true,
        "whatsapp_invoicing": true
    }'::jsonb,
    fbr_enabled BOOLEAN NOT NULL DEFAULT false,
    fbr_pos_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. BRANCHES (Stores, Outlets, & Central Warehouses)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL,
    is_warehouse BOOLEAN NOT NULL DEFAULT false,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Lahore',
    phone VARCHAR(50),
    tax_ntn VARCHAR(50),
    fbr_pos_id VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, branch_code)
);

-- -------------------------------------------------------------------------
-- 3. VENDORS & CONSIGNMENT PARTNERS (For Malls & Department Stores)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'consignment' 
        CHECK (type IN ('supplier', 'mall_subtenant', 'consignment')),
    commission_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    rent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    wallet_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    phone VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 4. USERS & ROLES (4-Tier Hierarchy & Granular RBAC)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'tenant_owner', 'branch_manager', 'cashier', 'vendor')),
    permissions JSONB NOT NULL DEFAULT '{"can_void_item": false, "can_give_discount": false, "max_discount_pct": 5}'::jsonb,
    max_discount_pct NUMERIC(5,2) DEFAULT 5.00,
    pin_hash VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 5. PRODUCT CATEGORIES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 6. PRODUCTS (Master Catalog)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255), -- For Pharmacy Salt/Formula lookup
    sku VARCHAR(100),
    barcode VARCHAR(100) NOT NULL,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'piece' CHECK (unit_type IN ('piece', 'carton', 'box', 'strip', 'kg', 'gram', 'litre')),
    pieces_per_carton INT DEFAULT 1,
    has_variants BOOLEAN NOT NULL DEFAULT false,
    track_expiry BOOLEAN NOT NULL DEFAULT false,
    is_recipe BOOLEAN NOT NULL DEFAULT false,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00, -- Standard General Sales Tax (GST)
    fbr_pct_code VARCHAR(20) DEFAULT '1001',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, barcode)
);

-- -------------------------------------------------------------------------
-- 7. PRODUCT VARIANTS (Fashion Matrix: Size × Color × Style)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    variant_name VARCHAR(150) NOT NULL, -- e.g. "Size: L | Color: Navy Blue"
    barcode VARCHAR(100) NOT NULL,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_stock_alert INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, barcode)
);

-- -------------------------------------------------------------------------
-- 8. INVENTORY BATCHES (Pharmacy FEFO & Branch Stock)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    batch_no VARCHAR(100) NOT NULL DEFAULT 'DEFAULT-BATCH',
    expiry_date DATE,
    qty_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 9. APPEND-ONLY STOCK MOVEMENTS (Auditable Inventory Ledger)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
    qty_change NUMERIC(12,3) NOT NULL, -- Positive for intake/purchase, negative for sale
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sale', 'purchase', 'transfer_out', 'transfer_in', 'wastage', 'return', 'adjustment')),
    reference_id VARCHAR(100),
    created_by UUID REFERENCES users_roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 10. CASH REGISTERS & SHIFTS (Blind Z-Report Reconciliation)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    register_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'online'
);

CREATE TABLE IF NOT EXISTS cash_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_id UUID NOT NULL REFERENCES pos_registers(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES users_roles(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    counted_cash_at_close NUMERIC(12,2),
    expected_cash_at_close NUMERIC(12,2),
    cash_variance NUMERIC(12,2), -- Shortage or Overage
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'verified')),
    closing_notes TEXT
);

-- -------------------------------------------------------------------------
-- 11. CUSTOMERS & UDHAAR KHATA (Credit Limits & WhatsApp Reminders)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 15000.00,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Amount owed to store
    loyalty_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 12. SALES INVOICES (FBR POS Integration & Split Payments)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    register_id UUID REFERENCES pos_registers(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES cash_shifts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100) NOT NULL, -- e.g. BR01-POS1-20261024-0042
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fbr_invoice_no VARCHAR(100),
    fbr_qr_code TEXT,
    fbr_status VARCHAR(50) DEFAULT 'unregistered',
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 13. SALE ITEMS & MULTI-VENDOR COMMISSION SPLITS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    qty NUMERIC(10,3) NOT NULL DEFAULT 1.000,
    unit_price NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_total NUMERIC(12,2) NOT NULL,
    mall_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    vendor_earning NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 14. INTER-BRANCH STOCK TRANSFERS (4-Stage Chain with In-Transit Safety)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    dest_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    transfer_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'requested' 
        CHECK (status IN ('requested', 'dispatched_in_transit', 'received_grn_verified', 'rejected')),
    gate_pass_no VARCHAR(100),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 15. AUTOMATED DOUBLE-ENTRY GENERAL LEDGER (Zero Manual Entry)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'payout', 'expense'
    reference_id VARCHAR(100) NOT NULL,
    account_code VARCHAR(50) NOT NULL, -- e.g. 1001 Cash, 4001 Sales, 5001 COGS
    account_name VARCHAR(150) NOT NULL,
    debit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Branch A Cashier cannot see Branch B or Other Tenants
-- -------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_invoices ON sales_invoices
    FOR ALL USING (tenant_id = (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_products ON products
    FOR ALL USING (tenant_id = (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id')::uuid);

-- =========================================================================
-- SEED DATA: 1 Organization, 2 Branches (HQ Warehouse + Mall Branch),
-- Sample Products, Variants, and Multi-Vendor Consignment Partners
-- =========================================================================
INSERT INTO tenants (id, name, business_mode, plan_id, fbr_enabled)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Al-Madina Mega Retailers & Mall', 'supermarket', 'enterprise_mall', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, tenant_id, name, branch_code, is_warehouse, city, address)
VALUES 
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Central Distribution Warehouse', 'WH-01', true, 'Lahore', 'Industrial Area, Kot Lakhpat'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mall Outlet - Cash Counter 01', 'BR-DHA', false, 'Lahore', 'DHA Phase 5 Mall')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (id, tenant_id, vendor_name, type, commission_pct, wallet_balance)
VALUES
('v0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Royal Fragrances (Consignment)', 'consignment', 15.00, 18450.00),
('v0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Artisan Bakery Goods', 'mall_subtenant', 10.00, 9200.00)
ON CONFLICT (id) DO NOTHING;
