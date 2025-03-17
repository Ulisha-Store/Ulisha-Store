import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface AdCarouselProps {
  className?: string;
}

export function AdCarousel({ className = '' }: AdCarouselProps) {
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const ads = [
    {
      id: 1,
      title: "Summer Collection 2025",
      description: "Discover the latest trends in fashion",
      image: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1600&h=500&q=80",
      buttonText: "Shop Now",
      buttonLink: "#products-section"
    },
    {
      id: 2,
      title: "Premium Accessories",
      description: "Elevate your style with our premium accessories",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&h=500&q=80",
      buttonText: "Explore",
      buttonLink: "#products-section"
    },
    {
      id: 3,
      title: "Smart Watches Collection",
      description: "Technology meets style with our smart watches",
      image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1600&h=500&q=80",
      buttonText: "View Collection",
      buttonLink: "#products-section"
    },
    {
      id: 4,
      title: "Special Offer",
      description: "Get up to 30% off on selected items",
      image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1600&h=500&q=80",
      buttonText: "Shop Sale",
      buttonLink: "#products-section"
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="h-[400px] sm:h-[500px]"
        onInit={(swiper) => {
          // @ts-ignore
          swiper.params.navigation.prevEl = prevRef.current;
          // @ts-ignore
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
      >
        {ads.map((ad) => (
          <SwiperSlide key={ad.id}>
            <div 
              className="relative w-full h-full bg-cover bg-center flex items-center"
              style={{ backgroundImage: `url(${ad.image})` }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              <div className="relative z-10 text-white text-center w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{ad.title}</h2>
                <p className="text-lg sm:text-xl mb-6">{ad.description}</p>
                <a 
                  href={ad.buttonLink}
                  className="inline-block bg-primary-orange hover:bg-primary-orange/90 text-white font-medium py-3 px-8 rounded-full transition-colors"
                >
                  {ad.buttonText}
                </a>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom navigation buttons */}
      <div 
        ref={prevRef}
        className="absolute top-1/2 left-4 z-10 -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 rounded-full p-2 cursor-pointer transition-all"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </div>
      <div 
        ref={nextRef}
        className="absolute top-1/2 right-4 z-10 -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 rounded-full p-2 cursor-pointer transition-all"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </div>
    </div>
  );
}