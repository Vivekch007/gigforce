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

  const pendingPOs = pos.filter(po => po.status === 'SUBMITTED' || po.status === 'UNDER_REVIEW').length;
  const invoicesReady = invoices.filter(inv => inv.status === 'APPROVED' || inv.status === 'READY_FOR_PAYMENT').length;
  const paymentsPending = payments.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').length;
  const paymentsCompleted = payments.filter(p => p.status === 'PAID').length;

  const totalInvoiceValue = invoices.reduce((acc, curr) => acc + parseFloat(curr.invoiceAmount || 0), 0);
  const totalPayments = payments.filter(p => p.status === 'PAID').reduce((acc, curr) => acc + parseFloat(curr.paidAmount || 0), 0);
  const approvedInvoicesSum = invoices.filter(inv => ['APPROVED', 'READY_FOR_PAYMENT', 'READY FOR PAYMENT', 'PAID'].includes(inv.status?.toUpperCase())).reduce((acc, curr) => acc + parseFloat(curr.invoiceAmount || 0), 0);
  const outstandingAmount = Math.max(0, approvedInvoicesSum - totalPayments);

  // Recent timeline events
  const recentActivities = notifications.slice(0, 5).map(n => ({
    id: n.NotificationID,
    title: n.Title || n.Category,
    desc: n.Message,
    time: n.CreatedDate,
  }));

  // Payment summaries
  const paymentSummary = {
    pending: payments.filter(p => p.status === 'PENDING').length,
    processing: payments.filter(p => p.status === 'PROCESSING').length,
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
