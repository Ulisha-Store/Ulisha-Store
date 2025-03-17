import { useRef } from 'react';
import { Download, Printer } from 'lucide-react';

interface OrderItem {
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

interface OrderReceiptProps {
  order: Order;
  transactionRef?: string | null;
}

export function OrderReceipt({ order }: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.body.innerHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ulisha Store - Order Receipt</title>
              <style>@media print { .no-print { display: none; } }</style>
            </head>
            <body>${receiptRef.current.innerHTML}</body>
          </html>
        `;
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleDownload = () => {
    if (receiptRef.current) {
      const blob = new Blob([receiptRef.current.innerHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-receipt-${order.id.substring(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateVerificationCode = () => {
    return `${order.id.substring(0, 6)}${new Date(order.created_at).getTime().toString().slice(-5)}`.toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Order Receipt</h2>
        <div className="flex space-x-2">
          <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownload} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      <div ref={receiptRef}>
        <h1 className="text-2xl font-bold text-orange-500">Ulisha Store</h1>
        <p>Order ID: {order.id.substring(0, 8)}</p>
        <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
        <p>Total: ₦{order.total.toLocaleString()}</p>
        <h3 className="font-semibold">Delivery Info</h3>
        <p>Name: {order.delivery_name}</p>
        <p>Phone: {order.delivery_phone}</p>
        <p>Address: {order.delivery_address}</p>
        <h3 className="font-semibold">Items</h3>
        <ul>
          {order.items.map((item, index) => (
            <li key={index}>{item.quantity} x {item.product.name} - ₦{item.price.toLocaleString()}</li>
          ))}
        </ul>
        <h3 className="font-semibold">Verification Code</h3>
        <p className="text-xl font-bold bg-gray-100 p-2 inline-block">{generateVerificationCode()}</p>
      </div>
    </div>
  );
}
