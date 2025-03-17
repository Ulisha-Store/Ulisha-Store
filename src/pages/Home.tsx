import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Search, ChevronDown, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { useLocation } from 'react-router-dom';
import { fallbackProducts } from '../lib/supabase';

const categories = ['All Categories', 'Clothes', 'Accessories', 'Shoes', 'Smart Watches', 'Electronics'];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [usesFallback, setUsesFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetchProductsWithRetry();
    
    // Parse URL parameters
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const searchParam = params.get('search');
    
    if (categoryParam && categories.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }

    // Subscribe to product changes
    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products' 
        }, 
        () => {
          fetchProductsWithRetry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsSubscription);
    };
  }, [location.search]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchProductsWithRetry = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have a valid session first
      const { error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session check error:', sessionError);
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Network or connection errors
        if (error.code === 'PGRST301' || error.message?.includes('Failed to fetch')) {
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying fetch attempt ${retryCount + 1} of ${MAX_RETRIES}...`);
            await delay(RETRY_DELAY * (retryCount + 1));
            return fetchProductsWithRetry(retryCount + 1);
          }
          console.error('Max retries reached, using fallback data');
          setProducts(fallbackProducts);
          setUsesFallback(true);
          setError('Unable to connect to the server. Showing offline product data.');
          return;
        }
        
        // Authentication errors
        if (error.code === 'JWT_INVALID') {
          console.error('Authentication error:', error);
          setProducts(fallbackProducts);
          setUsesFallback(true);
          return;
        }

        throw error;
      }
      
      if (data && data.length > 0) {
        setProducts(data);
        setUsesFallback(false);
        setError(null);
      } else {
        console.log('No products found in database, using fallback data');
        setProducts(fallbackProducts);
        setUsesFallback(true);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Unable to load products. Please check your connection and try again.');
      setProducts(fallbackProducts);
      setUsesFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All Categories' || 
      product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-grow">
          <div className="bg-white shadow-sm" id="products-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full sm:w-64">
                  <button
                    className="w-full flex items-center justify-between bg-white border rounded px-4 py-2 text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onClick={() => setShowCategories(!showCategories)}
                  >
                    <span>{selectedCategory}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showCategories && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      {categories.map((category) => (
                        <button
                          key={category}
                          className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowCategories(false);
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">
                {selectedCategory === 'All Categories' ? 'Featured Products' : selectedCategory}
              </h1>
              <p className="text-sm text-gray-500">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {usesFallback && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Currently showing demo products. Admin products will appear here once uploaded.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No products found matching your criteria.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="bg-gray-900 text-white mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">About UlishaStore</h3>
                <p className="text-gray-400 text-sm">
                  Your one-stop shop for fashion, accessories, shoes, and smart devices. We bring you the
                  best quality products at competitive prices.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-primary-orange transition-colors">Home</a></li>
                  <li><a href="#" className="hover:text-primary-orange transition-colors">Shop</a></li>
                  <li><a href="#" className="hover:text-primary-orange transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-primary-orange transition-colors">Chat Support</a></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center space-x-2">
                    <span>ulishastore@gmail.com</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                <div className="flex space-x-4">
                  <a href="https://www.facebook.com/share/1AhYhxox4X/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" 
                     className="hover:text-primary-orange transition-colors">
                    <Facebook className="w-6 h-6" />
                  </a>
                  <a href="https://x.com/ulishastores" target="_blank" rel="noopener noreferrer"
                     className="hover:text-primary-orange transition-colors">
                    <Twitter className="w-6 h-6" />
                  </a>
                  <a href="https://www.instagram.com/ulisha_store?" target="Ulishastore" rel="noopener noreferrer"
                     className="hover:text-primary-orange transition-colors">
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a href="https://www.tiktok.com/@ulishastores" target="_blank" rel="noopener noreferrer"
                     className="hover:text-primary-orange transition-colors">
                    <Youtube className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} UlishaStore. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}