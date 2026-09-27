-- ============================================================
-- Migration: 20260927000001_create_enums_and_extensions.sql
-- Description: Core PostgreSQL extensions, custom enums, and triggers
-- Docs Reference: docs/05-DATABASE-SCHEMA.md §1
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. user_role
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN', 'STAFF', 'DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. order_status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING_PAYMENT',
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'PAYMENT_FAILED',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. payment_status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'COD_PENDING',
    'CAPTURED',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. payment_method
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('COD', 'ONLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. stock_status
DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'LIMITED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. coupon_type
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('PERCENTAGE', 'FLAT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. order_item_type
DO $$ BEGIN
  CREATE TYPE order_item_type AS ENUM ('PRODUCT', 'HAMPER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. delivery_slot_status
DO $$ BEGIN
  CREATE TYPE delivery_slot_status AS ENUM ('ACTIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. bulk_enquiry_status
DO $$ BEGIN
  CREATE TYPE bulk_enquiry_status AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. bulk_enquiry_type
DO $$ BEGIN
  CREATE TYPE bulk_enquiry_type AS ENUM ('BULK', 'CORPORATE', 'WEDDING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. notification_channel
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('PUSH', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 12. notification_type
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'ORDER_PLACED',
    'ORDER_STATUS_CHANGED',
    'PAYMENT_FAILED',
    'PROMOTIONAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
