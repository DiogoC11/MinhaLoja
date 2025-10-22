"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = { id: string; qty: number };
export type CartState = Record<string, CartItem>;

const CART_KEY = 'minha-loja:carrinho';

function loadCart(): CartState {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch { return {}; }
}
function saveCart(c: CartState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(c));
}

const Ctx = createContext<{
  cart: CartState;
  add: (id: string) => void;
  dec: (id: string) => void;
  del: (id: string) => void;
  count: number;
}>({ cart: {}, add: () => {}, dec: () => {}, del: () => {}, count: 0 });

export function CartProvider({ children }: { children: React.ReactNode }){
  const [cart, setCart] = useState<CartState>({});

  useEffect(() => { setCart(loadCart()); }, []);
  useEffect(() => { saveCart(cart); }, [cart]);

  const api = useMemo(() => ({
    cart,
    add: (id: string) => setCart((c: CartState) => ({ ...c, [id]: { id, qty: (c[id]?.qty || 0) + 1 } })),
    dec: (id: string) => setCart((c: CartState) => {
      const qty = (c[id]?.qty || 0) - 1;
      const n: CartState = { ...c };
      if (qty <= 0) delete n[id]; else n[id] = { id, qty };
      return n;
    }),
    del: (id: string) => setCart((c: CartState) => { const n: CartState = { ...c }; delete n[id]; return n; }),
    count: (Object.values(cart) as CartItem[]).reduce((a, i) => a + i.qty, 0),
  }), [cart]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(){ return useContext(Ctx); }
