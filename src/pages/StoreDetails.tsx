import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader, Phone, ShoppingBag, ChevronLeft } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import type { Store, Product } from '../types';

export function StoreDetails() {
  const { storeId } = useParams<{ storeId: string }>();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (storeId) {
      fetchStoreDetails();
    }
  }, [storeId]);

  const fetchStoreDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      if (storeError) throw storeError;
      setStore(storeData);
      
      // Fetch store products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      setProducts(productsData || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(productsData?.map(product => product.category) || [])];
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error fetching store details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(product => product.category === selectedCategory)
    : products;

  const handleCallSeller = () => {
    if (store?.phone) {
      window.location.href = `tel:${store.phone}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store not found</h2>
          <p className="text-gray-600 mb-4">The store you're looking for doesn't exist or has been removed</p>
          <Link to="/" className="text-primary-orange hover:text-primary-orange/90 font-medium">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Banner */}
      <div className="h-64 bg-cover bg-center relative" style={{ backgroundImage: `url(${store.banner})` }}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute top-4 left-4">
          <Link to="/" className="bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all">
            <ChevronLeft className="h-5 w-5 text-gray-800" />
          </Link>
        </div>
      </div>
      
      {/* Store Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <img src={store.logo} alt={store.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <p className="text-gray-600 mt-1">{store.description}</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <span>{store.address}</span>
              </div>
            </div>
            <button
              onClick={handleCallSeller}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-colors"
            >
              <Phone className="h-5 w-5" />
              <span>Call Seller</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Categories */}
      {categories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === null
                    ? 'bg-primary-orange text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-primary-orange text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedCategory ? selectedCategory : 'All Products'}
          </h2>
          <p className="text-sm text-gray-500">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {selectedCategory
                ? `This store doesn't have any products in the ${selectedCategory} category yet.`
                : "This store doesn't have any products yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}