'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCartToken, setCartToken } from '@/lib/cart';
import type { CartResponse, ShippingRateOption, ShippingAddressRequest, CheckoutSessionRequest } from '@/lib/types';

const REQUIRED_FIELDS: (keyof ShippingAddressRequest)[] = ['fullName', 'email', 'line1', 'city', 'state', 'postalCode'];

// Scoped to this page only -- Stripe's own hosted checkout (the next step after this one) uses
// rounded corners, light neutral borders, and a soft focus ring, which reads as more trustworthy
// for a page asking someone to type in their address than the sharp-cornered boxes used sitewide.
const FIELD = 'w-full rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15';
const FIELD_LABEL = 'mb-1.5 block text-[13px] font-medium text-ink/55';
const PANEL = 'rounded-xl border border-[#e8e8e8] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]';
const PRIMARY_BUTTON = 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 text-sm font-semibold text-paper shadow-sm transition-all hover:bg-ink/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40';

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

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  const [rates, setRates] = useState<ShippingRateOption[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRateOption | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CartResponse>('/api/cart', { cartToken: getCartToken() })
      .then((data) => {
        if (data.cartToken) setCartToken(data.cartToken);
        setCart(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateAddress<K extends keyof ShippingAddressRequest>(field: K, value: ShippingAddressRequest[K]) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setRates(null);
    setSelectedRate(null);
  }

  const addressComplete = REQUIRED_FIELDS.every((field) => address[field] && String(address[field]).trim() !== '');
  const addressConfirmed = rates !== null;

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
      const res = await apiFetch<{ checkoutUrl: string }>('/api/checkout/session', {
        method: 'POST',
        cartToken: getCartToken(),
        body: request
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not start payment. Please try again.');
      setSubmitting(false);
    }
  }

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
              {addressConfirmed && (
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
                <p>{address.email}</p>
              </div>
            ) : (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={FIELD_LABEL}>Full name</label>
                    <input className={FIELD} value={address.fullName} onChange={(e) => updateAddress('fullName', e.target.value)} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Email</label>
                    <input
                      type="email"
                      className={FIELD}
                      value={address.email}
                      onChange={(e) => updateAddress('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Phone (optional)</label>
                    <input className={FIELD} value={address.phone ?? ''} onChange={(e) => updateAddress('phone', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={FIELD_LABEL}>Street address</label>
                    <input className={FIELD} value={address.line1} onChange={(e) => updateAddress('line1', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={FIELD_LABEL}>Apartment, suite, etc. (optional)</label>
                    <input className={FIELD} value={address.line2 ?? ''} onChange={(e) => updateAddress('line2', e.target.value)} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>City</label>
                    <input className={FIELD} value={address.city} onChange={(e) => updateAddress('city', e.target.value)} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>State</label>
                    <input
                      className={FIELD}
                      placeholder="e.g. CA"
                      value={address.state}
                      onChange={(e) => updateAddress('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>ZIP code</label>
                    <input
                      className={FIELD}
                      value={address.postalCode}
                      onChange={(e) => updateAddress('postalCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Country</label>
                    <input className={`${FIELD} bg-[#fafafa] text-ink/50`} value="United States" disabled />
                  </div>
                </div>

                <button onClick={fetchRates} disabled={!addressComplete || fetchingRates} className={`${PRIMARY_BUTTON} sm:w-auto`}>
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
            </div>

            <div className="p-6 sm:p-8">
              {rates && rates.length > 0 ? (
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
                  <button onClick={fetchRates} disabled={fetchingRates} className="btn-ghost text-[11px] pt-1">
                    {fetchingRates ? 'Refreshing…' : 'Refresh rates'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-ink/40">Enter your address above to see available delivery methods.</p>
              )}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className={`${PANEL} sticky top-24 p-6 sm:p-7 space-y-5`}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Order summary</h2>
            <div className="space-y-2.5 text-sm">
              {cart.items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between text-ink/70">
                  <span className="truncate pr-2">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-mono">${item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
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
            <button onClick={continueToPayment} disabled={!selectedRate || submitting} className={PRIMARY_BUTTON}>
              {submitting ? 'Redirecting to Stripe…' : 'Continue to payment'}
            </button>
            {submitError && <p className="text-xs font-medium text-red-600">{submitError}</p>}

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
