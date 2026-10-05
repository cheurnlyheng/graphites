import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection, FillIn } from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — GRAPHITES',
  description: 'How GRAPHITES collects, uses, and protects your information.'
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="2026-10-04">
      <p>
        This policy explains what information <FillIn>Business Legal Name</FillIn> ("we," "us," or
        "the shop") collects when you shop with us, how we use it, and who we share it with. We sell
        as a guest checkout only — we don&apos;t require you to create an account, and we only collect
        what&apos;s needed to process and ship your order.
      </p>

      <LegalSection heading="Information we collect">
        <p>When you place an order, we collect:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Your email address (for order confirmation and shipping updates)</li>
          <li>Shipping and billing address</li>
          <li>Order contents, quantities, and amount paid</li>
        </ul>
        <p>
          We do not collect or store your card details ourselves. Payment is handled entirely by
          Stripe, our payment processor — your card number never touches our servers.
        </p>
      </LegalSection>

      <LegalSection heading="How we use your information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To process payment and fulfill your order</li>
          <li>To send order confirmation, shipping, and delivery emails</li>
          <li>To respond if you contact us about an order or return</li>
          <li>To detect and prevent fraud or abuse of our checkout</li>
        </ul>
        <p>We do not sell your information, and we do not use it for advertising.</p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>We share only what each service needs to do its job:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Shippo</strong> and the carrier it books with (e.g. USPS, UPS) — shipping labels and tracking, which requires your shipping address</li>
          <li><strong>Resend</strong> — sending order and shipping emails on our behalf</li>
        </ul>
        <p>We don&apos;t share your information with anyone else, including for marketing purposes.</p>
      </LegalSection>

      <LegalSection heading="Cookies and local storage">
        <p>
          We use a small amount of browser storage to remember your shopping cart between visits.
          We don&apos;t currently use advertising or third-party tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We keep order records for as long as needed for accounting, tax, and warranty/return
          purposes, and to comply with the law.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask us what information we hold about an order, or ask us to delete it where
          we&apos;re not legally required to keep it, by emailing <FillIn>support@yourdomain.com</FillIn>.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as the shop changes. The date at the top shows when it was last
          revised.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          <FillIn>Business Legal Name</FillIn><br />
          <FillIn>Business Address</FillIn><br />
          <FillIn>support@yourdomain.com</FillIn>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
