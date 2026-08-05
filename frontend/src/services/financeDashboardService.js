import { getInvoices } from './invoiceService';
import { getPayments } from './paymentService';
import { getPurchaseOrders } from './purchaseOrderService';
import { getMyNotifications } from './financeNotificationService';

export async function getFinanceDashboardMetrics() {
  const [pos, invoices, payments, notifications] = await Promise.all([
    getPurchaseOrders().catch(() => []),
    getInvoices().catch(() => []),
    getPayments().catch(() => []),
    getMyNotifications().catch(() => []),
  ]);

  // PurchaseOrder/Payment DTOs use PascalCase JSON keys from the backend, but
  // ContractorInvoiceResponseDTO has no @JsonProperty overrides and stays camelCase.
  const pendingPOs = pos.filter((po) => po.Status === 'PENDING').length;
  const invoicesReady = invoices.filter((inv) => inv.status === 'APPROVED').length;
  const paymentsPending = payments.filter((p) => p.Status === 'PENDING').length;
  const paymentsCompleted = payments.filter((p) => p.Status === 'PROCESSED').length;

  const totalInvoiceValue = invoices.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || 0), 0);
  const totalPayments = payments
    .filter((p) => p.Status === 'PROCESSED')
    .reduce((acc, curr) => acc + parseFloat(curr.PaidAmount || 0), 0);
  const approvedInvoicesSum = invoices
    .filter((inv) => ['APPROVED', 'PAID'].includes(inv.status))
    .reduce((acc, curr) => acc + parseFloat(curr.totalAmount || 0), 0);
  const outstandingAmount = Math.max(0, approvedInvoicesSum - totalPayments);

  // Recent timeline events (NotificationResponseDTO mixes PascalCase and camelCase keys)
  const recentActivities = notifications.slice(0, 20).map((n) => ({
    id: n.NotificationID,
    title: n.Title || n.Category,
    desc: n.Message,
    time: n.CreatedDate,
  }));

  const paymentSummary = {
    pending: payments.filter((p) => p.Status === 'PENDING').length,
    failed: payments.filter((p) => p.Status === 'FAILED').length,
    paid: paymentsCompleted,
  };

  return {
    pendingPOs,
    invoicesReady,
    paymentsPending,
    paymentsCompleted,
    totalInvoiceValue,
    totalPayments,
    outstandingAmount,
    recentActivities,
    paymentSummary,
  };
}
