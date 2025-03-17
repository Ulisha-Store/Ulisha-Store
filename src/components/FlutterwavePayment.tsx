import React from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { useAuthStore } from '../store/authStore';
// Import the FlutterwaveConfig type directly from the package instead of your local types.
import type { FlutterwaveConfig } from 'flutterwave-react-v3/dist/types';

interface FlutterwavePaymentProps {
  amount: number;
  onSuccess: (response: any) => void;
  onClose: () => void;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  orderId?: string;
}

export function FlutterwavePayment({
  amount,
  onSuccess,
  onClose,
  customerInfo,
  disabled = false,
  className = '',
  children,
  orderId
}: FlutterwavePaymentProps) {
  const user = useAuthStore((state) => state.user);

  const config: FlutterwaveConfig = {
    public_key: 'FLWPUBK-21d59dfb46d1659c3d7e1e09fb312c1a-X',
    tx_ref: orderId || Date.now().toString(),
    amount,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: customerInfo.email || user?.email || '',
      phone_number: customerInfo.phone ?? '', // ensures it's always a string
      name: customerInfo.name || user?.user_metadata?.full_name || '',
    },
    customizations: {
      title: 'Ulisha Store',
      description: 'Payment for items in cart',
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
    },
  };

  const handleFlutterPayment = useFlutterwave(config);

  const handlePayment = () => {
    if (disabled) return;
    
    handleFlutterPayment({
      callback: (response) => {
        if (response.status === "successful") {
          onSuccess(response);
        }
        closePaymentModal();
      },
      onClose: () => {
        onClose();
        closePaymentModal();
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}
