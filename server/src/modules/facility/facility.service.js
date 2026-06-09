const db = require('../../config/db');
const { badRequest, forbidden, notFound } = require('../../utils/http');

function mapFacility(row) {
  return {
    id: row.FacilityID,
    name: row.FacilityName,
    description: row.Description,
    status: row.Status,
    assetStatus: row.AssetStatus,
    capacity: Number(row.Capacity || 0),
    imageUrl: row.ImageURL || null,
    updatedAt: row.UpdatedAt,
  };
}

function mapProduct(row) {
  return {
    id: row.ProductID,
    facilityId: row.FacilityID ? Number(row.FacilityID) : null,
    facilityName: row.FacilityName || null,
    serviceId: row.ServiceID ? Number(row.ServiceID) : null,
    serviceName: row.ServiceName || row.Category,
    serviceImageUrl: row.ServiceImageURL || null,
    name: row.ProductName,
    category: row.Category,
    price: Number(row.Price || 0),
    stock: Number(row.Stock || 0),
    imageUrl: row.ImageURL || null,
    active: Boolean(row.Active),
  };
}

function mapPaidService(row) {
  return {
    id: row.ServiceID,
    facilityId: Number(row.FacilityID),
    facilityName: row.FacilityName || null,
    name: row.ServiceName,
    description: row.Description || '',
    imageUrl: row.ImageURL || null,
    active: Boolean(row.Active),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function mapCashier(row) {
  return {
    staffId: row.StaffID,
    fullName: row.FullName,
    username: row.Username,
  };
}

function requireManager(user) {
  if (user?.role !== 'Manager') throw forbidden('Manager permission is required');
}

async function ensureFacilityExists(facilityId, connection = db) {
  const [rows] = await connection.query(`SELECT FacilityID FROM Facility WHERE FacilityID = ?`, [facilityId]);
  if (!rows[0]) throw notFound('Facility not found');
}

async function getStaffAssignment(staffId, connection = db) {
  const [gateRows] = await connection.query(
    `SELECT StaffID
     FROM StaffAreaAssignment
     WHERE StaffID = ? AND AreaType = 'Gate'
     LIMIT 1`,
    [staffId],
  );

  if (gateRows[0]) {
    return { areaType: 'Gate', facilityId: null, facilityName: null, facilities: [] };
  }

  const [facilityRows] = await connection.query(
    `SELECT f.FacilityID, f.FacilityName
     FROM FacilityCashier fc
     JOIN Facility f ON f.FacilityID = fc.FacilityID
     WHERE fc.StaffID = ?
     ORDER BY f.FacilityName`,
    [staffId],
  );

  const facilities = facilityRows.map((row) => ({
    id: Number(row.FacilityID),
    name: row.FacilityName,
  }));

  if (facilities.length === 0) return null;
  return {
    areaType: 'Facility',
    facilityId: facilities[0].id,
    facilityName: facilities[0].name,
    facilities,
  };
}

async function assertFacilityAccess(user, facilityId, connection = db) {
  if (user?.role === 'Manager') return;

  const assignment = await getStaffAssignment(user?.sub, connection);
  const allowedIds = assignment?.facilities?.map((facility) => Number(facility.id)) || [];
  if (user?.role === 'Cashier' && allowedIds.includes(Number(facilityId))) return;

  throw forbidden('This area is not assigned to the current cashier');
}

async function getAllowedFacilityIds(user, connection = db) {
  if (user?.role === 'Manager') return null;
  if (user?.role !== 'Cashier') return [];

  const assignment = await getStaffAssignment(user?.sub, connection);
  return assignment?.facilities?.map((facility) => Number(facility.id)) || [];
}

async function getPaidServiceById(serviceId, connection = db) {
  const [rows] = await connection.query(
    `SELECT ps.*, f.FacilityName
     FROM PaidService ps
     JOIN Facility f ON f.FacilityID = ps.FacilityID
     WHERE ps.ServiceID = ? AND ps.Active = TRUE
     LIMIT 1`,
    [serviceId],
  );
  if (!rows[0]) throw notFound('Paid service not found');
  return mapPaidService(rows[0]);
}

async function assertPaidServiceAccess(user, serviceId, connection = db) {
  const paidService = await getPaidServiceById(serviceId, connection);
  await assertFacilityAccess(user, paidService.facilityId, connection);
  return paidService;
}

async function hydrateFacilities(facilities, connection = db) {
  if (facilities.length === 0) return [];

  const ids = facilities.map((facility) => facility.id);
  const [issueRows] = await connection.query(
    `SELECT IssueID, FacilityID, Description, CreatedAt
     FROM FacilityIssue
     WHERE IsResolved = FALSE AND FacilityID IN (?)
     ORDER BY CreatedAt, IssueID`,
    [ids],
  );
  const [cashierRows] = await connection.query(
    `SELECT fc.FacilityID, s.StaffID, s.FullName, s.Username
     FROM FacilityCashier fc
     JOIN Staff s ON s.StaffID = fc.StaffID
     WHERE s.Active = TRUE AND fc.FacilityID IN (?)
     ORDER BY s.FullName, s.Username`,
    [ids],
  );

  return facilities.map((facility) => {
    const issues = issueRows
      .filter((issue) => Number(issue.FacilityID) === Number(facility.id))
      .map((issue) => ({
        id: issue.IssueID,
        description: issue.Description,
        resolved: false,
        createdAt: issue.CreatedAt,
      }));
    const cashiers = cashierRows
      .filter((cashier) => Number(cashier.FacilityID) === Number(facility.id))
      .map(mapCashier);

    return {
      ...facility,
      issues,
      cashierIds: cashiers.map((cashier) => cashier.staffId),
      cashiers,
    };
  });
}

async function getFacilityById(facilityId, connection = db) {
  const [rows] = await connection.query(`SELECT * FROM Facility WHERE FacilityID = ?`, [facilityId]);
  if (!rows[0]) throw notFound('Facility not found');
  const [facility] = await hydrateFacilities([mapFacility(rows[0])], connection);
  return facility;
}

async function listFacilities(user) {
  if (user?.role === 'Cashier') {
    const assignment = await getStaffAssignment(user.sub);
    const ids = assignment?.facilities?.map((facility) => Number(facility.id)) || [];
    if (ids.length === 0) return [];

    const [rows] = await db.query(`SELECT * FROM Facility WHERE FacilityID IN (?) ORDER BY FacilityName`, [ids]);
    return hydrateFacilities(rows.map(mapFacility));
  }

  const [rows] = await db.query(`SELECT * FROM Facility ORDER BY FacilityName`);
  return hydrateFacilities(rows.map(mapFacility));
}

async function syncFacilityCashiers(connection, facilityId, cashierIds = []) {
  const uniqueIds = [...new Set(cashierIds.map(Number).filter(Boolean))];

  if (uniqueIds.length > 0) {
    const [rows] = await connection.query(
      `SELECT StaffID
       FROM Staff
       WHERE Role = 'Cashier' AND Active = TRUE AND StaffID IN (?)`,
      [uniqueIds],
    );
    if (rows.length !== uniqueIds.length) throw badRequest('One or more selected cashiers are invalid');
  }

  await connection.query(`DELETE FROM FacilityCashier WHERE FacilityID = ?`, [facilityId]);
  for (const staffId of uniqueIds) {
    await connection.query(
      `INSERT INTO FacilityCashier (FacilityID, StaffID)
       VALUES (?, ?)`,
      [facilityId, staffId],
    );
  }
}

async function syncFacilityIssues(connection, facilityId, issues = []) {
  if (!Array.isArray(issues)) return;

  for (const issue of issues) {
    const description = String(issue.description || '').trim();
    const issueId = Number(issue.id || 0);

    if (issueId && issue.resolved) {
      await connection.query(
        `UPDATE FacilityIssue
         SET IsResolved = TRUE, ResolvedAt = COALESCE(ResolvedAt, NOW())
         WHERE IssueID = ? AND FacilityID = ?`,
        [issueId, facilityId],
      );
      continue;
    }

    if (issueId && description) {
      await connection.query(
        `UPDATE FacilityIssue
         SET Description = ?
         WHERE IssueID = ? AND FacilityID = ? AND IsResolved = FALSE`,
        [description, issueId, facilityId],
      );
      continue;
    }

    if (!issueId && description && !issue.resolved) {
      await connection.query(
        `INSERT INTO FacilityIssue (FacilityID, Description)
         VALUES (?, ?)`,
        [facilityId, description],
      );
    }
  }
}

async function createFacility(payload, user) {
  requireManager(user);
  const {
    name,
    description = '',
    status = 'Normal',
    assetStatus = 'Ok',
    capacity = 0,
    cashierIds = [],
    issues = [],
  } = payload;
  if (!name) throw badRequest('Facility name is required');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO Facility (FacilityName, Description, Status, AssetStatus, Capacity)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description, status, assetStatus, Number(capacity || 0)],
    );
    await syncFacilityCashiers(connection, result.insertId, cashierIds);
    await syncFacilityIssues(connection, result.insertId, issues);
    await connection.commit();
    return getFacilityById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateFacility(id, payload, user) {
  await assertFacilityAccess(user, id);
  const [currentRows] = await db.query(`SELECT * FROM Facility WHERE FacilityID = ?`, [id]);
  if (!currentRows[0]) throw notFound('Facility not found');

  if (payload.cashierIds !== undefined) requireManager(user);

  const current = currentRows[0];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE Facility
       SET FacilityName = ?, Description = ?, Status = ?, AssetStatus = ?, Capacity = ?, UpdatedAt = NOW()
       WHERE FacilityID = ?`,
      [
        payload.name ?? current.FacilityName,
        payload.description ?? current.Description,
        payload.status ?? current.Status,
        payload.assetStatus ?? current.AssetStatus,
        Number(payload.capacity ?? current.Capacity ?? 0),
        id,
      ],
    );

    if (payload.cashierIds !== undefined) {
      await syncFacilityCashiers(connection, id, payload.cashierIds);
    }
    if (payload.issues !== undefined) {
      await syncFacilityIssues(connection, id, payload.issues);
    }

    await connection.commit();
    return getFacilityById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateFacilityImage(id, imageUrl, user) {
  requireManager(user);
  await ensureFacilityExists(id);
  await db.query(`UPDATE Facility SET ImageURL = ?, UpdatedAt = NOW() WHERE FacilityID = ?`, [imageUrl, id]);
  return getFacilityById(id);
}

async function deleteFacility(id, user) {
  requireManager(user);
  const [result] = await db.query(`DELETE FROM Facility WHERE FacilityID = ?`, [id]);
  if (!result.affectedRows) throw notFound('Facility not found');
  return { id: Number(id) };
}

async function listPaidServices(user) {
  const allowedIds = await getAllowedFacilityIds(user);
  if (Array.isArray(allowedIds) && allowedIds.length === 0) return [];

  const params = [];
  let whereClause = 'WHERE ps.Active = TRUE';
  if (Array.isArray(allowedIds)) {
    whereClause += ' AND ps.FacilityID IN (?)';
    params.push(allowedIds);
  }

  const [rows] = await db.query(
    `SELECT ps.*, f.FacilityName
     FROM PaidService ps
     JOIN Facility f ON f.FacilityID = ps.FacilityID
     ${whereClause}
     ORDER BY f.FacilityName, ps.ServiceName`,
    params,
  );
  return rows.map(mapPaidService);
}

async function createPaidService(payload, imageUrl, user) {
  const facilityId = Number(payload.facilityId || 0);
  const name = String(payload.name || payload.serviceName || '').trim();
  const description = String(payload.description || '').trim();

  if (!facilityId) throw badRequest('Facility is required for paid service');
  if (!name) throw badRequest('Paid service name is required');

  await ensureFacilityExists(facilityId);
  await assertFacilityAccess(user, facilityId);

  const [result] = await db.query(
    `INSERT INTO PaidService (FacilityID, ServiceName, Description, ImageURL, Active)
     VALUES (?, ?, ?, ?, TRUE)`,
    [facilityId, name, description || null, imageUrl || null],
  );
  return getPaidServiceById(result.insertId);
}

async function listProducts(user) {
  if (user?.role === 'Cashier') {
    const assignment = await getStaffAssignment(user.sub);
    const ids = assignment?.facilities?.map((facility) => Number(facility.id)) || [];
    if (ids.length === 0) return [];

    const [rows] = await db.query(
      `SELECT p.*, f.FacilityName, ps.ServiceName, ps.ImageURL AS ServiceImageURL
       FROM Product p
       JOIN Facility f ON f.FacilityID = p.FacilityID
       LEFT JOIN PaidService ps ON ps.ServiceID = p.ServiceID
       WHERE p.Active = TRUE AND p.FacilityID IN (?)
       ORDER BY f.FacilityName, COALESCE(ps.ServiceName, p.Category), p.ProductName`,
      [ids],
    );
    return rows.map(mapProduct);
  }

  const [rows] = await db.query(
    `SELECT p.*, f.FacilityName, ps.ServiceName, ps.ImageURL AS ServiceImageURL
     FROM Product p
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN PaidService ps ON ps.ServiceID = p.ServiceID
     WHERE p.Active = TRUE
     ORDER BY f.FacilityName, COALESCE(ps.ServiceName, p.Category), p.ProductName`,
  );
  return rows.map(mapProduct);
}

async function createProduct(payload, user, imageUrl = null) {
  const { serviceId, name, price, stock = 0, active = true } = payload;
  let facilityId = Number(payload.facilityId || 0);
  let resolvedCategory = String(payload.category || 'Dịch vụ tính phí').trim();

  if (serviceId) {
    const paidService = await assertPaidServiceAccess(user, serviceId);
    facilityId = paidService.facilityId;
    resolvedCategory = paidService.name;
  }

  if (!facilityId) throw badRequest('Facility is required for paid service products');
  if (!name || price === undefined) throw badRequest('Product name and price are required');
  await ensureFacilityExists(facilityId);
  await assertFacilityAccess(user, facilityId);

  const [result] = await db.query(
    `INSERT INTO Product (FacilityID, ServiceID, ProductName, Category, Price, Stock, ImageURL, Active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      facilityId,
      serviceId ? Number(serviceId) : null,
      String(name).trim(),
      resolvedCategory || 'Dịch vụ tính phí',
      Number(price),
      Number(stock || 0),
      imageUrl || null,
      Boolean(active),
    ],
  );
  const [rows] = await db.query(
    `SELECT p.*, f.FacilityName, ps.ServiceName, ps.ImageURL AS ServiceImageURL
     FROM Product p
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN PaidService ps ON ps.ServiceID = p.ServiceID
     WHERE p.ProductID = ?`,
    [result.insertId],
  );
  return mapProduct(rows[0]);
}

async function updateProduct(id, payload, user, imageUrl = undefined) {
  const [currentRows] = await db.query(`SELECT * FROM Product WHERE ProductID = ? AND Active = TRUE`, [id]);
  if (!currentRows[0]) throw notFound('Product not found');
  const current = currentRows[0];
  let nextFacilityId = Number(payload.facilityId ?? current.FacilityID);
  let nextServiceId = payload.serviceId === undefined ? current.ServiceID : Number(payload.serviceId || 0) || null;
  let nextCategory = payload.category ?? current.Category;

  if (nextServiceId) {
    const paidService = await assertPaidServiceAccess(user, nextServiceId);
    nextFacilityId = paidService.facilityId;
    nextCategory = paidService.name;
  }

  if (!nextFacilityId) throw badRequest('Facility is required for paid service products');
  await ensureFacilityExists(nextFacilityId);
  await assertFacilityAccess(user, current.FacilityID);
  await assertFacilityAccess(user, nextFacilityId);
  const nextImageUrl = imageUrl === undefined ? current.ImageURL : imageUrl;
  await db.query(
    `UPDATE Product
     SET FacilityID = ?, ServiceID = ?, ProductName = ?, Category = ?, Price = ?, Stock = ?, ImageURL = ?, Active = ?, UpdatedAt = NOW()
     WHERE ProductID = ?`,
    [
      nextFacilityId,
      nextServiceId,
      payload.name ?? current.ProductName,
      nextCategory,
      Number(payload.price ?? current.Price),
      Number(payload.stock ?? current.Stock),
      nextImageUrl,
      payload.active ?? current.Active,
      id,
    ],
  );
  const [rows] = await db.query(
    `SELECT p.*, f.FacilityName, ps.ServiceName, ps.ImageURL AS ServiceImageURL
     FROM Product p
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN PaidService ps ON ps.ServiceID = p.ServiceID
     WHERE p.ProductID = ?`,
    [id],
  );
  return mapProduct(rows[0]);
}

async function deleteProduct(id, user) {
  const [currentRows] = await db.query(`SELECT * FROM Product WHERE ProductID = ? AND Active = TRUE`, [id]);
  if (!currentRows[0]) throw notFound('Product not found');
  await assertFacilityAccess(user, currentRows[0].FacilityID);
  const [result] = await db.query(`UPDATE Product SET Active = FALSE, UpdatedAt = NOW() WHERE ProductID = ?`, [id]);
  if (!result.affectedRows) throw notFound('Product not found');
  return { id: Number(id), active: false };
}

async function listStaffAssignments(user) {
  requireManager(user);
  const [staffRows] = await db.query(
    `SELECT StaffID, FullName, Username, Role
     FROM Staff
     WHERE Role = 'Cashier' AND Active = TRUE
     ORDER BY FullName, Username`,
  );
  const [gateRows] = await db.query(
    `SELECT StaffID
     FROM StaffAreaAssignment
     WHERE AreaType = 'Gate'`,
  );
  const [facilityRows] = await db.query(
    `SELECT fc.StaffID, f.FacilityID, f.FacilityName
     FROM FacilityCashier fc
     JOIN Facility f ON f.FacilityID = fc.FacilityID
     ORDER BY f.FacilityName`,
  );
  const gateIds = new Set(gateRows.map((row) => Number(row.StaffID)));

  return staffRows.map((staff) => {
    const facilities = facilityRows
      .filter((row) => Number(row.StaffID) === Number(staff.StaffID))
      .map((row) => ({ id: Number(row.FacilityID), name: row.FacilityName }));
    const isGate = gateIds.has(Number(staff.StaffID));
    const assignment = isGate
      ? { areaType: 'Gate', facilityId: null, facilityName: null, facilities: [] }
      : facilities.length > 0
        ? {
            areaType: 'Facility',
            facilityId: facilities[0].id,
            facilityName: facilities[0].name,
            facilities,
          }
        : null;

    return {
      staffId: staff.StaffID,
      fullName: staff.FullName,
      username: staff.Username,
      role: staff.Role,
      isGate,
      facilityIds: facilities.map((facility) => facility.id),
      facilities,
      assignment,
    };
  });
}

async function assignStaffArea(staffId, payload, user) {
  requireManager(user);
  const [staffRows] = await db.query(
    `SELECT StaffID FROM Staff WHERE StaffID = ? AND Role = 'Cashier' AND Active = TRUE`,
    [staffId],
  );
  if (!staffRows[0]) throw notFound('Cashier account not found');

  const areaType = payload.areaType || null;
  if (!areaType || areaType === 'None') {
    await db.query(`DELETE FROM StaffAreaAssignment WHERE StaffID = ?`, [staffId]);
    await db.query(`DELETE FROM FacilityCashier WHERE StaffID = ?`, [staffId]);
    return listStaffAssignments(user);
  }

  if (areaType !== 'Gate' && areaType !== 'Facility') {
    throw badRequest('Assignment type must be Gate or Facility');
  }

  if (areaType === 'Gate') {
    await db.query(`DELETE FROM FacilityCashier WHERE StaffID = ?`, [staffId]);
    await db.query(
      `INSERT INTO StaffAreaAssignment (StaffID, AreaType, FacilityID)
       VALUES (?, 'Gate', NULL)
       ON DUPLICATE KEY UPDATE AreaType = 'Gate', FacilityID = NULL, UpdatedAt = NOW()`,
      [staffId],
    );
    return listStaffAssignments(user);
  }

  const facilityId = Number(payload.facilityId || 0);
  if (!facilityId) throw badRequest('Facility is required for facility assignment');
  await ensureFacilityExists(facilityId);
  await db.query(`DELETE FROM StaffAreaAssignment WHERE StaffID = ?`, [staffId]);
  await db.query(`DELETE FROM FacilityCashier WHERE StaffID = ?`, [staffId]);
  await db.query(
    `INSERT INTO FacilityCashier (FacilityID, StaffID)
     VALUES (?, ?)`,
    [facilityId, staffId],
  );
  return listStaffAssignments(user);
}

module.exports = {
  assignStaffArea,
  assertFacilityAccess,
  createFacility,
  createPaidService,
  createProduct,
  deleteFacility,
  deleteProduct,
  getStaffAssignment,
  listFacilities,
  listPaidServices,
  listProducts,
  listStaffAssignments,
  updateFacility,
  updateFacilityImage,
  updateProduct,
};
