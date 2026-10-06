import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection, FillIn } from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Shipping & Returns — GRAPHITES',
  description: 'Our shipping timelines and how to request a return or refund.'
};

export default function ReturnsPolicyPage() {
  return (
    <LegalPageLayout title="Shipping & Returns" updated="2026-10-04">
      <LegalSection heading="Shipping">
        <p>
          Orders are typically packed and handed to the carrier within <FillIn>1-2 business days</FillIn> of
          payment. You&apos;ll get an email the moment your order ships, with a tracking link, and
          another when it&apos;s delivered.
        </p>
      </LegalSection>

      <LegalSection heading="Returns">
        <p>
          We accept returns within <FillIn>30 days</FillIn> of delivery, for items that are unworn,
          unwashed, and in their original condition with tags attached.
        </p>
        <p>
          <strong>To request a return:</strong> open the order tracking link from your confirmation
          or shipping email, then use the "Request a return" option on that page. Include the reason
          for your return — we review every request individually.
        </p>
        <p>
          Once we approve and receive your return, we&apos;ll refund your original payment method.
          Refunds typically take <FillIn>5-10 business days</FillIn> to appear, depending on your
          bank.
        </p>
      </LegalSection>

      <LegalSection heading="Who pays for return shipping">
        <p>
          If the return is because of a defect or a mistake on our part (wrong item, damaged in
          transit), we cover return shipping. Otherwise, return shipping is the customer&apos;s
          responsibility.
        </p>
      </LegalSection>

      <LegalSection heading="Order cancellations">
        <p>
          If your order hasn&apos;t shipped yet, we may be able to cancel it and refund you in full —
          contact us as soon as possible at{' '}
          <a href="mailto:graphites.world@gmail.com" className="underline">graphites.world@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          Email us at <a href="mailto:graphites.world@gmail.com" className="underline">graphites.world@gmail.com</a> and we&apos;ll get back to you.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
