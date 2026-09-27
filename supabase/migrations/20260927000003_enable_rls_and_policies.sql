-- ============================================================
-- Migration: 20260927000003_enable_rls_and_policies.sql
-- Description: Enable RLS and define defense-in-depth access policies
-- Docs Reference: docs/05-DATABASE-SCHEMA.md §4, docs/08-SECURITY.md §2
-- ============================================================

-- Helper functions for role checking
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. Enable RLS on all 27 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_hampers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_hamper_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_hamper_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. profiles policies
CREATE POLICY "Users can read own profile or staff can read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_or_staff());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3. addresses policies
CREATE POLICY "Users can read own non-deleted addresses or staff"
  ON public.addresses FOR SELECT
  USING ((auth.uid() = user_id AND NOT is_deleted) OR public.is_admin_or_staff());

CREATE POLICY "Users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- 4. categories, products, product_variants, product_images
CREATE POLICY "Public read active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage products"
  ON public.products FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read active product variants"
  ON public.product_variants FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage product variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read product images"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Admin/staff manage product images"
  ON public.product_images FOR ALL
  USING (public.is_admin_or_staff());

-- 5. gift hampers
CREATE POLICY "Public read active gift hampers"
  ON public.gift_hampers FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage gift hampers"
  ON public.gift_hampers FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read gift hamper images"
  ON public.gift_hamper_images FOR SELECT
  USING (true);

CREATE POLICY "Admin/staff manage gift hamper images"
  ON public.gift_hamper_images FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read gift hamper items"
  ON public.gift_hamper_items FOR SELECT
  USING (true);

CREATE POLICY "Admin/staff manage gift hamper items"
  ON public.gift_hamper_items FOR ALL
  USING (public.is_admin_or_staff());

-- 6. carts & cart_items
CREATE POLICY "Users can manage own cart"
  ON public.carts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart items"
  ON public.cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- 7. delivery_slots
CREATE POLICY "Public read active delivery slots"
  ON public.delivery_slots FOR SELECT
  USING (status = 'ACTIVE' OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage delivery slots"
  ON public.delivery_slots FOR ALL
  USING (public.is_admin_or_staff());

-- 8. coupons
CREATE POLICY "Public read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_staff());

-- 9. orders & order_items
CREATE POLICY "Users view own orders or staff view all"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Users view own order items or staff view all"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin_or_staff())
    )
  );

-- 10. payments
CREATE POLICY "Users view payments for own orders or staff"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin_or_staff())
    )
  );

-- 11. offers & banners
CREATE POLICY "Public read active offers"
  ON public.offers FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage offers"
  ON public.offers FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Public read active banners"
  ON public.banners FOR SELECT
  USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage banners"
  ON public.banners FOR ALL
  USING (public.is_admin_or_staff());

-- 12. delivery_partners & assignments
CREATE POLICY "Admin/staff manage delivery partners"
  ON public.delivery_partners FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Admin/staff manage delivery assignments"
  ON public.delivery_assignments FOR ALL
  USING (public.is_admin_or_staff());

-- 13. reviews
CREATE POLICY "Public read published reviews, users read own"
  ON public.reviews FOR SELECT
  USING (is_published = true OR auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin/staff manage reviews"
  ON public.reviews FOR UPDATE
  USING (public.is_admin_or_staff());

-- 14. notifications
CREATE POLICY "Users can view and update own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 15. bulk_order_enquiries
CREATE POLICY "Anyone can submit bulk order enquiry"
  ON public.bulk_order_enquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users view own enquiries or admin/staff view all"
  ON public.bulk_order_enquiries FOR SELECT
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    public.is_admin_or_staff()
  );

CREATE POLICY "Admin/staff manage bulk enquiries"
  ON public.bulk_order_enquiries FOR UPDATE
  USING (public.is_admin_or_staff());

-- 16. store_settings
CREATE POLICY "Public read store settings"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin update store settings"
  ON public.store_settings FOR UPDATE
  USING (public.is_admin());

-- 17. audit_logs
CREATE POLICY "Admin view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());
