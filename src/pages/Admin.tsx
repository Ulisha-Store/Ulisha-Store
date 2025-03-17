import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { 
  Loader, 
  Package, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  DollarSign,
  ShoppingCart,
  Eye,
  Plus
} from 'lucide-react';
import { OrderReceipt } from '../components/OrderReceipt';
import { v4 as uuidv4 } from 'uuid';

export function Admin() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    category: 'Clothes',
    description: '',
    image: null as File | null,
    additionalImages: [] as File[]
  });
  
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const productImageRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  const ordersEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.email !== 'paulelite606@gmail.com') {
      navigate('/');
      return;
    }
    
    fetchData();

    // Subscribe to real-time order updates
    const ordersSubscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        console.log('Order update received:', payload);
        
        if (payload.eventType === 'INSERT') {
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(console.error);
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('New Order Received!', {
              body: `Order #${payload.new.id.substring(0, 8)} has been placed.`,
              icon: '/icons/icon-192x192.png'
            });
          }
        }
        
        fetchOrders();
      })
      .subscribe();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, [user, navigate]);

  useEffect(() => {
    // Scroll to bottom when new orders arrive
    if (ordersEndRef.current && activeTab === 'orders') {
      ordersEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [orders, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
      } else {
        setProducts(productsData || []);
      }
      
      
      fetchOrders();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            id,
            quantity,
            price,
            product:products (
              name,
              image
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('Error fetching orders. Please refresh the page.', 'error');
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productData.image) {
      alert('Please select a product image');
      return;
    }
    
    try {
      setLoading(true);
      
      const mainImageName = `${uuidv4()}-${productData.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(mainImageName, productData.image);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(mainImageName);
      
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          price: parseFloat(productData.price),
          category: productData.category,
          description: productData.description,
          image: imageUrl
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      if (productData.additionalImages.length > 0) {
        const additionalImagePromises = productData.additionalImages.map(async (file) => {
          const fileName = `${uuidv4()}-${file.name}`;
          const { error: additionalUploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);
          
          if (additionalUploadError) throw additionalUploadError;
          
          const { data: { publicUrl: additionalImageUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          
          return { product_id: newProduct.id, image_url: additionalImageUrl };
        });
        
        const additionalImageData = await Promise.all(additionalImagePromises);
        
        const { error: additionalImagesError } = await supabase
          .from('product_images')
          .insert(additionalImageData);
        
        if (additionalImagesError) throw additionalImagesError;
      }
      
      setProductData({
        name: '',
        price: '',
        category: 'Clothes',
        description: '',
        image: null,
        additionalImages: []
      });
      
      if (productImageRef.current) productImageRef.current.value = '';
      if (additionalImagesRef.current) additionalImagesRef.current.value = '';
      
      setShowProductForm(false);
      fetchData();
      
      showNotification('Product added successfully!', 'success');
      
    } catch (error) {
      console.error('Error adding product:', error);
      showNotification('Error adding product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeleteLoading(true);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      setProducts(products.filter(product => product.id !== productId));
      setDeleteConfirmation(null);
      showNotification('Product deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('Error deleting product. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProductData({ ...productData, image: e.target.files[0] });
    }
  };

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setProductData({ 
        ...productData, 
        additionalImages: [...productData.additionalImages, ...newFiles] 
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    const updatedImages = [...productData.additionalImages];
    updatedImages.splice(index, 1);
    setProductData({ ...productData, additionalImages: updatedImages });
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

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));
      
      showNotification('Order status updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating order status:', error);
      showNotification('Error updating order status. Please try again.', 'error');
    }
  };

  const handleViewReceipt = (order: any) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setSelectedOrder(null);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
          <div className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-primary-orange border-b-2 border-primary-orange'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'products'
                  ? 'text-primary-orange border-b-2 border-primary-orange'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'text-primary-orange border-b-2 border-primary-orange'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Orders ({orders.length})
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Products</h3>
                  <p className="text-3xl font-bold text-primary-orange mt-2">{products.length}</p>
                </div>
                <Package className="h-10 w-10 text-primary-orange" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
                  <p className="text-3xl font-bold text-primary-orange mt-2">{orders.length}</p>
                </div>
                <ShoppingCart className="h-10 w-10 text-primary-orange" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
                  <p className="text-3xl font-bold text-primary-orange mt-2">
                    {new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: 'NGN'
                    }).format(orders.reduce((sum, order) => sum + order.total, 0))}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-primary-orange" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Products</h2>
              <button
                onClick={() => setShowProductForm(!showProductForm)}
                className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Product</span>
              </button>
            </div>

            {showProductForm && (
              <div className="mb-8 border-b pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Product</h3>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <input
                      type="text"
                      required
                      value={productData.name}
                      onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (NGN)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={productData.price}
                      onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      required
                      value={productData.category}
                      onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                    >
                      <option value="Clothes">Clothes</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Smart Watches">Smart Watches</option>
                      <option value="Electronics">Electronics</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={4}
                      required
                      value={productData.description}
                      onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Image</label>
                    <input
                      type="file"
                      ref={productImageRef}
                      accept="image/*"
                      required
                      onChange={handleProductImageSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-orange file:text-white
                        hover:file:bg-primary-orange/90"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Images</label>
                    <input
                      type="file"
                      ref={additionalImagesRef}
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalImagesSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-orange file:text-white
                        hover:file:bg-primary-orange/90"
                    />
                    
                    {productData.additionalImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {productData.additionalImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Additional image ${index + 1}`}
                              className="h-20 w-20 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex-1 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin mr-2" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5 mr-2" />
                          <span>Add Product</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt={product.name} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN'
                        }).format(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {deleteConfirmation === product.id ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-red-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Confirm delete?
                            </span>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deleteLoading}
                              className="text-red-600 hover:text-red-900"
                            >
                              {deleteLoading ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setDeleteConfirmation(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Orders</h2>
            
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex flex-wrap gap-4 justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <p className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN'
                        }).format(order.total)}
                      </p>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-sm rounded-full px-3 py-1 font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewReceipt(order)}
                          className="bg-primary-blue text-white p-1 rounded-full hover:bg-primary-blue/90"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
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
                  </div>
                </div>
              ))}
              <div ref={ordersEndRef} />
            </div>
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
              <OrderReceipt order={selectedOrder} transactionRef={selectedOrder.payment_ref} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}