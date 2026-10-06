import { jsPDF } from 'jspdf';
import type { OrderResponse } from './types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Builds a simple one-page (or more, if the cart is huge) receipt entirely client-side -- no
 * backend involvement needed since every field it needs is already on the order the page loaded. */
export function downloadReceiptPdf(order: OrderResponse) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightEdge = 547;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('GRAPHITES', marginX, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Order Receipt', marginX, y + 16);
  doc.setTextColor(0);

  y += 44;
  doc.setFontSize(10);
  doc.text(`Order ID: ${order.id}`, marginX, y);
  y += 14;
  doc.text(`Date: ${formatDate(order.createdAt)}`, marginX, y);
  y += 14;
  doc.text(`Email: ${order.email}`, marginX, y);
  y += 14;
  doc.text(`Status: ${order.status}`, marginX, y);
  if (order.selectedCarrier) {
    y += 14;
    doc.text(`Delivery method: ${order.selectedCarrier}${order.selectedServiceLevel ? ' ' + order.selectedServiceLevel : ''}`, marginX, y);
  }

  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', marginX, y);
  doc.text('Qty', 330, y);
  doc.text('Unit Price', 390, y);
  doc.text('Line Total', 480, y);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.setDrawColor(200);
  doc.line(marginX, y, rightEdge, y);
  y += 16;

  for (const item of order.items) {
    if (y > pageHeight - 140) {
      doc.addPage();
      y = 56;
    }
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(item.productName, marginX, y, { maxWidth: 260 });
    doc.text(String(item.quantity), 330, y);
    doc.text(`$${item.unitPrice.toFixed(2)}`, 390, y);
    doc.text(`$${item.lineTotal.toFixed(2)}`, 480, y);
    if (item.variantAttributes) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(item.variantAttributes, marginX, y + 11);
      y += 26;
    } else {
      y += 20;
    }
  }

  doc.setTextColor(0);
  y += 8;
  doc.setDrawColor(200);
  doc.line(marginX, y, rightEdge, y);
  y += 20;

  function totalsRow(label: string, value: string, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, 390, y);
    doc.text(value, 480, y);
    y += bold ? 20 : 16;
  }

  totalsRow('Subtotal', `$${order.subtotal.toFixed(2)}`);
  totalsRow('Tax', `$${order.taxAmount.toFixed(2)}`);
  totalsRow('Shipping', order.shippingAmount === 0 ? 'Free' : `$${order.shippingAmount.toFixed(2)}`);
  y += 4;
  totalsRow('Total', `$${order.total.toFixed(2)} ${order.currency || 'USD'}`, true);

  doc.save(`graphites-receipt-${order.id.slice(0, 8)}.pdf`);
}
