const db = require('../../config/db');
const { badRequest, notFound } = require('../../utils/http');
const { hashPassword } = require('../../utils/security');

function mapStaff(row) {
  return {
    id: row.StaffID,
    fullName: row.FullName,
    username: row.Username,
    role: row.Role,
    cccd: row.CCCD || '',
    passwordLabel: 'Đã mã hóa',
  };
}

async function ensureUniqueUsername(username, currentId = null) {
  const params = [username];
  let where = 'Username = ? AND Active = TRUE';
  if (currentId) {
    where += ' AND StaffID <> ?';
    params.push(currentId);
  }

  const [rows] = await db.query(`SELECT StaffID FROM Staff WHERE ${where} LIMIT 1`, params);
  if (rows.length) throw badRequest('Username nhân viên đã tồn tại');
}

async function listStaff() {
  const [rows] = await db.query(
    `SELECT StaffID, FullName, Username, Role, CCCD
     FROM Staff
     WHERE Active = TRUE
     ORDER BY Role = 'Manager' DESC, FullName ASC, StaffID ASC`,
  );
  return rows.map(mapStaff);
}

async function createStaff({ fullName, username, password, cccd }) {
  const normalizedName = String(fullName || '').trim();
  const normalizedUsername = String(username || '').trim();
  const normalizedCccd = String(cccd || '').trim();

  if (!normalizedName || !normalizedUsername || !password) {
    throw badRequest('Vui lòng nhập họ tên, username và password');
  }
  if (String(password).length < 6) {
    throw badRequest('Password phải có ít nhất 6 ký tự');
  }

  await ensureUniqueUsername(normalizedUsername);
  const [result] = await db.query(
    `INSERT INTO Staff (FullName, Username, PasswordHash, Role, CCCD, Active)
     VALUES (?, ?, ?, 'Cashier', ?, TRUE)`,
    [normalizedName, normalizedUsername, hashPassword(password), normalizedCccd || null],
  );

  const [rows] = await db.query(
    `SELECT StaffID, FullName, Username, Role, CCCD FROM Staff WHERE StaffID = ?`,
    [result.insertId],
  );
  return mapStaff(rows[0]);
}

async function updateStaff(staffId, { fullName, username, password, cccd }) {
  const id = Number(staffId);
  const [currentRows] = await db.query(
    `SELECT StaffID FROM Staff WHERE StaffID = ? AND Active = TRUE LIMIT 1`,
    [id],
  );
  if (!currentRows[0]) throw notFound('Không tìm thấy nhân viên');

  const normalizedName = String(fullName || '').trim();
  const normalizedUsername = String(username || '').trim();
  const normalizedCccd = String(cccd || '').trim();
  if (!normalizedName || !normalizedUsername) {
    throw badRequest('Vui lòng nhập họ tên và username');
  }
  if (password && String(password).length < 6) {
    throw badRequest('Password mới phải có ít nhất 6 ký tự');
  }

  await ensureUniqueUsername(normalizedUsername, id);

  const fields = ['FullName = ?', 'Username = ?', 'CCCD = ?'];
  const params = [normalizedName, normalizedUsername, normalizedCccd || null];
  if (password) {
    fields.push('PasswordHash = ?');
    params.push(hashPassword(password));
  }
  params.push(id);

  await db.query(
    `UPDATE Staff
     SET ${fields.join(', ')}
     WHERE StaffID = ?`,
    params,
  );

  const [rows] = await db.query(
    `SELECT StaffID, FullName, Username, Role, CCCD FROM Staff WHERE StaffID = ?`,
    [id],
  );
  return mapStaff(rows[0]);
}

async function deleteStaff(staffId, actorId) {
  const id = Number(staffId);
  if (id === Number(actorId)) {
    throw badRequest('Không thể xóa chính tài khoản đang đăng nhập');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT StaffID FROM Staff WHERE StaffID = ? AND Active = TRUE FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw notFound('Không tìm thấy nhân viên');

    await connection.query(`DELETE FROM FacilityCashier WHERE StaffID = ?`, [id]);
    await connection.query(`DELETE FROM StaffAreaAssignment WHERE StaffID = ?`, [id]);
    await connection.query(`UPDATE Staff SET Active = FALSE WHERE StaffID = ?`, [id]);

    await connection.commit();
    return { deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
};
