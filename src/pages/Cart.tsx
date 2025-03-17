import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, CreditCard, ShoppingBag, Loader, Truck, X, MessageCircle } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { FlutterwavePayment } from '../components/FlutterwavePayment';
import { OrderReceipt } from '../components/OrderReceipt';
import { supabase } from '../lib/supabase';

const DELIVERY_FEE = 400; // ₦3,500
const FREE_DELIVERY_THRESHOLD = 50000; // ₦50,000

export function Cart() {
  const { items, removeFromCart, updateQuantity, loading, fetchCart, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  
  // Delivery details state
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    phone: '',
    address: '',
    state: ''
  });

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  useEffect(() => {
    // Check if we're returning from a redirect payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    
    if (paymentSuccess === 'true') {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear the cart
      clearCart().catch(err => console.error('Error clearing cart:', err));
      
      // Show success message and redirect to dashboard
      showNotification('Payment successful! Your order has been placed.', 'success');
      navigate('/dashboard');
    }
  }, [navigate, clearCart]);

  const subtotal = items.reduce((sum, item) => {
    if (item.product) {
      return sum + item.product.price * item.quantity;
    }
    return sum;
  }, 0);

  // Calculate delivery fee - free if subtotal is above threshold
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleFlutterwaveSuccess = async (response: any) => {
    try {
      setCheckoutLoading(true);

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total: total,
          status: 'pending',
          delivery_name: deliveryDetails.name,
          delivery_phone: deliveryDetails.phone,
          delivery_address: `${deliveryDetails.address}, ${deliveryDetails.state}`,
          payment_ref: response.transaction_id || response.tx_ref,
          payment_method: 'flutterwave'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Set current order for receipt
      setCurrentOrder(order);
      setShowReceipt(true);

      // Generate WhatsApp message
      const whatsappMessage = generateWhatsAppMessage(order, items);
      
      // Open WhatsApp with pre-filled message
      window.open(`https://wa.me/2347060438205?text=${encodeURIComponent(whatsappMessage)}`, '_blank');

      // Clear the cart after successful payment
      await clearCart();
      
      // Show success notification
      showNotification('Order placed successfully! You can now download your receipt.', 'success');
    } catch (error) {
      console.error('Error processing order after payment:', error);
      showNotification('Payment was successful, but there was an error processing your order. Please contact support.', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const generateWhatsAppMessage = (order: any, items: any[]) => {
    const formattedTotal = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(order.total);

    let message = `🛍️ *New Order #${order.id.substring(0, 8)}*\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${order.delivery_name}\n`;
    message += `Phone: ${order.delivery_phone}\n`;
    message += `Address: ${order.delivery_address}\n\n`;
    
    message += `*Order Items:*\n`;
    items.forEach(item => {
      const subtotal = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
      }).format(item.quantity * item.product.price);
      
      message += `• ${item.product.name} (×${item.quantity}) - ${subtotal}\n`;
    });
    
    message += `\n*Total Amount:* ${formattedTotal}\n`;
    message += `*Payment Method:* ${order.payment_method}\n`;
    message += `*Payment Reference:* ${order.payment_ref}\n\n`;
    message += `Please process my order. Thank you!`;

    return message;
  };

  const handleFlutterwaveClose = () => {
    console.log('Payment modal closed');
  };

  const handleChatWithSales = () => {
    const message = "Hello! I'm interested in making a purchase from Ulisha Store. Can you help me?";
    window.open(`https://wa.me/2347060438205?text=${encodeURIComponent(message)}`, '_blank');
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some items to your cart to get started</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary-orange hover:text-primary-orange/90 font-medium"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
                  <button
                    onClick={handleChatWithSales}
                    className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Chat with Sales</span>
                  </button>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    <strong>Important:</strong> After making payment, please send your order details to our sales manager on WhatsApp for immediate processing.
                  </p>
                </div>

                <div className="space-y-4">
                  {items.map((item) => {
                    if (!item.product) return null;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{item.product.name}</h3>
                            <p className="text-sm text-gray-500">{item.product.category}</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {new Intl.NumberFormat('en-NG', {
                                style: 'currency',
                                currency: 'NGN'
                              }).format(item.product.price)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                              disabled={loading || item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                              disabled={loading}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-red-500 hover:text-red-600 disabled:opacity-50"
                            disabled={loading}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Order summary and delivery details */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>
                    {new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: 'NGN'
                    }).format(subtotal)}
                  </span>
                </div>

                {/* Delivery Information */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Truck className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">Delivery Fee</span>
                    </div>
                    <span className="text-sm">
                      {deliveryFee === 0 ? (
                        <span className="text-green-600 font-medium">FREE</span>
                      ) : (
                        new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN'
                        }).format(deliveryFee)
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                      "You've qualified for free delivery!"
                    ) : (
                      `Add ${new Intl.NumberFormat('en-NG', {
                        style: 'currency',
                        currency: 'NGN'
                      }).format(FREE_DELIVERY_THRESHOLD - subtotal)} more to get free delivery`
                    )}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>
                      {new Intl.NumberFormat('en-NG', {
                        style: 'currency',
                        currency: 'NGN'
                      }).format(total)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Contact Information */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.name}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.phone}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.state}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, state: e.target.value})}
                      placeholder="Enter your state"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address
                    </label>
                    <textarea
                      id="address"
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.address}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
                      placeholder="Enter your full delivery address"
                    />
                  </div>
                </div>
                
                <FlutterwavePayment
                  amount={total}
                  onSuccess={handleFlutterwaveSuccess}
                  onClose={handleFlutterwaveClose}
                  customerInfo={{
                    name: deliveryDetails.name,
                    email: user?.email || '',
                    phone: deliveryDetails.phone
                  }}
                  disabled={
                    !deliveryDetails.name || 
                    !deliveryDetails.phone || 
                    !deliveryDetails.address ||
                    !deliveryDetails.state ||
                    checkoutLoading
                  }
                  className="w-full bg-primary-orange text-white py-3 rounded-lg hover:bg-primary-orange/90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  <span>{checkoutLoading ? 'Processing...' : 'Pay with Flutterwave'}</span>
                </FlutterwavePayment>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Receipt Modal */}
      {showReceipt && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Order Receipt</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <OrderReceipt order={currentOrder} transactionRef={currentOrder.payment_ref} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}