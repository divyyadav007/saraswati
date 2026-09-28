"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { cartApi, CartItemModel, CartModel } from "@/lib/api-client";

interface LocalCartItem {
  item_type?: "PRODUCT" | "HAMPER";
  product_variant_id?: string | null;
  gift_hamper_id?: string | null;
  product_id?: string | null;
  product_name: string;
  product_slug: string;
  variant_label: string;
  unit_price: number;
  quantity: number;
  image_url?: string | null;
}

interface CartContextType {
  cart: CartModel | null;
  guestItems: LocalCartItem[];
  itemsCount: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  isLoading: boolean;
  addItem: (item: {
    item_type?: "PRODUCT" | "HAMPER";
    product_variant_id?: string | null;
    gift_hamper_id?: string | null;
    product_id?: string | null;
    product_name: string;
    product_slug: string;
    variant_label: string;
    unit_price: number;
    quantity?: number;
    image_url?: string | null;
  }) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  mergeGuestCart: (token: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "saraswati_guest_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartModel | null>(null);
  const [guestItems, setGuestItems] = useState<LocalCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token") || null;
  };

  const refreshCart = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setIsLoading(true);
      const data = await cartApi.getCart(token);
      setCart(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Load guest cart or server cart on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      refreshCart();
    } else {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          // Add a small delay to avoid synchronous state update warning during mount
          setTimeout(() => setGuestItems(JSON.parse(stored)), 0);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save guest items to localStorage
  useEffect(() => {
    const token = getAuthToken();
    if (!token && typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(guestItems));
    }
  }, [guestItems]);

  const mergeGuestCart = async (token: string) => {
    if (guestItems.length === 0) return;
    try {
      setIsLoading(true);
      const itemsToMerge = guestItems.map((i) => ({
        product_variant_id: i.product_variant_id || undefined,
        gift_hamper_id: i.gift_hamper_id || undefined,
        quantity: i.quantity,
      }));
      await cartApi.mergeCart(itemsToMerge, token);
      setGuestItems([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      await refreshCart();
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: {
    item_type?: "PRODUCT" | "HAMPER";
    product_variant_id?: string | null;
    gift_hamper_id?: string | null;
    product_id?: string | null;
    product_name: string;
    product_slug: string;
    variant_label: string;
    unit_price: number;
    quantity?: number;
    image_url?: string | null;
  }) => {
    const qty = item.quantity || 1;
    const token = getAuthToken();

    if (token) {
      try {
        setIsLoading(true);
        const updated = await cartApi.addItem(
          {
            productVariantId: item.product_variant_id || undefined,
            giftHamperId: item.gift_hamper_id || undefined,
            quantity: qty,
          },
          token
        );
        setCart(updated);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to add to cart");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Guest cart update
      setGuestItems((prev) => {
        const itemKey = item.gift_hamper_id || item.product_variant_id;
        const existingIdx = prev.findIndex(
          (i) => (i.gift_hamper_id || i.product_variant_id) === itemKey
        );
        if (existingIdx > -1) {
          const copy = [...prev];
          copy[existingIdx].quantity = Math.min(50, copy[existingIdx].quantity + qty);
          return copy;
        } else {
          return [
            ...prev,
            {
              item_type: item.item_type || (item.gift_hamper_id ? "HAMPER" : "PRODUCT"),
              product_variant_id: item.product_variant_id,
              gift_hamper_id: item.gift_hamper_id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_slug: item.product_slug,
              variant_label: item.variant_label,
              unit_price: item.unit_price,
              quantity: qty,
              image_url: item.image_url,
            },
          ];
        }
      });
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    const token = getAuthToken();
    if (token) {
      try {
        setIsLoading(true);
        const updated = await cartApi.updateQuantity(id, quantity, token);
        setCart(updated);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to update item");
      } finally {
        setIsLoading(false);
      }
    } else {
      setGuestItems((prev) => {
        if (quantity <= 0) {
          return prev.filter((i) => (i.gift_hamper_id || i.product_variant_id) !== id);
        }
        return prev.map((i) =>
          (i.gift_hamper_id || i.product_variant_id) === id
            ? { ...i, quantity: Math.min(50, quantity) }
            : i
        );
      });
    }
  };

  const removeItem = async (id: string) => {
    const token = getAuthToken();
    if (token) {
      try {
        setIsLoading(true);
        const updated = await cartApi.removeItem(id, token);
        setCart(updated);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to remove item");
      } finally {
        setIsLoading(false);
      }
    } else {
      setGuestItems((prev) =>
        prev.filter((i) => (i.gift_hamper_id || i.product_variant_id) !== id)
      );
    }
  };

  // Aggregated totals
  const token = getAuthToken();
  const itemsCount = token
    ? cart?.items_count || 0
    : guestItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = token
    ? cart?.subtotal || 0
    : guestItems.reduce((acc, curr) => acc + curr.unit_price * curr.quantity, 0);

  const deliveryCharge = subtotal >= 500 || subtotal === 0 ? 0 : 40;
  const total = subtotal + deliveryCharge;

  return (
    <CartContext.Provider
      value={{
        cart,
        guestItems,
        itemsCount,
        subtotal,
        deliveryCharge,
        total,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        refreshCart,
        mergeGuestCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
