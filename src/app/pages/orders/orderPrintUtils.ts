import type { Transaction } from '@/shared/types/transaction.types';

export function groupOrdersByDate(orders: Transaction[]) {
  const grouped: Record<string, Transaction[]> = {};

  orders.forEach((order) => {
    const dateKey = new Date(order.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(order);
  });

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return { grouped, sortedDates };
}

interface BusinessInfo {
  name?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
}

function buildReceiptHtml(
  ordersToPrint: Transaction[],
  businessInfo: BusinessInfo,
  totalAmount: number,
  totalOrders: number
): string {
  const businessName = businessInfo.name || 'Store Manager';
  const businessAddress = businessInfo.address || '';
  const businessPhone = businessInfo.phoneNumber || '';

  const ordersHtml = ordersToPrint
    .map(
      (order) => `
    <div class="order-section">
      <div class="order-header">
        <span class="order-id">#${order.id.slice(-8).toUpperCase()}</span>
        <span>${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="client-name">${order.clientName || 'Walk-in'}</div>
      <table class="items-table">
        ${order.items
          .map(
            (item) => `
          <tr>
            <td class="item-name">${item.itemName || 'Item'}</td>
            <td class="item-qty">${item.quantity}</td>
            <td class="item-total">$${item.totalPrice.toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </table>
      <div class="order-total">
        <span>Total:</span>
        <span>$${order.totalPrice.toFixed(2)}</span>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${new Date().toLocaleDateString()}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 5mm;
            background: #fff;
          }
          .header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
          }
          .business-name { font-size: 16px; font-weight: bold; }
          .business-info { font-size: 10px; color: #333; }
          .order-section {
            padding: 8px 0;
            border-bottom: 1px dashed #ccc;
            page-break-inside: avoid;
          }
          .order-header {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 4px;
          }
          .order-id { font-weight: bold; }
          .client-name { font-size: 11px; margin-bottom: 4px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table td { padding: 2px 0; font-size: 11px; }
          .item-name { text-align: left; }
          .item-qty { text-align: center; width: 30px; }
          .item-total { text-align: right; width: 50px; }
          .order-total {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding-top: 4px;
            border-top: 1px dotted #999;
            margin-top: 4px;
          }
          .grand-total {
            text-align: center;
            padding: 10px 0;
            margin-top: 8px;
            border-top: 2px solid #000;
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            padding-top: 8px;
            color: #666;
          }
          @media print {
            body { width: 80mm; }
            .order-section { break-inside: avoid; }
          }
          @page { margin: 0; size: 80mm auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${businessName}</div>
          ${businessAddress ? `<div class="business-info">${businessAddress}</div>` : ''}
          ${businessPhone ? `<div class="business-info">${businessPhone}</div>` : ''}
        </div>
        
        ${ordersHtml}
        
        <div class="grand-total">
          <div>GRAND TOTAL: $${totalAmount.toFixed(2)}</div>
          <div style="font-size: 11px; font-weight: normal;">${totalOrders} order${totalOrders > 1 ? 's' : ''}</div>
        </div>
        
        <div class="footer">
          <p>${new Date().toLocaleString()}</p>
          <p>Thank you!</p>
        </div>
      </body>
    </html>
  `;
}

function buildReportHtml(
  _ordersToPrint: Transaction[],
  businessInfo: BusinessInfo,
  totalAmount: number,
  totalOrders: number,
  grouped: Record<string, Transaction[]>,
  sortedDates: string[]
): string {
  const businessName = businessInfo.name || 'Store Manager';
  const businessAddress = businessInfo.address || '';
  const businessPhone = businessInfo.phoneNumber || '';
  const businessEmail = businessInfo.email || '';

  const dateGroupsHtml = sortedDates
    .map((dateKey) => {
      const dateOrders = grouped[dateKey] ?? [];
      const dateTotalAmount = dateOrders.reduce(
        (sum, o) => sum + o.totalPrice,
        0
      );

      const ordersHtml = dateOrders
        .map(
          (order) => `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">#${order.id.slice(-8).toUpperCase()}</div>
          <div class="order-time">${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
        </div>
        
        <div class="client-info">
          <strong>${order.clientName || 'Walk-in Customer'}</strong>
          ${order.clientPhoneNumber ? `<span class="client-phone">📞 ${order.clientPhoneNumber}</span>` : ''}
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th class="item-name">Item</th>
              <th class="item-qty">Qty</th>
              <th class="item-price">Price</th>
              <th class="item-total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td class="item-name">${item.itemName || 'Item'}</td>
                <td class="item-qty">${item.quantity}</td>
                <td class="item-price">$${item.unitPrice.toFixed(2)}${item.listedPrice !== item.unitPrice ? `<br><s class="original-price">$${item.listedPrice.toFixed(2)}</s>` : ''}</td>
                <td class="item-total">$${item.totalPrice.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        
        <div class="order-total">
          <span>Order Total:</span>
          <span class="total-amount">$${order.totalPrice.toFixed(2)}</span>
        </div>
      </div>
    `
        )
        .join('');

      return `
      <div class="date-section">
        <div class="date-header">
          <div class="date-separator">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div class="date-title">📅 ${dateKey}</div>
          <div class="date-summary">${dateOrders.length} order${dateOrders.length > 1 ? 's' : ''} • Total: $${dateTotalAmount.toFixed(2)}</div>
          <div class="date-separator">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        </div>
        <div class="orders-list">
          ${ordersHtml}
        </div>
      </div>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Business Report - ${new Date().toLocaleDateString()}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #fff;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .report-header {
            text-align: center;
            padding-bottom: 20px;
            margin-bottom: 20px;
            border-bottom: 3px double #333;
          }
          .business-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
          .business-contact {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
          }
          .report-title { font-size: 18px; color: #666; margin-bottom: 10px; }
          .report-meta { font-size: 11px; color: #888; }
          
          .summary-box {
            display: flex;
            justify-content: space-around;
            background: #f5f5f5;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .summary-item { text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
          
          .date-section { margin-bottom: 30px; }
          .date-header { text-align: center; margin-bottom: 20px; }
          .date-separator { color: #ccc; font-size: 10px; letter-spacing: 2px; }
          .date-title { font-size: 18px; font-weight: bold; color: #1e40af; margin: 10px 0; }
          .date-summary { font-size: 13px; color: #666; }
          
          .orders-list { 
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          
          .order-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
            page-break-inside: avoid;
          }
          .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          .order-id { font-weight: bold; font-family: monospace; font-size: 14px; }
          .order-time { color: #666; font-size: 12px; }
          .order-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          
          .client-info { margin-bottom: 12px; font-size: 13px; }
          .client-phone { margin-left: 15px; color: #666; }
          
          .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
          .items-table th { background: #e5e7eb; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .items-table td { padding: 8px; border-bottom: 1px solid #eee; }
          .item-qty, .item-price, .item-total { text-align: center; width: 80px; }
          .item-total { text-align: right; }
          .original-price { color: #999; font-size: 10px; }
          
          .order-total { display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: bold; font-size: 14px; }
          .total-amount { font-size: 16px; color: #059669; }
          
          .report-footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; text-align: center; color: #666; font-size: 12px; }
          
          @media print {
            body { padding: 10px; max-width: none; }
            .order-card { break-inside: avoid; }
            .date-section { break-inside: avoid-page; }
          }
          @page { margin: 0.5in; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="business-name">${businessName}</div>
          ${
            businessAddress || businessPhone || businessEmail
              ? `
          <div class="business-contact">
            ${businessAddress ? `<span>${businessAddress}</span>` : ''}
            ${businessPhone ? `<span>📞 ${businessPhone}</span>` : ''}
            ${businessEmail ? `<span>✉ ${businessEmail}</span>` : ''}
          </div>
          `
              : ''
          }
          <div class="report-title">Business Report</div>
          <div class="report-meta">
            Generated on ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        
        <div class="summary-box">
          <div class="summary-item">
            <div class="summary-value">${totalOrders}</div>
            <div class="summary-label">Total Orders</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">$${totalAmount.toFixed(2)}</div>
            <div class="summary-label">Total Revenue</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${sortedDates.length}</div>
            <div class="summary-label">Days</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">$${(totalAmount / totalOrders).toFixed(2)}</div>
            <div class="summary-label">Avg. Order</div>
          </div>
        </div>
        
        ${dateGroupsHtml}
        
        <div class="report-footer">
          <p>End of Report • ${totalOrders} orders across ${sortedDates.length} day(s)</p>
          <p>Thank you for using Store Manager!</p>
        </div>
      </body>
    </html>
  `;
}

export function handlePrintReceipts(
  ordersToPrint: Transaction[],
  mode: 'report' | 'receipt',
  businessInfo: BusinessInfo
): void {
  if (ordersToPrint.length === 0) return;

  const { grouped, sortedDates } = groupOrdersByDate(ordersToPrint);
  const totalAmount = ordersToPrint.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalOrders = ordersToPrint.length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html =
    mode === 'receipt'
      ? buildReceiptHtml(ordersToPrint, businessInfo, totalAmount, totalOrders)
      : buildReportHtml(
          ordersToPrint,
          businessInfo,
          totalAmount,
          totalOrders,
          grouped,
          sortedDates
        );

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}
