import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  state: string;
  payment_ref?: string;
  payment_method?: string;
}

interface CartState {
  session: CartSession | null;
  items: CartItem[];
  savedItems: CartItem[];
  loading: boolean;
  error: string | null;
  initializeSession: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  saveForLater: (productId: string) => Promise<void>;
  moveToCart: (productId: string) => Promise<void>;
  fetchCart: () => Promise<void>;
  clearCart: () => Promise<void>;
  processPayment: (total: number, deliveryDetails?: DeliveryDetails) => Promise<any>;
}

interface CartSession {
  id: string;
  user_id: string;
  status: string;
}

interface CartItem {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  price_snapshot: number;
  is_saved_for_later: boolean;
  product: Product;
}

const useCartStore = create<CartState>((set, get) => ({
  session: null,
  items: [],
  savedItems: [],
  loading: false,
  error: null,

  initializeSession: async () => {
    try {
      // First check if we have a valid auth session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.user) {
        set({ session: null, items: [], savedItems: [] });
        return;
      }

      // Then check for existing shopping session
      const { data: existingSession } = await supabase
        .from('shopping_sessions')
        .select('*')
        .eq('user_id', authSession.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSession) {
        set({ session: existingSession });
        return;
      }

      // Create new session if none exists
      const { data: newSession } = await supabase
        .from('shopping_sessions')
        .insert([{ 
          user_id: authSession.user.id, 
          status: 'active' 
        }])
        .select()
        .single();

      if (newSession) {
        set({ session: newSession });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      set({ session: null, items: [], savedItems: [] });
    }
  },

  fetchCart: async () => {
    try {
      // Check auth session first
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.user) {
        set({ items: [], savedItems: [], session: null });
        return;
      }

      // Initialize session if needed
      if (!get().session) {
        await get().initializeSession();
      }

      // Get the current session after initialization
      const currentSession = get().session;
      if (!currentSession?.id) {
        set({ items: [], savedItems: [] });
        return;
      }

      const { data: cartItems } = await supabase
        .from('cart_items_new')
        .select(`
          *,
          product:products(*)
        `)
        .eq('session_id', currentSession.id);

      // Filter out any invalid items
      const validCartItems = (cartItems || []).filter(item => item && item.product);

      const items = validCartItems
        .filter(item => !item.is_saved_for_later)
        .map(item => ({
          ...item,
          product: item.product
        }));

      const savedItems = validCartItems
        .filter(item => item.is_saved_for_later)
        .map(item => ({
          ...item,
          product: item.product
        }));

      set({ items, savedItems });
    } catch (error) {
      console.error('Error fetching cart:', error);
      // Don't clear items on error, just log it
    }
  },

  addToCart: async (product: Product, quantity = 1) => {
    try {
      set({ loading: true });
      
      if (!get().session) {
        await get().initializeSession();
      }

      const currentSession = get().session;
      if (!currentSession?.id) {
        throw new Error('No active session');
      }

      const { data: existingItems } = await supabase
        .from('cart_items_new')
        .select('*')
        .eq('session_id', currentSession.id)
        .eq('product_id', product.id);

      if (existingItems?.[0]) {
        await supabase
          .from('cart_items_new')
          .update({ 
            quantity: existingItems[0].quantity + quantity,
            is_saved_for_later: false,
            price_snapshot: product.price
          })
          .eq('id', existingItems[0].id);
      } else {
        await supabase
          .from('cart_items_new')
          .insert([{
            session_id: currentSession.id,
            product_id: product.id,
            quantity,
            price_snapshot: product.price,
            is_saved_for_later: false
          }]);
      }

      await get().fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  removeFromCart: async (productId: string) => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) return;

      await supabase
        .from('cart_items_new')
        .delete()
        .eq('session_id', currentSession.id)
        .eq('product_id', productId);

      await get().fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (productId: string, quantity: number) => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) return;

      if (quantity <= 0) {
        await get().removeFromCart(productId);
        return;
      }

      await supabase
        .from('cart_items_new')
        .update({ quantity })
        .eq('session_id', currentSession.id)
        .eq('product_id', productId);

      await get().fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      set({ loading: false });
    }
  },

  saveForLater: async (productId: string) => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) return;

      await supabase
        .from('cart_items_new')
        .update({ is_saved_for_later: true })
        .eq('session_id', currentSession.id)
        .eq('product_id', productId);

      await get().fetchCart();
    } catch (error) {
      console.error('Error saving for later:', error);
    } finally {
      set({ loading: false });
    }
  },

  moveToCart: async (productId: string) => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) return;

      await supabase
        .from('cart_items_new')
        .update({ is_saved_for_later: false })
        .eq('session_id', currentSession.id)
        .eq('product_id', productId);

      await get().fetchCart();
    } catch (error) {
      console.error('Error moving to cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) return;

      await supabase
        .from('cart_items_new')
        .delete()
        .eq('session_id', currentSession.id);

      set({ items: [], savedItems: [] });
    } catch (error) {
      console.error('Error clearing cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  processPayment: async (total: number, deliveryDetails?: DeliveryDetails) => {
    try {
      set({ loading: true });
      const currentSession = get().session;
      if (!currentSession?.id) {
        throw new Error('No active session');
      }

      const orderData = {
        user_id: currentSession.user_id,
        total,
        status: 'pending',
        delivery_name: deliveryDetails?.name,
        delivery_phone: deliveryDetails?.phone,
        delivery_address: deliveryDetails?.address,
        delivery_state: deliveryDetails?.state,
        payment_ref: deliveryDetails?.payment_ref,
        payment_method: deliveryDetails?.payment_method
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      const cartItems = get().items;
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price_snapshot
      }));

      await supabase
        .from('order_items')
        .insert(orderItems);

      return order;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));

export { useCartStore };