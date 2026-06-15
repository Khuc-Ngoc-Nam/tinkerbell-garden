const db = require('../../config/db');
const { badRequest, notFound } = require('../../utils/http');
const { getStaffAssignment } = require('../facility/facility.service');
const { hashPassword, signToken, verifyPassword } = require('../../utils/security');

function publicStaff(row) {
  return {
    id: row.StaffID,
    fullName: row.FullName,
    username: row.Username,
    role: row.Role,
  };
}

async function staffWithAssignment(row) {
  const user = publicStaff(row);
  user.assignment = await getStaffAssignment(row.StaffID);
  return user;
}

function publicCustomer(row) {
  return {
    id: row.CustomerID,
    fullName: row.FullName,
    username: row.Email || row.Phone,
    email: row.Email,
    phone: row.Phone,
    isVip: Boolean(row.IsVIP),
    vipExpiryDate: row.VIPExpiryDate,
    accumulatedHours: Number(row.AccumulatedHours || 0),
    loyaltyPoints: Number(row.LoyaltyPoints || 0),
  };
}

async function loginStaff({ username, password }) {
  if (!username || !password) {
    throw badRequest('Username and password are required');
  }

  const [rows] = await db.query(
    `SELECT s.StaffID, s.FullName, s.Username, s.PasswordHash, s.Role
     FROM Staff s
     WHERE s.Username = ? AND s.Active = TRUE
     LIMIT 1`,
    [username],
  );

  const staff = rows[0];
  if (!staff || !verifyPassword(password, staff.PasswordHash)) {
    throw badRequest('Invalid staff credentials');
  }

  const user = await staffWithAssignment(staff);
  const token = signToken({ type: 'staff', sub: user.id, role: user.role, username: user.username });
  return { token, user };
}

async function login({ identifier, password }) {
  if (!identifier || !password) {
    throw badRequest('Account and password are required');
  }

  const [staffRows] = await db.query(
    `SELECT s.StaffID, s.FullName, s.Username, s.PasswordHash, s.Role
     FROM Staff s
     WHERE s.Username = ? AND s.Active = TRUE
     LIMIT 1`,
    [identifier],
  );
  const staff = staffRows[0];
  if (staff && verifyPassword(password, staff.PasswordHash)) {
    const user = await staffWithAssignment(staff);
    const token = signToken({ type: 'staff', sub: user.id, role: user.role, username: user.username });
    return { type: 'staff', token, user };
  }

  const [customerRows] = await db.query(
    `SELECT *
     FROM Customer
     WHERE (Email = ? OR Phone = ?) AND PasswordHash IS NOT NULL
     LIMIT 1`,
    [identifier, identifier],
  );
  const customer = customerRows[0];
  if (customer && verifyPassword(password, customer.PasswordHash)) {
    const user = publicCustomer(customer);
    const token = signToken({ type: 'customer', sub: user.id, email: user.email });
    return { type: 'customer', token, user };
  }

  throw badRequest('Invalid account or password');
}

async function registerCustomer({ fullName, email, phone, password }) {
  if (!fullName || !email || !phone || !password) {
    throw badRequest('Full name, email, phone and password are required');
  }

  const [existing] = await db.query(
    `SELECT *
     FROM Customer
     WHERE Email = ? OR Phone = ?`,
    [email, phone],
  );
  if (existing.length > 0) {
    if (existing.length > 1) {
      throw badRequest('Email and phone are linked to different customer records');
    }

    const current = existing[0];
    if (current.PasswordHash) {
      throw badRequest('Customer with this email or phone already exists');
    }
    if (current.Email && current.Email !== email) {
      throw badRequest('Phone is already linked to another email');
    }
    if (current.Phone && current.Phone !== phone) {
      throw badRequest('Email is already linked to another phone');
    }

    await db.query(
      `UPDATE Customer
       SET FullName = ?,
           Email = ?,
           Phone = ?,
           PasswordHash = ?,
           UpdatedAt = NOW()
       WHERE CustomerID = ?`,
      [fullName, email, phone, hashPassword(password), current.CustomerID],
    );

    const [rows] = await db.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [current.CustomerID]);
    const user = publicCustomer(rows[0]);
    const token = signToken({ type: 'customer', sub: user.id, email: user.email });
    return { type: 'customer', token, user };
  }

  const [result] = await db.query(
    `INSERT INTO Customer (FullName, Email, Phone, PasswordHash)
     VALUES (?, ?, ?, ?)`,
    [fullName, email, phone, hashPassword(password)],
  );

  const [rows] = await db.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [result.insertId]);
  const user = publicCustomer(rows[0]);
  const token = signToken({ type: 'customer', sub: user.id, email: user.email });
  return { type: 'customer', token, user };
}

async function loginCustomer({ emailOrPhone, password }) {
  if (!emailOrPhone || !password) {
    throw badRequest('Email/phone and password are required');
  }

  const [rows] = await db.query(
    `SELECT *
     FROM Customer
     WHERE (Email = ? OR Phone = ?) AND PasswordHash IS NOT NULL
     LIMIT 1`,
    [emailOrPhone, emailOrPhone],
  );

  const customer = rows[0];
  if (!customer || !verifyPassword(password, customer.PasswordHash)) {
    throw badRequest('Invalid customer credentials');
  }

  const user = publicCustomer(customer);
  const token = signToken({ type: 'customer', sub: user.id, email: user.email });
  return { token, user };
}

async function getCurrentUser(user) {
  if (user.type === 'staff') {
    const [rows] = await db.query(
      `SELECT s.StaffID, s.FullName, s.Username, s.Role
       FROM Staff s
       WHERE s.StaffID = ? AND s.Active = TRUE`,
      [user.sub],
    );
    if (!rows[0]) throw notFound('Staff account not found');
    return { type: 'staff', user: await staffWithAssignment(rows[0]) };
  }

  const [rows] = await db.query(`SELECT * FROM Customer WHERE CustomerID = ?`, [user.sub]);
  if (!rows[0]) throw notFound('Customer account not found');
  return { type: 'customer', user: publicCustomer(rows[0]) };
}

async function changePassword(user, { currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw badRequest('Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu mới');
  }
  if (newPassword !== confirmPassword) {
    throw badRequest('Mật khẩu mới và nhập lại mật khẩu mới không khớp');
  }
  if (String(newPassword).length < 6) {
    throw badRequest('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  if (user.type === 'staff') {
    const [rows] = await db.query(
      `SELECT StaffID, PasswordHash
       FROM Staff
       WHERE StaffID = ? AND Active = TRUE
       LIMIT 1`,
      [user.sub],
    );
    const staff = rows[0];
    if (!staff) throw notFound('Staff account not found');
    if (!verifyPassword(currentPassword, staff.PasswordHash)) {
      throw badRequest('Mật khẩu cũ không đúng');
    }

    await db.query(
      `UPDATE Staff SET PasswordHash = ? WHERE StaffID = ?`,
      [hashPassword(newPassword), user.sub],
    );
    return { changed: true };
  }

  const [rows] = await db.query(
    `SELECT CustomerID, PasswordHash
     FROM Customer
     WHERE CustomerID = ? AND PasswordHash IS NOT NULL
     LIMIT 1`,
    [user.sub],
  );
  const customer = rows[0];
  if (!customer) throw notFound('Customer account not found');
  if (!verifyPassword(currentPassword, customer.PasswordHash)) {
    throw badRequest('Mật khẩu cũ không đúng');
  }

  await db.query(
    `UPDATE Customer
     SET PasswordHash = ?, UpdatedAt = NOW()
     WHERE CustomerID = ?`,
    [hashPassword(newPassword), user.sub],
  );
  return { changed: true };
}

module.exports = {
  changePassword,
  getCurrentUser,
  login,
  loginCustomer,
  loginStaff,
  publicCustomer,
  registerCustomer,
};
