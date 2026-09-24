import { Suspense } from 'react';
import { OrderConfirmationClient } from './OrderConfirmationClient';

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
