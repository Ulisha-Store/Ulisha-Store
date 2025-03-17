import { useEffect, useState } from 'react';
import { Package, Loader, Eye, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import { OrderReceipt } from '../components/OrderReceipt';

interface OrderItem {
  id: string;
  product: {
    name: string;
    image: string;
  };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  payment_ref?: string;
  payment_method?: string;
  items: OrderItem[];
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetchOrders();
      
      // Check for successful order from URL parameters
      const queryParams = new URLSearchParams(location.search);
      const orderSuccess = queryParams.get('order_success');
      const txRef = queryParams.get('tx_ref');
      const orderId = queryParams.get('order_id');
      
      if (orderSuccess === 'true') {
        setShowSuccessMessage(true);
        
        // Clear URL parameters after 5 seconds
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 5000);
        
        if (txRef) {
          setTransactionRef(txRef);
          // Find the latest order to show receipt
          setTimeout(() => {
            fetchLatestOrder(txRef);
          }, 1000); // Small delay to ensure the order is in the database
        } else if (orderId) {
          // Find the order by ID
          setTimeout(() => {
            fetchOrderById(orderId);
          }, 1000);
        }
      }
    }
  }, [user, location.search]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            price,
            product:products(
              name,
              image
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestOrder = async (txRef: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            price,
            product:products(
              name,
              image
            )
          )
        `)
        .eq('user_id', user?.id)
        .eq('payment_ref', txRef)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching order by txRef:', error);
        return;
      }

      if (data) {
        setSelectedOrder(data);
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Error fetching latest order:', error);
    }
  };

  const fetchOrderById = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            price,
            product:products(
              name,
              image
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order by ID:', error);
        return;
      }

      if (data) {
        setSelectedOrder(data);
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Error fetching order by ID:', error);
    }
  };

  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setSelectedOrder(null);
  };

  const getPaymentStatusBadge = (order: Order) => {
    if (order.payment_ref && order.payment_ref !== 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="w-3 h-3 mr-1" />
          Paid
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Your order has been placed successfully! Thank you for shopping with Ulisha Store.
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setShowSuccessMessage(false)}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500">When you make a purchase, your orders will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN'
                          }).format(order.total)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPaymentStatusBadge(order)}
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  {(order.payment_method || order.payment_ref) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Information</h4>
                      {order.payment_method && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Method:</span> {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
                        </p>
                      )}
                      {order.payment_ref && order.payment_ref !== 'pending' && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Transaction Reference:</span> {order.payment_ref}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivery Information */}
                  {(order.delivery_name || order.delivery_phone || order.delivery_address) && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Information</h4>
                      {order.delivery_name && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Name:</span> {order.delivery_name}
                        </p>
                      )}
                      {order.delivery_phone && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Phone:</span> {order.delivery_phone}
                        </p>
                      )}
                      {order.delivery_address && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Address:</span> {order.delivery_address}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {item.product.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Quantity: {item.quantity} × {new Intl.NumberFormat('en-NG', {
                                style: 'currency',
                                currency: 'NGN'
                              }).format(item.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {new Intl.NumberFormat('en-NG', {
                                style: 'currency',
                                currency: 'NGN'
                              }).format(item.quantity * item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleViewReceipt(order)}
                        className="flex items-center space-x-2 text-primary-orange hover:text-primary-orange/90 font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Receipt</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Order Receipt Modal */}
      {showReceipt && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Order Receipt</h2>
              <button
                onClick={closeReceipt}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <OrderReceipt order={selectedOrder} transactionRef={transactionRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}