import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout, LegalSection, FillIn } from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Terms of Sale — GRAPHITES',
  description: 'The terms that apply when you buy from GRAPHITES.'
};

export default function TermsOfSalePage() {
  return (
    <LegalPageLayout title="Terms of Sale" updated="2026-10-04">
      <p>
        These terms apply whenever you place an order with <FillIn>Business Legal Name</FillIn>. By
        completing checkout, you agree to them.
      </p>

      <LegalSection heading="Orders and payment">
        <p>
          We don&apos;t require an account — every order is placed as a guest. Prices are listed in
          USD and are charged at checkout through Stripe. We reserve the right to correct listing
          errors (including incorrect prices) and to cancel an order affected by one, with a full
          refund.
        </p>
      </LegalSection>

      <LegalSection heading="Order confirmation and tracking">
        <p>
          After payment, you&apos;ll receive an order confirmation email with a link to track your
          order&apos;s status. We&apos;ll also email you when your order ships and when it&apos;s
          delivered.
        </p>
      </LegalSection>

      <LegalSection heading="Shipping">
        <p>
          We ship via the carrier shown at checkout. Estimated delivery times are estimates, not
          guarantees — delays caused by the carrier are outside our control. Risk of loss passes to
          the carrier once your order is handed off for delivery.
        </p>
      </LegalSection>

      <LegalSection heading="Cancellations">
        <p>
          We may cancel an order before it ships (for example, if an item turns out to be out of
          stock) and will always refund you in full and email you the reason. You can ask us to
          cancel an order that hasn&apos;t shipped yet by contacting{' '}
          <a href="mailto:graphites.world@gmail.com" className="underline">graphites.world@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Returns and refunds">
        <p>
          See our <Link href="/returns-policy" className="underline underline-offset-2 hover:text-[#10100F]">Return Policy</Link> for
          the return window and how to request one.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the extent permitted by law, our liability for any order is limited to the amount you
          paid for it. We&apos;re not liable for indirect or consequential losses.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of <FillIn>State / Country</FillIn>, without regard
          to its conflict-of-law rules.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          <FillIn>Business Legal Name</FillIn><br />
          <FillIn>Business Address</FillIn><br />
          <a href="mailto:graphites.world@gmail.com" className="underline">graphites.world@gmail.com</a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
