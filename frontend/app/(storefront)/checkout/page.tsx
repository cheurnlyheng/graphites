'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { apiFetch, mediaUrl, ApiError } from '@/lib/api';
import { getCartToken, setCartToken, getStoredVariantImage } from '@/lib/cart';
import type {
  CartResponse,
  ShippingRateOption,
  ShippingAddressRequest,
  CheckoutSessionRequest,
  PageResponse,
  ProductSummaryResponse
} from '@/lib/types';

const REQUIRED_FIELDS: (keyof ShippingAddressRequest)[] = ['fullName', 'email', 'phone', 'line1', 'city', 'state', 'postalCode'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lenient on formatting (spaces, dashes, parens, a leading +1) but still requires a real 10-digit
// US number -- Shippo rejects a label purchase outright without one ("address_to.phone should
// contain a valid phone number"), which is exactly what broke an admin's label purchase once
// a customer actually placed a real order with a bad phone number.
const PHONE_RE = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

function validateAddress(address: ShippingAddressRequest): Partial<Record<keyof ShippingAddressRequest, string>> {
  const errors: Partial<Record<keyof ShippingAddressRequest, string>> = {};
  if (!address.fullName.trim()) errors.fullName = 'Required';
  if (!address.email.trim()) errors.email = 'Required';
  else if (!EMAIL_RE.test(address.email.trim())) errors.email = 'Enter a valid email address';
  if (!address.phone || !address.phone.trim()) errors.phone = 'Required -- needed to generate your shipping label';
  else if (!PHONE_RE.test(address.phone.trim())) errors.phone = 'Enter a 10-digit US phone number, e.g. 212-456-7890';
  if (!address.line1.trim()) errors.line1 = 'Required';
  if (!address.city.trim()) errors.city = 'Required';
  if (!address.state.trim()) errors.state = 'Required';
  else if (!US_STATES.has(address.state.trim().toUpperCase())) errors.state = 'Enter a valid 2-letter state code';
  if (!address.postalCode.trim()) errors.postalCode = 'Required';
  else if (!ZIP_RE.test(address.postalCode.trim())) errors.postalCode = 'Enter a valid ZIP code';
  return errors;
}

// Scoped to this page only -- Stripe's own embedded payment form (step 3 below) uses rounded
// corners, light neutral borders, and a soft focus ring, which reads as more trustworthy for a
// page asking someone to type in their address than the sharp-cornered boxes used sitewide.
const FIELD = 'w-full rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15';
const FIELD_ERROR = 'border-red-400 focus:border-red-400 focus:ring-red-400/15';
const FIELD_LABEL = 'mb-1.5 block text-[13px] font-medium text-ink/55';
const PANEL = 'rounded-xl border border-[#e8e8e8] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]';
const PRIMARY_BUTTON = 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 text-sm font-semibold text-paper shadow-sm transition-all hover:bg-ink/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40';

// Loaded once per page load, not per render -- loadStripe caches internally but there's no reason
// to even call it more than once.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function StepNumber({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        done ? 'bg-ink text-paper' : 'border border-ink/30 text-ink/60'
      }`}
    >
      {done ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  disabled
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={FIELD_LABEL}>{label}</label>
      <input
        type={type}
        className={`${FIELD} ${error ? FIELD_ERROR : ''} ${disabled ? 'bg-[#fafafa] text-ink/50' : ''}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});

  const [address, setAddress] = useState<ShippingAddressRequest>({
    fullName: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof ShippingAddressRequest, string>>>({});

  const [rates, setRates] = useState<ShippingRateOption[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRateOption | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CartResponse>('/api/cart', { cartToken: getCartToken() })
      .then((data) => {
        if (data.cartToken) setCartToken(data.cartToken);
        setCart(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (cart?.items && cart.items.length > 0 && Object.keys(productThumbnails).length === 0) {
      apiFetch<PageResponse<ProductSummaryResponse>>('/api/products?size=50')
        .then((page) => {
          if (page?.content) {
            const map: Record<string, string> = {};
            page.content.forEach((p) => {
              if (p.thumbnailUrl) {
                map[p.name.toLowerCase()] = p.thumbnailUrl;
                map[p.id] = p.thumbnailUrl;
              }
            });
            setProductThumbnails(map);
          }
        })
        .catch(() => {});
    }
  }, [cart, productThumbnails]);

  function updateAddress<K extends keyof ShippingAddressRequest>(field: K, value: ShippingAddressRequest[K]) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setRates(null);
    setSelectedRate(null);
    setClientSecret(null);
    setAddressErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const addressConfirmed = rates !== null;
  const paymentStarted = clientSecret !== null;

  async function fetchRates() {
    setFetchingRates(true);
    setRatesError(null);
    try {
      const res = await apiFetch<{ rates: ShippingRateOption[] }>('/api/checkout/shipping-rates', {
        method: 'POST',
        cartToken: getCartToken(),
        body: address
      });
      setRates(res.rates);
      setSelectedRate(null);
      if (res.rates.length === 0) {
        setRatesError('No delivery methods are available for this address -- double check it and try again.');
      }
    } catch (err) {
      setRatesError(err instanceof ApiError ? err.message : 'Could not fetch delivery methods -- check your address and try again.');
    } finally {
      setFetchingRates(false);
    }
  }

  function handleContinueToDelivery() {
    const errors = validateAddress(address);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) return;
    fetchRates();
  }

  function changeDelivery() {
    setClientSecret(null);
    setSelectedRate(null);
  }

  async function continueToPayment() {
    if (!selectedRate) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const request: CheckoutSessionRequest = {
        shippingAddress: address,
        carrier: selectedRate.provider,
        serviceLevel: selectedRate.serviceLevel,
        shippingAmount: Number(selectedRate.amount)
      };
      const res = await apiFetch<{ clientSecret: string }>('/api/checkout/session', {
        method: 'POST',
        cartToken: getCartToken(),
        body: request
      });
      setClientSecret(res.clientSecret);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const checkoutOptions = useMemo(() => (clientSecret ? { clientSecret } : null), [clientSecret]);

  if (loading) return <p className="mx-auto max-w-6xl px-4 pt-28 text-ink/50">Loading…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 text-center">
        <div className="border border-line bg-paper-pure p-12 text-center">
          <p className="text-xs uppercase tracking-widest font-bold text-ink mb-2">Your cart is empty</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex text-xs">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const shippingAmount = selectedRate ? Number(selectedRate.amount) : 0;
  const estimatedTotal = cart.subtotal + shippingAmount;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-20">
      {/* Trust bar */}
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-6">
        <h1 className="page-heading mr-auto">Checkout</h1>
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Secure checkout
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          No account needed
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Shipping address */}
          <div className={PANEL}>
            <div className="flex items-center gap-3 border-b border-[#eee] px-6 py-4 sm:px-8">
              <StepNumber n={1} done={addressConfirmed} />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Contact &amp; shipping address</h2>
                <p className="text-xs text-ink/50">Shipping within the United States only, for now.</p>
              </div>
              {addressConfirmed && !paymentStarted && (
                <button
                  onClick={() => {
                    setRates(null);
                    setSelectedRate(null);
                  }}
                  className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-ink/50 hover:text-ink underline underline-offset-4"
                >
                  Edit
                </button>
              )}
            </div>

            {addressConfirmed ? (
              <div className="px-6 py-4 sm:px-8 text-sm text-ink/70">
                <p className="font-medium text-ink">{address.fullName}</p>
                <p>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.postalCode}
                </p>
                <p>
                  {address.email} · {address.phone}
                </p>
              </div>
            ) : (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Full name" value={address.fullName} onChange={(v) => updateAddress('fullName', v)} error={addressErrors.fullName} />
                  </div>
                  <Field
                    label="Email"
                    type="email"
                    value={address.email}
                    onChange={(v) => updateAddress('email', v)}
                    error={addressErrors.email}
                  />
                  <Field
                    label="Phone"
                    type="tel"
                    placeholder="212-456-7890"
                    value={address.phone ?? ''}
                    onChange={(v) => updateAddress('phone', v)}
                    error={addressErrors.phone}
                  />
                  <div className="sm:col-span-2">
                    <Field label="Street address" value={address.line1} onChange={(v) => updateAddress('line1', v)} error={addressErrors.line1} />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Apartment, suite, etc. (optional)"
                      value={address.line2 ?? ''}
                      onChange={(v) => updateAddress('line2', v)}
                    />
                  </div>
                  <Field label="City" value={address.city} onChange={(v) => updateAddress('city', v)} error={addressErrors.city} />
                  <Field
                    label="State"
                    placeholder="e.g. CA"
                    value={address.state}
                    onChange={(v) => updateAddress('state', v)}
                    error={addressErrors.state}
                  />
                  <Field
                    label="ZIP code"
                    value={address.postalCode}
                    onChange={(v) => updateAddress('postalCode', v)}
                    error={addressErrors.postalCode}
                  />
                  <Field label="Country" value="United States" onChange={() => {}} disabled />
                </div>

                <button onClick={handleContinueToDelivery} disabled={fetchingRates} className={`${PRIMARY_BUTTON} sm:w-auto`}>
                  {fetchingRates ? 'Looking up delivery methods…' : 'Continue to delivery'}
                </button>
                {ratesError && <p className="text-xs font-medium text-red-600">{ratesError}</p>}
              </div>
            )}
          </div>

          {/* Delivery method */}
          <div className={`${PANEL} ${!addressConfirmed ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 border-b border-[#eee] px-6 py-4 sm:px-8">
              <StepNumber n={2} done={!!selectedRate} />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Delivery method</h2>
                <p className="text-xs text-ink/50">Real-time rates from our carrier.</p>
              </div>
              {paymentStarted && selectedRate && (
                <button
                  onClick={changeDelivery}
                  className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-ink/50 hover:text-ink underline underline-offset-4"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="p-6 sm:p-8">
              {paymentStarted && selectedRate ? (
                <div className="flex items-center justify-between text-sm text-ink/70">
                  <span>
                    {selectedRate.provider} {selectedRate.serviceLevel}
                  </span>
                  <span className="font-mono font-medium text-ink">
                    {Number(selectedRate.amount) === 0 ? 'Free' : `$${Number(selectedRate.amount).toFixed(2)}`}
                  </span>
                </div>
              ) : rates && rates.length > 0 ? (
                <div className="space-y-2.5">
                  {[...rates]
                    .sort((a, b) => Number(a.amount) - Number(b.amount))
                    .map((rate) => {
                      const selected = selectedRate?.rateObjectId === rate.rateObjectId;
                      return (
                        <button
                          key={rate.rateObjectId}
                          onClick={() => setSelectedRate(rate)}
                          className={`flex w-full items-center justify-between gap-4 rounded-lg border px-5 py-4 text-left transition-colors ${
                            selected ? 'border-ink bg-[#fafafa] ring-1 ring-ink' : 'border-[#e3e3e3] hover:border-ink/40'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? 'border-ink bg-ink' : 'border-ink/25'
                              }`}
                            >
                              {selected && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {rate.provider} {rate.serviceLevel}
                              </p>
                              <p className="text-xs text-ink/50">
                                {rate.estimatedDays != null
                                  ? `${rate.estimatedDays} business day${rate.estimatedDays === 1 ? '' : 's'}`
                                  : 'Delivery time varies'}
                              </p>
                            </div>
                          </div>
                          <p className="font-mono font-medium text-ink shrink-0">
                            {Number(rate.amount) === 0 ? 'Free' : `$${Number(rate.amount).toFixed(2)}`}
                          </p>
                        </button>
                      );
                    })}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                    <button
                      onClick={continueToPayment}
                      disabled={!selectedRate || submitting}
                      className={`${PRIMARY_BUTTON} sm:w-auto`}
                    >
                      {submitting ? 'Loading payment…' : 'Continue to payment'}
                    </button>
                    <button onClick={fetchRates} disabled={fetchingRates} className="btn-ghost text-[11px] sm:ml-auto">
                      {fetchingRates ? 'Refreshing…' : 'Refresh rates'}
                    </button>
                  </div>
                  {submitError && <p className="text-xs font-medium text-red-600">{submitError}</p>}
                </div>
              ) : (
                <p className="text-xs text-ink/40">Enter your address above to see available delivery methods.</p>
              )}
            </div>
          </div>

          {/* Payment -- Stripe's own embedded form, mounted inline right here once a delivery
              method is picked, instead of redirecting away to a separate Stripe-hosted page. */}
          {paymentStarted && checkoutOptions && (
            <div className={PANEL}>
              <div className="flex items-center gap-3 border-b border-[#eee] px-6 py-4 sm:px-8">
                <StepNumber n={3} />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Payment</h2>
                  <p className="text-xs text-ink/50">Processed securely by Stripe.</p>
                </div>
              </div>
              <div className="p-2 sm:p-4">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div className={`${PANEL} sticky top-24 p-6 sm:p-7 space-y-5`}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Order summary</h2>
            <div className="space-y-3.5">
              {cart.items.map((item) => {
                const itemImg =
                  item.imageUrl ||
                  getStoredVariantImage(item.productVariantId) ||
                  productThumbnails[item.productName.toLowerCase()];
                return (
                  <div key={item.cartItemId} className="flex items-center gap-3">
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-[#f4f4f2] border border-black/5">
                      {itemImg ? (
                        <Image src={mediaUrl(itemImg)} alt={item.productName} fill sizes="44px" unoptimized className="object-cover object-center" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[8px] text-black/30 font-mono">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink/80">
                        {item.productName} × {item.quantity}
                      </p>
                      {item.variantAttributes && <p className="truncate text-xs text-ink/40">{item.variantAttributes}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-sm text-ink/70">${item.lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {paymentStarted ? (
              <p className="text-[11px] text-ink/40 border-t border-[#eee] pt-4">
                Final total, including tax, is shown in the payment form.
              </p>
            ) : (
              <>
                <div className="border-t border-[#eee] pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-ink/70">
                    <span>Subtotal</span>
                    <span className="font-mono">${cart.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink/70">
                    <span>Shipping</span>
                    <span className="font-mono">
                      {selectedRate ? (shippingAmount === 0 ? 'Free' : `$${shippingAmount.toFixed(2)}`) : '—'}
                    </span>
                  </div>
                </div>
                <div className="border-t border-[#eee] pt-4 flex items-baseline justify-between">
                  <span className="text-sm font-bold uppercase tracking-wide text-ink">Estimated total</span>
                  <span className="text-xl font-bold text-ink font-mono">${estimatedTotal.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-ink/40">Tax is calculated on the next step.</p>
              </>
            )}

            <div className="flex items-center justify-center gap-2 border-t border-[#eee] pt-4 text-[11px] text-ink/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Payment processed securely by Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
