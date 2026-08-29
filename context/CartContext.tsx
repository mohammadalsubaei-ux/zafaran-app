import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "cart_state";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  chef_id: string;
  chef_name: string;
  image_url?: string | null;
  status?: string; // available | preorder — تحدد إظهار منتقي وقت الحجز بالسلة
}

interface CartContextType {
  items: CartItem[];
  chef_id: string | null;
  chef_name: string | null;
  addItem: (item: CartItem) => boolean;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [chef_id, setChefId] = useState<string | null>(null);
  const [chef_name, setChefName] = useState<string | null>(null);

  // كانت السلة في الذاكرة فقط — من أغلق التطبيق للحظة يعود ويجدها فارغة،
  // وهذا طلب ضائع لا مجرد إزعاج.
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved?.items) && saved.items.length > 0) {
          setItems(saved.items);
          setChefId(saved.chef_id || null);
          setChefName(saved.chef_name || null);
        }
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, []);

  useEffect(() => {
    // لا نكتب قبل انتهاء القراءة، وإلا محونا السلة المحفوظة بحالة فارغة
    if (!loaded.current) return;

    AsyncStorage.setItem(
      CART_KEY,
      JSON.stringify({ items, chef_id, chef_name })
    ).catch(() => {});
  }, [items, chef_id, chef_name]);

  const addItem = useCallback((item: CartItem) => {
    if (chef_id && chef_id !== item.chef_id) {
      return false;
    }

    setChefId(item.chef_id);
    setChefName(item.chef_name);

    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);

      if (existing) {
        return prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                image_url: i.image_url || item.image_url || null,
              }
            : i
        );
      }

      return [
        ...prev,
        {
          ...item,
          quantity: item.quantity || 1,
          image_url: item.image_url || null,
        },
      ];
    });

    return true;
  }, [chef_id]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);

      if (updated.length === 0) {
        setChefId(null);
        setChefName(null);
      }

      return updated;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }

    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, quantity: qty }
          : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setChefId(null);
    setChefName(null);
    AsyncStorage.removeItem(CART_KEY).catch(() => {});
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        chef_id,
        chef_name,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        total,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }

  return ctx;
}