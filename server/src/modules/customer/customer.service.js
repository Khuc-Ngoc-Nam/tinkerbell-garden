const db = require('../../config/db');
const { badRequest, notFound } = require('../../utils/http');
const { hashPassword } = require('../../utils/security');
const { publicCustomer } = require('../auth/auth.service');
const { recordTransaction } = require('../transaction/transaction.service');

const VIP_PACKAGES = {
  1: 400000,
  2: 750000,
  3: 1000000,
};

const VIP_ANNUAL_FEE = VIP_PACKAGES[1];

function packageAmount(years) {
  const normalizedYears = Number(years || 1);
  if (!VIP_PACKAGES[normalizedYears]) throw badRequest('VIP package is invalid');
  return { years: normalizedYears, amount: VIP_PACKAGES[normalizedYears] };
}

async function findCustomerByUsername(username, connection = db) {
  const account = String(username || '').trim();
  if (!account) return null;

  const [rows] = await connection.query(
    `SELECT *
     FROM Customer
     WHERE Email = ? OR Phone = ?
     LIMIT 1`,
    [account, account],
  );
  return rows[0] || null;
}

async function lookupCustomerByUsername(username) {
  const customer = await findCustomerByUsername(username);
  if (!customer) throw notFound('Customer not found');
  return publicCustomer(customer);
}

async function findOrCreateCustomer(connection, { fullName, email, phone, password }) {
  if (!fullName || !phone) {
    throw badRequest('Customer name and phone are required');
  }

  const executor = connection || db;
  const [existing] = await executor.query(
    `SELECT * FROM Customer WHERE Phone = ? OR (Email IS NOT NULL AND Email = ?) LIMIT 1`,
    [phone, email || null],
  );

  if (existing[0]) {
    return existing[0];
  }

  const [result] = await executor.query(
    `INSERT INTO Customer (FullName, Email, Phone, PasswordHash)
     VALUES (?, ?, ?, ?)`,
    [fullName, email || null, phone, password ? hashPassword(password) : null],
  );
  const [rows] = await executor.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [result.insertId]);
  return rows[0];
}

async function listCustomers() {
  const [rows] = await db.query(
    `SELECT CustomerID, FullName, Email, Phone, IsVIP, VIPExpiryDate, AccumulatedHours, LoyaltyPoints, CreatedAt
     FROM Customer
     ORDER BY CreatedAt DESC`,
  );
  return rows.map(publicCustomer);
}

async function listVipCustomers({ search = '' } = {}) {
  const params = [];
  let where = `WHERE IsVIP = TRUE AND VIPExpiryDate IS NOT NULL AND VIPExpiryDate >= NOW()`;
  if (search) {
    where += ` AND (Email LIKE ? OR Phone LIKE ? OR FullName LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [rows] = await db.query(
    `SELECT CustomerID, FullName, Email, Phone, IsVIP, VIPExpiryDate, AccumulatedHours, LoyaltyPoints, CreatedAt
     FROM Customer
     ${where}
     ORDER BY VIPExpiryDate ASC`,
    params,
  );
  return rows.map(publicCustomer);
}

async function getCustomer(customerId) {
  const [rows] = await db.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [customerId]);
  if (!rows[0]) throw notFound('Customer not found');
  return publicCustomer(rows[0]);
}

async function applyVipRenewal(connection, customer, {
  years = 1,
  amount = VIP_ANNUAL_FEE,
  channel = 'Counter',
  staffId = null,
  paymentMethod = 'Tiền mặt',
  recordRevenue = channel === 'Counter',
}) {
  const [freshRows] = await connection.query(`SELECT * FROM Customer WHERE CustomerID = ? FOR UPDATE`, [
    customer.CustomerID,
  ]);
  const fresh = freshRows[0];
  if (!fresh) throw notFound('Customer not found');

  const baseDate =
    fresh.VIPExpiryDate && new Date(fresh.VIPExpiryDate) > new Date() ? 'VIPExpiryDate' : 'NOW()';

  await connection.query(
    `UPDATE Customer
     SET IsVIP = TRUE,
         VIPExpiryDate = DATE_ADD(${baseDate}, INTERVAL ? YEAR),
         UpdatedAt = NOW()
     WHERE CustomerID = ?`,
    [years, customer.CustomerID],
  );

  const [vipResult] = await connection.query(
    `INSERT INTO VIPTransaction (CustomerID, StaffID, Amount, Channel, TransactionType, Status, PaidAt)
     VALUES (?, ?, ?, ?, ?, 'Paid', NOW())`,
    [customer.CustomerID, staffId, amount, channel, fresh.IsVIP ? 'Renew' : 'Register'],
  );

  if (recordRevenue) {
    await recordTransaction(connection, {
      amount,
      type: 'VIP',
      paymentMethod,
      staffId,
      customerId: customer.CustomerID,
      vipTransactionId: vipResult.insertId,
      note: `${years} năm`,
    });
  }
}

function mapVipPaymentRequest(row) {
  return {
    id: row.VipRequestID,
    customerId: row.CustomerID,
    customerName: row.FullName,
    username: row.Email || row.Phone,
    email: row.Email,
    phone: row.Phone,
    years: Number(row.Years || 1),
    amount: Number(row.Amount || 0),
    requestType: row.RequestType,
    status: row.Status,
    transferContent: row.TransferContent,
    createdAt: row.CreatedAt,
  };
}

async function registerOrRenewVip({ fullName, email, phone, password, channel = 'Counter', staffId = null, years = 1 }) {
  const vipPackage = packageAmount(years);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const customer = await findOrCreateCustomer(connection, { fullName, email, phone, password });
    await applyVipRenewal(connection, customer, { ...vipPackage, channel, staffId });
    await connection.commit();
    return getCustomer(customer.CustomerID);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function registerOrRenewVipForCustomer({ customerId, channel = 'Online', staffId = null, years = 1 }) {
  if (!customerId) {
    throw badRequest('Customer account is required');
  }

  const vipPackage = packageAmount(years);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [customerId]);
    if (!rows[0]) throw notFound('Customer not found');
    await applyVipRenewal(connection, rows[0], { ...vipPackage, channel, staffId });
    await connection.commit();
    return getCustomer(customerId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function registerOrRenewVipAtCounter({ username, years = 1, staffId = null, paymentMethod = 'Tiền mặt' }) {
  const account = String(username || '').trim();
  if (!account) throw badRequest('Customer username is required');
  const vipPackage = packageAmount(years);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const customer = await findCustomerByUsername(account, connection);
    if (!customer) throw notFound('Yêu cầu đăng ký tài khoản trên trang chủ');
    await applyVipRenewal(connection, customer, {
      ...vipPackage,
      channel: 'Counter',
      staffId,
      paymentMethod,
    });
    await connection.commit();
    return getCustomer(customer.CustomerID);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createVipPaymentRequest({ customerId, years = 1 }) {
  if (!customerId) throw badRequest('Customer account is required');
  const vipPackage = packageAmount(years);
  const [rows] = await db.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [customerId]);
  const customer = rows[0];
  if (!customer) throw notFound('Customer not found');

  const requestType = customer.IsVIP ? 'Renew' : 'Register';
  const transferContent = `${customer.Email || customer.Phone} + gói đăng ký`;
  const [result] = await db.query(
    `INSERT INTO VipPaymentRequest (CustomerID, Years, Amount, RequestType, Status, TransferContent)
     VALUES (?, ?, ?, ?, 'PendingReview', ?)`,
    [customerId, vipPackage.years, vipPackage.amount, requestType, transferContent],
  );
  return {
    id: result.insertId,
    years: vipPackage.years,
    amount: vipPackage.amount,
    requestType,
    transferContent,
  };
}

async function listVipPaymentRequests({ search = '' } = {}) {
  const params = [];
  let where = `WHERE vpr.Status = 'PendingReview'`;
  if (search) {
    where += ` AND (c.Email LIKE ? OR c.Phone LIKE ? OR c.FullName LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [rows] = await db.query(
    `SELECT vpr.*, c.FullName, c.Email, c.Phone
     FROM VipPaymentRequest vpr
     JOIN Customer c ON c.CustomerID = vpr.CustomerID
     ${where}
     ORDER BY vpr.CreatedAt ASC`,
    params,
  );
  return rows.map(mapVipPaymentRequest);
}

async function approveVipPaymentRequest({ requestId, staffId = null }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT vpr.*, c.*
       FROM VipPaymentRequest vpr
       JOIN Customer c ON c.CustomerID = vpr.CustomerID
       WHERE vpr.VipRequestID = ?
       FOR UPDATE`,
      [requestId],
    );
    const row = rows[0];
    if (!row) throw notFound('VIP payment request not found');
    if (row.Status !== 'PendingReview') throw badRequest('VIP payment request has already been processed');

    const customer = {
      CustomerID: row.CustomerID,
      FullName: row.FullName,
      Email: row.Email,
      Phone: row.Phone,
      IsVIP: row.IsVIP,
      VIPExpiryDate: row.VIPExpiryDate,
    };
    await applyVipRenewal(connection, customer, {
      years: Number(row.Years || 1),
      amount: Number(row.Amount || 0),
      channel: 'Online',
      staffId,
      paymentMethod: 'Chuyển khoản',
      recordRevenue: true,
    });
    await connection.query(
      `UPDATE VipPaymentRequest
       SET Status = 'Approved'
       WHERE VipRequestID = ?`,
      [requestId],
    );
    await connection.commit();
    return getCustomer(row.CustomerID);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCustomerBookings(customerId) {
  const [rows] = await db.query(
    `SELECT eb.BookingID, eb.QRCode, eb.Status, eb.Quantity, eb.FinalAmount,
            ec.EventName, ec.StartDate, ec.EndDate
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     WHERE eb.CustomerID = ?
     ORDER BY eb.BookingDate DESC`,
    [customerId],
  );
  return rows;
}

module.exports = {
  VIP_ANNUAL_FEE,
  VIP_PACKAGES,
  createVipPaymentRequest,
  approveVipPaymentRequest,
  findCustomerByUsername,
  findOrCreateCustomer,
  getCustomer,
  getCustomerBookings,
  listCustomers,
  listVipPaymentRequests,
  listVipCustomers,
  lookupCustomerByUsername,
  registerOrRenewVip,
  registerOrRenewVipAtCounter,
  registerOrRenewVipForCustomer,
};
