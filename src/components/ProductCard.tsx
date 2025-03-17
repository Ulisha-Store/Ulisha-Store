import { useState } from 'react';
import type { Product } from '../types';
import { Star, ShoppingCart, Phone, Share2, Copy, Check } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export function ProductCard({ product }: { product: Product }) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const addToCart = useCartStore((state) => state.addToCart);
  const isLoggedIn = useAuthStore((state) => !!state.user);
  const navigate = useNavigate();

  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(product.price);

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      await addToCart(product);
      showNotification('Product added to cart!', 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('Failed to add product to cart. Please try again.', 'error');
    }
  };

  const handleCallSeller = () => {
    if (product.seller_phone) {
      window.location.href = `tel:${product.seller_phone}`;
    }
  };

  const getProductLink = () => {
    return `https://ulishastore.netlify.app/product/${product.id}`;
  };

  const copyToClipboard = () => {
    const link = getProductLink();
    navigator.clipboard.writeText(link)
      .then(() => {
        setLinkCopied(true);
        showNotification('Link copied to clipboard!', 'success');
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        showNotification('Failed to copy link', 'error');
      });
  };

  const shareToSocial = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    const link = getProductLink();
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
    setShowShareOptions(false);
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

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="relative pb-[100%] overflow-hidden rounded-t-lg">
        <img
          src={product.image}
          alt={product.name}
          className="absolute top-0 left-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200 cursor-pointer"
          onClick={() => navigate(`/product/${product.id}`)}
        />
        
        {/* Share button */}
        <button 
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="absolute top-2 right-2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all z-10"
        >
          <Share2 className="w-4 h-4 text-gray-700" />
        </button>
        
        {/* Share options dropdown */}
        {showShareOptions && (
          <div className="absolute top-12 right-2 bg-white rounded-lg shadow-lg p-2 z-20">
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => shareToSocial('facebook')}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
              >
                <div className="w-5 h-5 bg-blue-600 text-white flex items-center justify-center rounded-full">f</div>
                <span>Facebook</span>
              </button>
              <button 
                onClick={() => shareToSocial('twitter')}
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
                onClick={() => shareToSocial('whatsapp')}
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
                onClick={copyToClipboard}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
              >
                {linkCopied ? (
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
        <h3 
          className="text-sm md:text-base font-medium text-gray-900 line-clamp-2 mb-1 cursor-pointer hover:text-primary-orange"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {product.name}
        </h3>
        <div className="flex items-center mb-2">
          <div className="flex items-center text-orange-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${(product.rating || 5) > i ? 'fill-current' : 'text-gray-300'}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="text-lg font-bold text-gray-900">{formattedPrice}</div>
          <div className="flex space-x-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center bg-primary-orange hover:bg-primary-orange/90 text-white text-sm font-medium py-2 px-2 rounded-full transition-colors duration-200 space-x-1"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
            {product.seller_phone && (
              <button
                onClick={handleCallSeller}
                className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-2 rounded-full transition-colors duration-200 space-x-1"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Call</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}