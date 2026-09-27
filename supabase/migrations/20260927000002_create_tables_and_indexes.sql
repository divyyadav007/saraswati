-- ============================================================
-- Migration: 20260927000002_create_tables_and_indexes.sql
-- Description: Core schema tables, constraints, foreign keys, and indexes
-- Docs Reference: docs/05-DATABASE-SCHEMA.md §2
-- ============================================================

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  fcm_token TEXT,
  notif_promotional_opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Auth Trigger: automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, role)
  VALUES (
    NEW.id,
    NULLIF(NEW.phone, ''),
    NULLIF(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NULLIF(NEW.raw_app_meta_data->>'role', ''))::user_role, 'CUSTOMER'::user_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  delivery_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON public.addresses(pincode);

-- 3. categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN(name gin_trgm_ops);

-- 5. product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight_grams INT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  mrp NUMERIC(10, 2) CHECK (mrp IS NULL OR mrp >= price),
  sku TEXT UNIQUE,
  stock_status stock_status NOT NULL DEFAULT 'IN_STOCK',
  stock_quantity INT CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- 6. product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id) WHERE (is_primary = true);

-- 7. gift_hampers
CREATE TABLE IF NOT EXISTS public.gift_hampers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  hamper_price NUMERIC(10, 2) NOT NULL CHECK (hamper_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. gift_hamper_images
CREATE TABLE IF NOT EXISTS public.gift_hamper_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_hamper_id UUID NOT NULL REFERENCES public.gift_hampers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_hamper_images_primary ON public.gift_hamper_images(gift_hamper_id) WHERE (is_primary = true);

-- 9. gift_hamper_items
CREATE TABLE IF NOT EXISTS public.gift_hamper_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_hamper_id UUID NOT NULL REFERENCES public.gift_hampers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

-- 10. carts
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONVERTED', 'ABANDONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_active_user ON public.carts(user_id) WHERE (status = 'ACTIVE');

-- 11. cart_items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  gift_hamper_id UUID REFERENCES public.gift_hampers(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  added_price_snapshot NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_item_type CHECK (
    (product_variant_id IS NOT NULL AND gift_hamper_id IS NULL) OR
    (product_variant_id IS NULL AND gift_hamper_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_variant ON public.cart_items(cart_id, product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_hamper ON public.cart_items(cart_id, gift_hamper_id) WHERE gift_hamper_id IS NOT NULL;

-- 12. delivery_slots
CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT NOT NULL CHECK (capacity >= 0),
  booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  cutoff_at TIMESTAMPTZ NOT NULL,
  status delivery_slot_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slot_date, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_delivery_slots_date_status ON public.delivery_slots(slot_date, status);

-- 13. coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type coupon_type NOT NULL,
  value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
  min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  max_discount_amount NUMERIC(10, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  usage_limit_total INT CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  usage_limit_per_user INT NOT NULL DEFAULT 1 CHECK (usage_limit_per_user > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  address_snapshot JSONB NOT NULL,
  delivery_slot_id UUID REFERENCES public.delivery_slots(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  special_instructions TEXT,
  packaging_notes TEXT,
  placed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 15. order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type order_item_type NOT NULL,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  gift_hamper_id UUID REFERENCES public.gift_hampers(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  variant_label_snapshot TEXT,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_order_item_type CHECK (
    (product_variant_id IS NOT NULL AND gift_hamper_id IS NULL AND item_type = 'PRODUCT') OR
    (product_variant_id IS NULL AND gift_hamper_id IS NOT NULL AND item_type = 'HAMPER')
  )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 16. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status payment_status NOT NULL,
  method payment_method NOT NULL,
  raw_webhook_payload JSONB,
  failure_reason TEXT,
  refunded_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);

-- 17. processed_webhook_events
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. coupon_usage
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_coupon ON public.coupon_usage(coupon_id, user_id);

-- 19. offers
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. banners
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'NONE' CHECK (link_type IN ('CATEGORY', 'PRODUCT', 'OFFER', 'URL', 'NONE')),
  link_value TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. delivery_partners
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. delivery_assignments
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  notes TEXT
);

-- 23. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_published ON public.reviews(product_id) WHERE is_published = true;

-- 24. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- 25. bulk_order_enquiries
CREATE TABLE IF NOT EXISTS public.bulk_order_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  enquiry_type bulk_enquiry_type NOT NULL,
  event_date DATE,
  estimated_quantity TEXT,
  items_of_interest TEXT,
  message TEXT,
  status bulk_enquiry_status NOT NULL DEFAULT 'NEW',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_enquiries_status ON public.bulk_order_enquiries(status);

-- 26. store_settings (single-row table)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Saraswati Sweets',
  store_phone TEXT NOT NULL DEFAULT '+919999999999',
  store_email TEXT NOT NULL DEFAULT 'info@saraswatisweets.com',
  address_text TEXT NOT NULL DEFAULT 'Barabanki, Uttar Pradesh',
  cod_limit_amount NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
  cod_enabled BOOLEAN NOT NULL DEFAULT true,
  tax_enabled BOOLEAN NOT NULL DEFAULT false,
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  delivery_charge_flat NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  free_delivery_above NUMERIC(10, 2),
  serviceable_pincodes TEXT[] NOT NULL DEFAULT '{"225001", "225002", "225003"}'::TEXT[],
  max_qty_per_cart_item INT NOT NULL DEFAULT 20,
  business_hours JSONB NOT NULL DEFAULT '{"open": "08:00", "close": "22:00"}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Attach updated_at triggers
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'addresses', 'categories', 'products', 'product_variants',
    'gift_hampers', 'carts', 'cart_items', 'delivery_slots', 'coupons',
    'orders', 'payments', 'offers', 'banners', 'delivery_partners',
    'reviews', 'bulk_order_enquiries', 'store_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t);
  END LOOP;
END $$;
