const db = require('../../config/db');

const TRANSACTION_TYPES = ['Vé vào cửa', 'Dịch vụ lẻ', 'Phạt lố giờ', 'VIP', 'Sự kiện'];
const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản'];

function normalizeTransactionType(type) {
  if (!TRANSACTION_TYPES.includes(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  return type;
}

function normalizePaymentMethod(paymentMethod) {
  return PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'Tiền mặt';
}

async function recordTransaction(connection, {
  amount,
  type,
  paymentMethod = 'Tiền mặt',
  staffId = null,
  customerId = null,
  sessionId = null,
  orderId = null,
  eventRegistrationId = null,
  vipTransactionId = null,
  note = null,
}) {
  const executor = connection || db;
  const normalizedAmount = Number(amount || 0);
  const [result] = await executor.query(
    `INSERT INTO Transactions
      (Amount, Type, PaymentMethod, StaffID, CustomerID, SessionID, OrderID,
       EventRegistrationID, VIPTransactionID, Note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizedAmount,
      normalizeTransactionType(type),
      normalizePaymentMethod(paymentMethod),
      staffId,
      customerId,
      sessionId,
      orderId,
      eventRegistrationId,
      vipTransactionId,
      note,
    ],
  );
  return result.insertId;
}

module.exports = {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  normalizePaymentMethod,
  recordTransaction,
};
