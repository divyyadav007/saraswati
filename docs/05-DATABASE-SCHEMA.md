# 05-DATABASE-SCHEMA.md

Database: Supabase PostgreSQL. Migrations managed via Alembic from the FastAPI/SQLAlchemy models (models are the source of truth; Supabase's own dashboard table editor is not used to make schema changes in order to keep migrations reproducible). All tables use `uuid` primary keys (`gen_random_uuid()` via `pgcrypto`/`pgcrypto` extension or `uuid_generate_v4()`), `created_at`/`updated_at` (`timestamptz`, default `now()`, `updated_at` maintained by an `ON UPDATE` trigger or ORM `onupdate`), unless stated otherwise.

Naming convention: `snake_case` table and column names, plural table names, singular FK column names ending `_id`.

## 1. Enums

```
user_role:            CUSTOMER | ADMIN | STAFF | DELIVERY
order_status:         PENDING_PAYMENT | PLACED | CONFIRMED | PREPARING | READY_FOR_PICKUP |
                       OUT_FOR_DELIVERY | DELIVERED | CANCELLED | PAYMENT_FAILED | REFUNDED
payment_status:        PENDING | COD_PENDING | CAPTURED | FAILED | REFUNDED
payment_method:        COD | ONLINE
stock_status:          IN_STOCK | OUT_OF_STOCK | LIMITED
coupon_type:           PERCENTAGE | FLAT
order_item_type:       PRODUCT | HAMPER
delivery_slot_status:  ACTIVE | CLOSED
bulk_enquiry_status:   NEW | CONTACTED | QUOTED | WON | LOST
bulk_enquiry_type:     BULK | CORPORATE | WEDDING | OTHER
notification_channel:  PUSH | EMAIL
notification_type:     ORDER_PLACED | ORDER_STATUS_CHANGED | PAYMENT_FAILED | PROMOTIONAL
```

## 2. Tables

### 2.1 `users` (managed by Supabase Auth — `auth.users`)
Not created by our migrations. We reference `auth.users.id` as the canonical user identity. Referenced as `user_id uuid` FK in app tables (`profiles.id = auth.users.id`).

### 2.2 `profiles`
Application-level user data, 1:1 with `auth.users`.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK, FK → auth.users.id | |
| full_name | text | nullable |
| phone | text | unique, nullable if email-only admin account |
| email | text | unique, nullable |
| role | user_role | default `CUSTOMER` |
| is_active | boolean | default true; soft-disable a user |
| fcm_token | text | nullable, latest device push token |
| notif_promotional_opt_in | boolean | default true |
| created_at, updated_at | timestamptz | |

Indexes: unique(phone) where not null, unique(email) where not null, index(role).

### 2.3 `addresses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | not null |
| label | text | e.g. Home/Work/Other |
| recipient_name | text | not null |
| phone | text | not null |
| line1 | text | not null |
| line2 | text | nullable |
| city | text | not null |
| state | text | not null |
| pincode | text | not null |
| landmark | text | nullable |
| latitude | numeric | nullable |
| longitude | numeric | nullable |
| delivery_instructions | text | nullable |
| is_default | boolean | default false |
| is_deleted | boolean | default false (soft delete — addresses referenced by past orders must not hard-delete) |
| created_at, updated_at | | |

Index: (user_id), (pincode).

### 2.4 `categories`
| id, name, slug (unique), description, image_url, parent_id (uuid FK→categories.id, nullable, unused in V1 logic), display_order (int), is_active (bool), created_at, updated_at |

### 2.5 `products`
| id, category_id (FK→categories.id), name, slug (unique), description, tags (text[]), is_active (bool), is_featured (bool), created_at, updated_at |

Index: (category_id), GIN index on `tags`, trigram/ILIKE-friendly index on `name` (pg_trgm extension) for search performance.

### 2.6 `product_variants`
| id, product_id (FK→products.id), label (text, e.g. "500g"), weight_grams (int, nullable), price (numeric(10,2), not null), mrp (numeric(10,2), nullable), sku (text, unique), stock_status (stock_status, default IN_STOCK), stock_quantity (int, nullable), is_active (bool), created_at, updated_at |

Constraint: `price >= 0`; `mrp is null or mrp >= price`. Index: (product_id).

### 2.7 `product_images`
| id, product_id (FK→products.id), url, storage_path, is_primary (bool), display_order (int), created_at |

Constraint: at most one `is_primary=true` per `product_id` (partial unique index).

### 2.8 `inventory`
V1 note: basic stock is tracked directly on `product_variants` (`stock_status`, `stock_quantity`) to avoid overengineering a separate ledger for a shop that mostly manages availability as a simple in/out toggle. A dedicated `inventory` table (with stock movement history) is a documented future upgrade if precise stock-level tracking/auditing becomes necessary — see `25-FUTURE-ROADMAP.md`. If implemented now for completeness:
| id, product_variant_id (FK), change_qty (int), reason (text), reference_order_id (uuid, nullable), created_at |
This is optional for V1; the AI agent should implement the simpler `product_variants` fields first and only add this table if explicitly requested.

### 2.9 `carts`
| id, user_id (FK→profiles.id, unique per active cart — one active cart per user), status (text: ACTIVE/CONVERTED/ABANDONED, default ACTIVE), created_at, updated_at |

### 2.10 `cart_items`
| id, cart_id (FK→carts.id), product_variant_id (FK→product_variants.id, nullable), gift_hamper_id (FK→gift_hampers.id, nullable), quantity (int, >0), added_price_snapshot (numeric, display-only, not trusted at checkout), created_at, updated_at |

Constraint: exactly one of `product_variant_id` / `gift_hamper_id` is not null (`CHECK`). Unique (cart_id, product_variant_id) and (cart_id, gift_hamper_id) to prevent duplicate rows for the same item (increment quantity instead).

### 2.11 `delivery_slots`
| id, slot_date (date), start_time (time), end_time (time), capacity (int), booked_count (int, default 0), cutoff_at (timestamptz — orders must be placed before this to select this slot), status (delivery_slot_status, default ACTIVE), created_at, updated_at |

Unique (slot_date, start_time, end_time). Index (slot_date, status). `booked_count <= capacity` enforced at the application layer within the checkout transaction (row-locked read via `SELECT ... FOR UPDATE`) to avoid overselling a slot under concurrency.

### 2.12 `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | text, unique | human-friendly, e.g. `SW-20260926-0001`, generated server-side |
| user_id | FK → profiles.id | |
| address_id | FK → addresses.id | snapshot fields below duplicated for historical accuracy |
| address_snapshot | jsonb | full address at order time (survives later address edits/deletes) |
| delivery_slot_id | FK → delivery_slots.id, nullable if pickup |
| status | order_status | default `PENDING_PAYMENT` (or `PLACED` for COD) |
| payment_method | payment_method | |
| payment_status | payment_status | |
| subtotal | numeric(10,2) | |
| discount_amount | numeric(10,2) | default 0 |
| delivery_charge | numeric(10,2) | default 0 |
| tax_amount | numeric(10,2) | default 0 |
| total_amount | numeric(10,2) | server-computed, authoritative |
| coupon_id | FK → coupons.id, nullable | |
| special_instructions | text, nullable | |
| packaging_notes | text, nullable | |
| placed_at, confirmed_at, preparing_at, ready_at, out_for_delivery_at, delivered_at, cancelled_at | timestamptz, nullable | set as each transition occurs |
| cancel_reason | text, nullable | |
| idempotency_key | text, nullable, unique when not null | prevents duplicate order creation on retried checkout requests |
| created_at, updated_at | | |

Indexes: (user_id, created_at desc), (status), unique(order_number), unique(idempotency_key) where not null.

### 2.13 `order_items`
| id, order_id (FK→orders.id), item_type (order_item_type), product_variant_id (FK, nullable), gift_hamper_id (FK, nullable), product_name_snapshot (text), variant_label_snapshot (text, nullable), unit_price (numeric), quantity (int), line_total (numeric), created_at |

Constraint: exactly one of `product_variant_id`/`gift_hamper_id` set, matching `item_type`.

### 2.14 `payments`
| id, order_id (FK→orders.id, unique — one payment record per order in V1; a retried failed payment creates a new attempt row instead — see below), razorpay_order_id (text, nullable), razorpay_payment_id (text, nullable), razorpay_signature (text, nullable), amount (numeric), status (payment_status), method (payment_method), raw_webhook_payload (jsonb, nullable — stored for audit/debug), failure_reason (text, nullable), refunded_amount (numeric, default 0), created_at, updated_at |

Note: to properly support multiple payment *attempts* for one order (e.g., first attempt fails, customer retries), V1 keeps it simple with a `payment_attempts` sub-concept modeled as additional rows sharing `order_id` (drop the `unique(order_id)` constraint and instead treat the **latest non-failed** row as authoritative, or add a `payments.attempt_number` if multiple attempts are expected to be common). Default V1 implementation: allow multiple `payments` rows per `order_id`; the order's own `payment_status` is the single source of truth for UI, updated by whichever payment attempt succeeds.

### 2.15 `coupons`
| id, code (text, unique, stored uppercase), type (coupon_type), value (numeric), min_order_value (numeric, default 0), max_discount_amount (numeric, nullable — cap for PERCENTAGE type), usage_limit_total (int, nullable), usage_limit_per_user (int, nullable, default 1), valid_from (timestamptz), valid_until (timestamptz), is_active (bool), created_at, updated_at |

### 2.16 `coupon_usage`
| id, coupon_id (FK), user_id (FK), order_id (FK, unique — one usage record per order), used_at |

### 2.17 `offers`
| id, title, description, image_url, coupon_id (FK, nullable), display_order, is_active, starts_at, ends_at, created_at, updated_at |

### 2.18 `banners`
| id, title, image_url, link_type (text: CATEGORY/PRODUCT/OFFER/URL/NONE), link_value (text, nullable), display_order, is_active, starts_at, ends_at, created_at, updated_at |

### 2.19 `delivery_partners`
V1: minimal — represents shop staff/riders who deliver orders (not a self-service partner app in V1).
| id, name, phone, is_active, created_at, updated_at |

### 2.20 `delivery_assignments`
| id, order_id (FK→orders.id, unique per active assignment), delivery_partner_id (FK), assigned_at, delivered_at (nullable), notes (text, nullable) |

### 2.21 `reviews`
| id, product_id (FK→products.id), user_id (FK), order_id (FK→orders.id — proof of purchase), rating (int, 1–5), comment (text, nullable), is_published (bool, default false), created_at, updated_at |

Constraint: unique (user_id, product_id, order_id) — one review per product per order.

### 2.22 `notifications`
| id, user_id (FK, nullable for broadcast), type (notification_type), channel (notification_channel), title, body, data (jsonb, nullable — deep-link payload), is_read (bool, default false), sent_at, created_at |

### 2.23 `bulk_order_enquiries`
| id, user_id (FK, nullable — enquiry may be submitted without login), name, phone, email (nullable), enquiry_type (bulk_enquiry_type), event_date (date, nullable), estimated_quantity (text, nullable — free text like "50kg" or "200 boxes"), items_of_interest (text, nullable), message (text, nullable), status (bulk_enquiry_status, default NEW), admin_notes (text, nullable), created_at, updated_at |

### 2.24 `gift_hampers`
| id, name, slug (unique), description, hamper_price (numeric), is_active, created_at, updated_at | (images via a shared pattern — either reuse `product_images` with a nullable `gift_hamper_id` and nullable `product_id`, or a small dedicated `gift_hamper_images` table; V1 uses a dedicated `gift_hamper_images` table for clarity.)

### 2.25 `gift_hamper_items`
| id, gift_hamper_id (FK), product_id (FK), product_variant_id (FK), quantity (int) |

### 2.26 `store_settings`
Single-row configuration table (`id` fixed, e.g., always `1`, enforced by a `CHECK (id = 1)` or simply queried with `LIMIT 1` and protected by admin-only update).
| id, store_name, store_phone, store_email, address_text, cod_limit_amount (numeric, default 5000), cod_enabled (bool, default true), tax_enabled (bool, default false), tax_rate_percent (numeric, default 0), delivery_charge_flat (numeric, default 0), free_delivery_above (numeric, nullable), serviceable_pincodes (text[]), max_qty_per_cart_item (int, default 20), business_hours (jsonb), updated_at |

### 2.27 `audit_logs`
| id, actor_user_id (FK, nullable — null for system actions), action (text, e.g. "ORDER_STATUS_CHANGED"), entity_type (text), entity_id (uuid), before_data (jsonb, nullable), after_data (jsonb, nullable), created_at |

Used for admin-action traceability (status changes, refunds, coupon edits) — see `08-SECURITY.md` §Logging and `23-OBSERVABILITY.md`.

## 3. Soft Deletion Policy

Soft-delete (`is_deleted`/`is_active` flag) is used where historical references must survive (addresses, products, categories, coupons). Hard delete is acceptable only for data with no downstream references (e.g., an unused draft banner). Orders and order_items are **never** deleted.

## 4. Row-Level Security (RLS) Note

Since all writes and most reads go through the FastAPI backend using the Supabase **service-role key** (server-side only, never shipped to any frontend), RLS is not the primary access-control mechanism — the FastAPI layer is. RLS is still **enabled** on all tables as defense-in-depth (in case a key ever leaks or a future feature adds direct client reads), with default-deny policies and narrow allow-policies added only if/when a specific direct-client read path is introduced (see `04-ARCHITECTURE.md` §4).

## 5. Migration Workflow

1. Modify SQLAlchemy models in `services/api/app/db/models/`.
2. Generate an Alembic revision: `alembic revision --autogenerate -m "description"`.
3. Review the generated migration file manually (autogenerate is not always correct for enum/constraint changes).
4. Apply locally: `alembic upgrade head`.
5. Apply to staging, verify, then apply to production during a low-traffic window. Full detail in `16-DEPLOYMENT.md`.
