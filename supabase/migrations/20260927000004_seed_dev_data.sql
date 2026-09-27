-- ============================================================
-- Migration: 20260927000004_seed_dev_data.sql
-- Description: Development-only seed data for testing
-- Docs Reference: docs/05-DATABASE-SCHEMA.md, docs/17-FREE-TIER-SERVICES.md
-- ============================================================

-- 1. store_settings
INSERT INTO public.store_settings (
  id,
  store_name,
  store_phone,
  store_email,
  address_text,
  cod_limit_amount,
  cod_enabled,
  tax_enabled,
  tax_rate_percent,
  delivery_charge_flat,
  free_delivery_above,
  serviceable_pincodes,
  max_qty_per_cart_item,
  business_hours
) VALUES (
  1,
  'Saraswati Sweets (Dev Store)',
  '+919999999999',
  'dev@saraswatisweets.example.com',
  'Station Road, Near Clock Tower, Barabanki, Uttar Pradesh 225001',
  5000.00,
  true,
  false,
  0.00,
  50.00,
  500.00,
  ARRAY['225001', '225002', '225003'],
  20,
  '{"open": "08:00", "close": "22:00"}'::JSONB
) ON CONFLICT (id) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  store_phone = EXCLUDED.store_phone,
  delivery_charge_flat = EXCLUDED.delivery_charge_flat,
  free_delivery_above = EXCLUDED.free_delivery_above;

-- 2. categories (c1...)
INSERT INTO public.categories (id, name, slug, description, display_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Traditional Sweets', 'traditional-sweets', 'Timeless classics prepared with pure desi ghee and traditional recipes.', 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Dry Fruit Sweets', 'dry-fruit-sweets', 'Rich cashew, almond and pistachio artisanal confections.', 2, true),
  ('c1000000-0000-0000-0000-000000000003', 'Bengali Delicacies', 'bengali-delicacies', 'Soft and spongy fresh chenna sweets soaked in fragrant syrup.', 3, true),
  ('c1000000-0000-0000-0000-000000000004', 'Festival Hampers', 'festival-hampers', 'Curated luxury gift boxes crafted for celebrations.', 4, true),
  ('c1000000-0000-0000-0000-000000000005', 'Savory & Namkeen', 'savory-namkeen', 'Crisp snacks and traditional savory bites.', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- 3. products (a1...)
INSERT INTO public.products (id, category_id, name, slug, description, tags, is_active, is_featured)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'Kaju Katli',
    'kaju-katli',
    'Signature diamond-cut cashew fudge made with premium Goan cashews and delicate edible silver leaf.',
    ARRAY['dry-fruit', 'cashew', 'bestseller', 'silver-foil'],
    true,
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'Motichoor Laddu',
    'motichoor-laddu',
    'Tender tiny besan pearls fried in pure ghee, scented with cardamom and saffron.',
    ARRAY['pure-ghee', 'traditional', 'festival', 'laddu'],
    true,
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    'Gulab Jamun',
    'gulab-jamun',
    'Golden-fried khoya dumplings steeped in warm rose and cardamom scented sugar syrup.',
    ARRAY['khoya', 'syrup', 'classic'],
    true,
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000003',
    'Rasgulla',
    'rasgulla',
    'Soft, spongy fresh cow-milk chenna balls gently cooked in light sugar syrup.',
    ARRAY['chenna', 'bengali', 'light'],
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000001',
    'Besan Laddu',
    'besan-laddu',
    'Slow-roasted gram flour blended with pure ghee, sugar, and crunchy melon seeds.',
    ARRAY['pure-ghee', 'besan', 'traditional'],
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- 4. product_variants (b1...)
INSERT INTO public.product_variants (id, product_id, label, weight_grams, price, mrp, sku, stock_status, stock_quantity, is_active)
VALUES
  -- Kaju Katli variants
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '250g', 250, 275.00, 300.00, 'KK-250G', 'IN_STOCK', 50, true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '500g', 500, 540.00, 580.00, 'KK-500G', 'IN_STOCK', 40, true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '1kg', 1000, 1050.00, 1150.00, 'KK-1KG', 'IN_STOCK', 25, true),

  -- Motichoor Laddu variants
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', '250g', 250, 160.00, 175.00, 'ML-250G', 'IN_STOCK', 60, true),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', '500g', 500, 310.00, 340.00, 'ML-500G', 'IN_STOCK', 45, true),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', '1kg', 1000, 600.00, 650.00, 'ML-1KG', 'IN_STOCK', 30, true),

  -- Gulab Jamun variants
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', '500g (10 pcs)', 500, 240.00, 260.00, 'GJ-500G', 'IN_STOCK', 35, true),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', '1kg (20 pcs)', 1000, 460.00, 500.00, 'GJ-1KG', 'IN_STOCK', 20, true),

  -- Rasgulla variants
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000004', '500g (8 pcs)', 500, 220.00, 240.00, 'RG-500G', 'IN_STOCK', 30, true),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', '1kg (16 pcs)', 1000, 420.00, 460.00, 'RG-1KG', 'IN_STOCK', 15, true)
ON CONFLICT (sku) DO NOTHING;

-- 5. product_images (d1...)
INSERT INTO public.product_images (id, product_id, url, storage_path, is_primary, display_order)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/product-images/placeholders/kaju-katli.jpg', 'placeholders/kaju-katli.jpg', true, 1),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/product-images/placeholders/motichoor-laddu.jpg', 'placeholders/motichoor-laddu.jpg', true, 1),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/product-images/placeholders/gulab-jamun.jpg', 'placeholders/gulab-jamun.jpg', true, 1),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/product-images/placeholders/rasgulla.jpg', 'placeholders/rasgulla.jpg', true, 1)
ON CONFLICT DO NOTHING;

-- 6. gift_hampers (e1...)
INSERT INTO public.gift_hampers (id, name, slug, description, hamper_price, is_active)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Royal Festive Hamper', 'royal-festive-hamper', 'Artisanal gift box containing 500g Kaju Katli, 500g Motichoor Laddu, and premium roasted cashews.', 1499.00, true),
  ('e1000000-0000-0000-0000-000000000002', 'Celebration Sweet Box', 'celebration-sweet-box', 'Classic celebratory box with 500g Motichoor Laddu and 500g Gulab Jamun.', 899.00, true)
ON CONFLICT (slug) DO NOTHING;

-- 7. gift_hamper_items (e2...)
INSERT INTO public.gift_hamper_items (id, gift_hamper_id, product_id, product_variant_id, quantity)
VALUES
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 1),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 1),
  ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 1),
  ('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000007', 1)
ON CONFLICT DO NOTHING;

-- 8. coupons (f1...)
INSERT INTO public.coupons (id, code, type, value, min_order_value, max_discount_amount, usage_limit_total, usage_limit_per_user, valid_from, valid_until, is_active)
VALUES
  ('f1000000-0000-0000-0000-000000000001', 'WELCOME50', 'FLAT', 50.00, 300.00, NULL, 1000, 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', true),
  ('f1000000-0000-0000-0000-000000000002', 'FESTIVE10', 'PERCENTAGE', 10.00, 500.00, 150.00, 500, 2, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', true)
ON CONFLICT (code) DO NOTHING;

-- 9. offers (f2...)
INSERT INTO public.offers (id, title, description, coupon_id, display_order, is_active, starts_at, ends_at)
VALUES
  ('f2000000-0000-0000-0000-000000000001', 'Flat ₹50 Off on First Order', 'Use coupon WELCOME50 on orders above ₹300.', 'f1000000-0000-0000-0000-000000000001', 1, true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days'),
  ('f2000000-0000-0000-0000-000000000002', 'Free Barabanki City Delivery', 'Enjoy free doorstep delivery on all orders above ₹500.', NULL, 2, true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days')
ON CONFLICT DO NOTHING;

-- 10. banners (ba...)
INSERT INTO public.banners (id, title, image_url, link_type, link_value, display_order, is_active, starts_at, ends_at)
VALUES
  ('ba000000-0000-0000-0000-000000000001', 'Authentic Pure Desi Ghee Sweets', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/banner-images/placeholders/hero-banner.jpg', 'CATEGORY', 'traditional-sweets', 1, true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days'),
  ('ba000000-0000-0000-0000-000000000002', 'Custom Gift Hampers for Every Occasion', 'https://pdovuxqbymgqzvaxcwuk.supabase.co/storage/v1/object/public/banner-images/placeholders/hamper-banner.jpg', 'PRODUCT', 'royal-festive-hamper', 2, true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days')
ON CONFLICT DO NOTHING;

-- 11. delivery_partners (de...)
INSERT INTO public.delivery_partners (id, name, phone, is_active)
VALUES
  ('de000000-0000-0000-0000-000000000001', 'Ramesh Kumar (Staff Rider 1)', '+919876543210', true),
  ('de000000-0000-0000-0000-000000000002', 'Suresh Verma (Staff Rider 2)', '+919876543211', true)
ON CONFLICT DO NOTHING;

-- 12. delivery_slots (today + next 3 days)
DO $$
DECLARE
  d DATE;
BEGIN
  FOR i IN 0..3 LOOP
    d := CURRENT_DATE + i;
    
    INSERT INTO public.delivery_slots (slot_date, start_time, end_time, capacity, booked_count, cutoff_at, status)
    VALUES
      (d, '10:00:00'::TIME, '13:00:00'::TIME, 15, 0, (d || ' 08:00:00')::TIMESTAMPTZ, 'ACTIVE'),
      (d, '14:00:00'::TIME, '17:00:00'::TIME, 15, 0, (d || ' 12:00:00')::TIMESTAMPTZ, 'ACTIVE'),
      (d, '17:00:00'::TIME, '20:00:00'::TIME, 15, 0, (d || ' 15:00:00')::TIMESTAMPTZ, 'ACTIVE')
    ON CONFLICT (slot_date, start_time, end_time) DO NOTHING;
  END LOOP;
END $$;
