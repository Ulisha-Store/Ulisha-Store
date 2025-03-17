import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Loader, Trash2, Edit, AlertTriangle, Check, X, Package, Plus, Image, Share2, Copy, Link as LinkIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Store as StoreType, Product } from '../types';

export function MyStore() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const productImageRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  
  const [storeData, setStoreData] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    logo: null as File | null,
    banner: null as File | null
  });
  
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    category: 'Clothes',
    description: '',
    image: null as File | null,
    additionalImages: [] as File[]
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchStore();
  }, [user, navigate]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      
      // Check if user has a store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (storeError && storeError.code !== 'PGRST116') {
        throw storeError;
      }
      
      if (storeData) {
        setStore(storeData);
        fetchProducts(storeData.id);
      } else {
        setStore(null);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeData.logo || !storeData.banner) {
      alert('Please select both logo and banner images');
      return;
    }
    
    try {
      setFormLoading(true);
      
      // Upload logo
      const logoName = `${uuidv4()}-${storeData.logo.name}`;
      const { error: logoError } = await supabase.storage
        .from('store-images')
        .upload(logoName, storeData.logo);
      
      if (logoError) throw logoError;
      
      // Get logo URL
      const { data: { publicUrl: logoUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(logoName);
      
      // Upload banner
      const bannerName = `${uuidv4()}-${storeData.banner.name}`;
      const { error: bannerError } = await supabase.storage
        .from('store-images')
        .upload(bannerName, storeData.banner);
      
      if (bannerError) throw bannerError;
      
      // Get banner URL
      const { data: { publicUrl: bannerUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(bannerName);
      
      // Create store
      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: storeData.name,
          description: storeData.description,
          logo: logoUrl,
          banner: bannerUrl,
          phone: storeData.phone,
          address: storeData.address,
          user_id: user?.id
        }])
        .select()
        .single();
      
      if (storeError) throw storeError;
      
      setStore(newStore);
      setShowStoreForm(false);
      
      // Reset form
      setStoreData({
        name: '',
        description: '',
        phone: '',
        address: '',
        logo: null,
        banner: null
      });
      
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      
    } catch (error) {
      console.error('Error creating store:', error);
      alert('Error creating store. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productData.image) {
      alert('Please select a product image');
      return;
    }
    
    if (!store) {
      alert('You need to create a store first');
      return;
    }
    
    try {
      setFormLoading(true);
      
      // Upload main product image
      const mainImageName = `${uuidv4()}-${productData.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(mainImageName, productData.image);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL for the uploaded image
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(mainImageName);
      
      // Insert the product into the database
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          price: parseFloat(productData.price),
          category: productData.category,
          description: productData.description,
          image: imageUrl,
          store_id: store.id,
          seller_id: user?.id,
          seller_phone: store.phone
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Upload additional images if any
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
        
        // Insert additional images into product_images table
        const { error: additionalImagesError } = await supabase
          .from('product_images')
          .insert(additionalImageData);
        
        if (additionalImagesError) throw additionalImagesError;
      }
      
      // Reset form and refresh products
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
      fetchProducts(store.id);
      
      // Show success notification
      showNotification(`Product "${newProduct.name}" added successfully! Share it with your customers.`, 'success');
      
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeleteLoading(true);
      
      // Delete product from database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      // Refresh products list
      if (store) {
        fetchProducts(store.id);
      }
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStoreData({ ...storeData, logo: e.target.files[0] });
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStoreData({ ...storeData, banner: e.target.files[0] });
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

  const getProductLink = (productId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/product/${productId}`;
  };

  const copyToClipboard = (productId: string) => {
    const link = getProductLink(productId);
    navigator.clipboard.writeText(link)
      .then(() => {
        setLinkCopied(productId);
        showNotification('Link copied to clipboard!', 'success');
        setTimeout(() => setLinkCopied(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        showNotification('Failed to copy link', 'error');
      });
  };

  const shareToSocial = (productId: string, platform: 'facebook' | 'twitter' | 'whatsapp') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const link = getProductLink(productId);
    const text = `Check out this product: ${product.name}`;
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
        break;
    }

    window.open(shareUrl, '_blank');
    setShowShareOptions(null);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {store ? 'My Store' : 'Create Your Store'}
          </h1>
          {store && (
            <button
              onClick={() => setShowProductForm(!showProductForm)}
              className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Product</span>
            </button>
          )}
        </div>

        {!store && !showStoreForm ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Image className="h-16 w-16 text-primary-orange mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">You don't have a store yet</h2>
            <p className="text-gray-600 mb-6">Create your own store to start selling products</p>
            <button
              onClick={() => setShowStoreForm(true)}
              className="bg-primary-orange text-white px-6 py-3 rounded-md hover:bg-primary-orange/90 transition-colors"
            >
              Create Store
            </button>
          </div>
        ) : null}

        {/* Store Creation Form */}
        {showStoreForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Your Store</h2>
            <form onSubmit={handleStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Name</label>
                <input
                  type="text"
                  required
                  value={storeData.name}
                  onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  required
                  value={storeData.description}
                  onChange={(e) => setStoreData({ ...storeData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={storeData.phone}
                  onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  required
                  value={storeData.address}
                  onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Logo</label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  required
                  onChange={handleLogoSelect}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-orange file:text-white
                    hover:file:bg-primary-orange/90"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Banner</label>
                <input
                  type="file"
                  ref={bannerInputRef}
                  accept="image/*"
                  required
                  onChange={handleBannerSelect}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-orange file:text-white
                    hover:file:bg-primary-orange/90"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex-1 flex items-center justify-center"
                >
                  {formLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Store</span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowStoreForm(false)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Store Details */}
        {store && !showStoreForm && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${store.banner})` }}></div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img src={store.logo} alt={store.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md -mt-12 sm:-mt-16" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
                  <p className="text-gray-600 mt-1">{store.description}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <span className="mr-4">{store.address}</span>
                    <span>{store.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Form */}
        {showProductForm && store && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button
                onClick={() => setShowProductForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
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
                  <option value="Home & Kitchen">Home & Kitchen</option>
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
                <label className="block text-sm font-medium text-gray-700">Main Product Image</label>
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
              
              {/* Additional Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Images</label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    ref={additionalImagesRef}
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImagesSelect}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-orange file:text-white
                      hover:file:bg-primary-orange/90"
                  />
                </div>
                
                {/* Preview of additional images */}
                {productData.additionalImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
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
              
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center justify-center"
              >
                {formLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                    <span>Adding Product...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    <span>Add Product</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Products List */}
        {store && products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Products ({products.length})</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg overflow-hidden group">
                    <div className="relative pb-[100%] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="absolute top-0 left-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {/* Edit functionality would go here */}}
                            className="bg-white text-gray-900 p-2 rounded-full"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(product.id)}
                            className="bg-white text-red-600 p-2 rounded-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowShareOptions(product.id === showShareOptions ? null : product.id)}
                            className="bg-white text-blue-600 p-2 rounded-full"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Share options dropdown */}
                      {showShareOptions === product.id && (
                        <div className="absolute top-12 right-2 bg-white rounded-lg shadow-lg p-2 z-20">
                          <div className="flex flex-col space-y-2">
                            <button 
                              onClick={() => shareToSocial(product.id, 'facebook')}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                            >
                              <div className="w-5 h-5 bg-blue-600 text-white flex items-center justify-center rounded-full">f</div>
                              <span>Facebook</span>
                            </button>
                            <button 
                              onClick={() => shareToSocial(product.id, 'twitter')}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                            >
                              <div className="w-5 h-5 bg-blue-400 text-white flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                                </svg>
                              </div>
                              <span>Twitter</span>
                            </button>
                            <button 
                              onClick={() => shareToSocial(product.id, 'whatsapp')}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                            >
                              <div className="w-5 h-5 bg-green-500 text-white flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                                </svg>
                              </div>
                              <span>WhatsApp</span>
                            </button>
                            <button 
                              onClick={() => copyToClipboard(product.id)}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                            >
                              {linkCopied === product.id ? (
                                <>
                                  <Check className="w-5 h-5 text-green-500" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-5 h-5 text-gray-500" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {product.category}
                        </span>
                      </div>
                      <h3 className="text-sm md:text-base font-medium text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <div className="text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN'
                        }).format(product.price)}
                      </div>
                      
                      {/* Product Link */}
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <LinkIcon className="w-4 h-4 mr-1" />
                        <a 
                          href={getProductLink(product.id)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary-orange"
                        >
                          {getProductLink(product.id).split('/').pop()}
                        </a>
                      </div>
                    </div>
                    
                    {/* Delete Confirmation */}
                    {deleteConfirmation === product.id && (
                      <div className="p-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Confirm delete?
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deleteLoading}
                              className="text-white bg-red-600 p-1 rounded-full"
                            >
                              {deleteLoading ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(null)}
                              className="text-white bg-gray-600 p-1 rounded-full"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {store && products.length === 0 && !showProductForm && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-600 mb-6">Add your first product to start selling</p>
            <button
              onClick={() => setShowProductForm(true)}
              className="bg-primary-orange text-white px-6 py-3 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}