const db = require('../../config/db');
const { badRequest, forbidden, notFound, toNumber } = require('../../utils/http');
const { findCustomerByUsername, findOrCreateCustomer } = require('../customer/customer.service');
const { getStaffAssignment } = require('../facility/facility.service');
const { normalizePaymentMethod, recordTransaction } = require('../transaction/transaction.service');

const OVERTIME_BLOCK_MINUTES = 30;
const OVERTIME_BLOCK_FEE = 50000;

function mapTicketType(row) {
  return {
    id: row.TypeID,
    code: row.Code,
    name: row.TypeName,
    basePrice: Number(row.BasePrice || 0),
    timeLimit: row.TimeLimit === null ? null : Number(row.TimeLimit),
  };
}

function mapProduct(row) {
  return {
    id: row.ProductID,
    facilityId: row.FacilityID ? Number(row.FacilityID) : null,
    facilityName: row.FacilityName || null,
    serviceId: row.ServiceID ? Number(row.ServiceID) : null,
    name: row.ProductName,
    category: row.Category,
    price: Number(row.Price || 0),
    stock: Number(row.Stock || 0),
    imageUrl: row.ImageURL || null,
    active: Boolean(row.Active),
  };
}

function customerIsVip(customer) {
  return Boolean(customer?.IsVIP) && (!customer.VIPExpiryDate || new Date(customer.VIPExpiryDate) >= new Date());
}

function rowIsVipActive(row) {
  if (row?.IsVIPActive !== undefined) return Boolean(row.IsVIPActive);
  return Boolean(row?.IsVIP) && (!row.VIPExpiryDate || new Date(row.VIPExpiryDate) >= new Date());
}

function calculateBillFromRow(row, serviceAmount = 0) {
  const count = Math.max(1, Number(row.ChildrenCount || 1));
  const isPrepaidEvent = row.Purpose === 'Event' && Boolean(row.PrepaidOnline);
  const ticketFee = isPrepaidEvent
    ? 0
    : Number(row.Purpose === 'Event' ? row.EventTicketPrice || 0 : row.BasePrice || 0) * count;

  const timeLimit = row.Purpose === 'Event' && row.EventTimeLimit !== null && row.EventTimeLimit !== undefined
    ? Number(row.EventTimeLimit)
    : row.TimeLimit === null || row.TimeLimit === undefined
      ? null
      : Number(row.TimeLimit);

  const playedMinutes = row.Status === 'Playing' && row.PlayedMinutes !== null && row.PlayedMinutes !== undefined
    ? Math.max(0, Number(row.PlayedMinutes || 0))
    : 0;
  const overtimeMinutes = timeLimit && playedMinutes > timeLimit ? playedMinutes - timeLimit : 0;
  const overtimeBlocks = overtimeMinutes > 0 ? Math.ceil(overtimeMinutes / OVERTIME_BLOCK_MINUTES) : 0;
  const overtimePenalty = overtimeBlocks * OVERTIME_BLOCK_FEE;
  const grossAmount = Number(ticketFee || 0) + Number(serviceAmount || 0) + Number(overtimePenalty || 0);
  const isVip = rowIsVipActive(row);
  const vipDiscount = isVip ? Math.round(grossAmount * 0.2) : 0;
  const finalAmount = Math.max(0, grossAmount - vipDiscount);

  return {
    ticketFee,
    serviceAmount: Number(serviceAmount || 0),
    timeLimit,
    playedMinutes,
    overtimeMinutes,
    overtimeBlocks,
    overtimeBlockMinutes: OVERTIME_BLOCK_MINUTES,
    overtimeBlockFee: OVERTIME_BLOCK_FEE,
    overtimePenalty,
    grossAmount,
    vipDiscount,
    finalAmount,
    isVip,
    isPrepaidEvent,
  };
}

function mapSession(row) {
  const bill = calculateBillFromRow(row, 0);
  return {
    id: row.SessionID,
    customerId: row.CustomerID,
    customerName: row.EventParentName || row.FullName || row.GuestName || 'Khách vãng lai',
    phone: row.Phone,
    isVip: bill.isVip,
    ticketType: row.TypeName || row.EventName || (row.Purpose === 'Event' ? 'Sự kiện' : null),
    ticketTypeId: row.TypeID,
    eventId: row.EventID,
    eventName: row.EventName || null,
    eventRegistrationId: row.EventRegistrationID || null,
    prepaidOnline: Boolean(row.PrepaidOnline),
    purpose: row.Purpose || 'Play',
    childrenCount: Number(row.ChildrenCount || 1),
    adultsCount: Number(row.AdultsCount || 0),
    paymentMethod: row.PaymentMethod || null,
    paidAmount: Number(row.PaidAmount || 0),
    amountDue: bill.finalAmount,
    grossAmount: bill.grossAmount,
    ticketFee: bill.ticketFee,
    serviceAmount: bill.serviceAmount,
    overtimePenalty: bill.overtimePenalty,
    vipDiscount: bill.vipDiscount,
    source: row.Source,
    checkinTime: row.CheckinTime,
    checkoutTime: row.CheckoutTime,
    status: row.Status,
  };
}

async function requireGateTicketAccess(user) {
  if (user?.role === 'Manager') return;
  const assignment = await getStaffAssignment(user?.sub);
  if (user?.role === 'Cashier' && assignment?.areaType === 'Gate') return;
  throw forbidden('Only gate cashiers can manage ticket check-in and checkout');
}

async function assertProductSaleAccess(user, facilityId) {
  if (user?.role === 'Manager') return;
  const assignment = await getStaffAssignment(user?.sub);
  if (assignment?.areaType === 'Gate') return;
  const allowedIds = assignment?.facilities?.map((facility) => Number(facility.id)) || [];
  if (assignment?.areaType === 'Facility' && facilityId && allowedIds.includes(Number(facilityId))) {
    return;
  }
  throw forbidden('This product is not assigned to the current cashier');
}

async function listTicketTypes() {
  const [rows] = await db.query(
    `SELECT TypeID, Code, TypeName, BasePrice, TimeLimit
     FROM TicketType
     WHERE Active = TRUE
     ORDER BY TypeID`,
  );
  return rows.map(mapTicketType);
}

async function listProducts(user) {
  const baseQuery = `SELECT p.ProductID, p.FacilityID, p.ServiceID, f.FacilityName,
                           p.ProductName, p.Category, p.Price, p.Stock, p.ImageURL, p.Active
                    FROM Product p
                    LEFT JOIN Facility f ON f.FacilityID = p.FacilityID`;

  if (user?.role === 'Cashier') {
    const assignment = await getStaffAssignment(user.sub);
    if (assignment?.areaType === 'Facility') {
      const facilityIds = assignment.facilities.map((facility) => Number(facility.id));
      if (facilityIds.length === 0) return [];
      const [rows] = await db.query(
        `${baseQuery}
         WHERE p.Active = TRUE AND p.FacilityID IN (?)
         ORDER BY p.Category, p.ProductName`,
        [facilityIds],
      );
      return rows.map(mapProduct);
    }
  }

  const [rows] = await db.query(
    `${baseQuery}
     WHERE p.Active = TRUE
     ORDER BY f.FacilityName, p.Category, p.ProductName`,
  );
  return rows.map(mapProduct);
}

async function getTicketType(typeId, connection = db) {
  const [rows] = await connection.query(`SELECT * FROM TicketType WHERE TypeID = ? AND Active = TRUE`, [typeId]);
  if (!rows[0]) throw notFound('Ticket type not found');
  return rows[0];
}

async function getEvent(eventId, connection = db) {
  const [rows] = await connection.query(
    `SELECT *
     FROM EventCampaign
     WHERE EventID = ? AND Status = 'Published' AND EndDate >= NOW()
     LIMIT 1`,
    [eventId],
  );
  if (!rows[0]) throw notFound('Event not found');
  return rows[0];
}

async function resolveCustomerForCounter(connection, { username, fullName, email, phone }) {
  const account = String(username || '').trim();
  if (account) {
    const customer = await findCustomerByUsername(account, connection);
    if (!customer) throw notFound('Customer not found');
    return { customer, guestName: null };
  }

  if (fullName && phone) {
    const customer = await findOrCreateCustomer(connection, { fullName, email, phone });
    return { customer, guestName: null };
  }

  return {
    customer: null,
    guestName: String(fullName || '').trim() || 'Khách vãng lai',
  };
}

function calculateWithVipDiscount(grossAmount, customer) {
  const vipDiscount = customerIsVip(customer) ? Math.round(Number(grossAmount || 0) * 0.2) : 0;
  return {
    vipDiscount,
    finalAmount: Math.max(0, Number(grossAmount || 0) - vipDiscount),
  };
}

async function addSessionServices(connection, sessionId, serviceItems = [], user = null) {
  let serviceAmount = 0;
  for (const item of serviceItems) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity || 0);
    if (!productId || quantity <= 0) continue;

    const [products] = await connection.query(
      `SELECT ProductID, FacilityID, Price, Stock FROM Product WHERE ProductID = ? AND Active = TRUE FOR UPDATE`,
      [productId],
    );
    const product = products[0];
    if (!product) throw notFound('Service item not found');
    await assertProductSaleAccess(user, product.FacilityID);
    if (Number(product.Stock) < quantity) throw badRequest('Not enough stock for selected service');

    const unitPrice = Number(product.Price);
    const lineTotal = unitPrice * quantity;
    serviceAmount += lineTotal;

    await connection.query(
      `INSERT INTO SessionService (SessionID, ProductID, Quantity, UnitPrice, LineTotal)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, productId, quantity, unitPrice, lineTotal],
    );
    await connection.query(`UPDATE Product SET Stock = Stock - ? WHERE ProductID = ?`, [quantity, productId]);
  }
  return serviceAmount;
}

async function createSession(payload, user = null) {
  await requireGateTicketAccess(user);
  const {
    username = '',
    fullName = '',
    email = null,
    phone = null,
    purpose = 'Play',
    typeId,
    eventId,
    quantity,
    childrenCount,
    adultsCount = 0,
    staffId = null,
    serviceItems = [],
    source = 'Counter',
  } = payload;

  const normalizedPurpose = purpose === 'Event' || eventId ? 'Event' : 'Play';
  const count = Math.max(1, Number(quantity || childrenCount || 1));

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { customer, guestName } = await resolveCustomerForCounter(connection, {
      username,
      fullName,
      email,
      phone,
    });

    let resolvedTypeId = typeId ? Number(typeId) : null;
    let resolvedEventId = eventId ? Number(eventId) : null;
    let ticketFee = 0;
    let note = null;

    if (normalizedPurpose === 'Event') {
      const event = await getEvent(resolvedEventId, connection);
      ticketFee = Number(event.TicketPrice || 0) * count;
      resolvedTypeId = null;
      note = event.EventName;
    } else {
      if (!resolvedTypeId) throw badRequest('Ticket type is required');
      const ticketType = await getTicketType(resolvedTypeId, connection);
      ticketFee = Number(ticketType.BasePrice || 0) * count;
      resolvedEventId = null;
      note = ticketType.TypeName;
    }

    const [result] = await connection.query(
      `INSERT INTO PlaySession
        (CustomerID, TypeID, EventID, StaffID, GuestName, Purpose, Source,
         EventBookingID, ChildrenCount, AdultsCount, PaymentMethod, PaidAmount, CheckinTime, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 0, NULL, 'Pending')`,
      [
        customer?.CustomerID || null,
        resolvedTypeId,
        resolvedEventId,
        staffId,
        guestName,
        normalizedPurpose,
        source,
        count,
        Number(adultsCount || 0),
      ],
    );

    await connection.commit();
    const bill = calculateWithVipDiscount(ticketFee, customer);
    return {
      ...(await getSession(result.insertId)),
      grossAmount: ticketFee,
      ticketFee,
      vipDiscount: bill.vipDiscount,
      finalAmount: bill.finalAmount,
      note,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listActiveSessions(user = null) {
  await requireGateTicketAccess(user);
  const [rows] = await db.query(
    `SELECT ps.*, c.FullName, c.Phone, c.IsVIP, c.VIPExpiryDate,
            tt.TypeName, tt.BasePrice, tt.TimeLimit,
            ec.EventName, ec.TicketPrice AS EventTicketPrice,
            er.ParentName AS EventParentName,
            TIMESTAMPDIFF(MINUTE, ec.StartDate, ec.EndDate) AS EventTimeLimit,
            CASE
              WHEN ps.Status = 'Playing' AND ps.CheckinTime IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, ps.CheckinTime, NOW())
              ELSE 0
            END AS PlayedMinutes,
            (c.IsVIP = TRUE AND (c.VIPExpiryDate IS NULL OR c.VIPExpiryDate >= NOW())) AS IsVIPActive,
            0 AS ServiceAmount
     FROM PlaySession ps
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN EventCampaign ec ON ec.EventID = ps.EventID
     LEFT JOIN EventRegistration er ON er.RegistrationID = ps.EventRegistrationID
     WHERE ps.Status IN ('Pending', 'Playing')
     ORDER BY
       CASE ps.Status WHEN 'Playing' THEN 0 ELSE 1 END,
       ps.CheckinTime DESC,
       ps.SessionID DESC`,
  );
  return rows.map(mapSession);
}

async function getSession(sessionId) {
  const [rows] = await db.query(
    `SELECT ps.*, c.FullName, c.Phone, c.IsVIP, c.VIPExpiryDate,
            tt.TypeName, tt.BasePrice, tt.TimeLimit,
            ec.EventName, ec.TicketPrice AS EventTicketPrice,
            er.ParentName AS EventParentName,
            TIMESTAMPDIFF(MINUTE, ec.StartDate, ec.EndDate) AS EventTimeLimit,
            CASE
              WHEN ps.Status = 'Playing' AND ps.CheckinTime IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, ps.CheckinTime, NOW())
              ELSE 0
            END AS PlayedMinutes,
            (c.IsVIP = TRUE AND (c.VIPExpiryDate IS NULL OR c.VIPExpiryDate >= NOW())) AS IsVIPActive,
            0 AS ServiceAmount
     FROM PlaySession ps
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN EventCampaign ec ON ec.EventID = ps.EventID
     LEFT JOIN EventRegistration er ON er.RegistrationID = ps.EventRegistrationID
     WHERE ps.SessionID = ?`,
    [sessionId],
  );
  if (!rows[0]) throw notFound('Play session not found');

  const [services] = await db.query(
    `SELECT ss.ServiceLineID AS id, ss.ProductID AS productId, p.ProductName AS name,
            ss.Quantity AS quantity, ss.UnitPrice AS unitPrice, ss.LineTotal AS lineTotal
     FROM SessionService ss
     JOIN Product p ON p.ProductID = ss.ProductID
     WHERE ss.SessionID = ?
     ORDER BY ss.ServiceLineID`,
    [sessionId],
  );

  return {
    ...mapSession(rows[0]),
    services: services.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

async function checkinSession(sessionId, { staffId = null, user = null } = {}) {
  await requireGateTicketAccess(user);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [locked] = await connection.query(`SELECT * FROM PlaySession WHERE SessionID = ? FOR UPDATE`, [sessionId]);
    const session = locked[0];
    if (!session) throw notFound('Play session not found');
    if (session.Status !== 'Pending') throw badRequest('Only pending sessions can be checked in');

    await connection.query(
      `UPDATE PlaySession
       SET CheckinTime = NOW(),
           Status = 'Playing',
           StaffID = COALESCE(?, StaffID)
       WHERE SessionID = ?`,
      [staffId, sessionId],
    );
    await connection.commit();
    return getSession(sessionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function calculateCheckout(sessionId, user = null, connection = db) {
  await requireGateTicketAccess(user);
  const [rows] = await connection.query(
    `SELECT ps.*, c.FullName, c.Phone, c.IsVIP, c.VIPExpiryDate,
            tt.BasePrice, tt.TimeLimit, tt.TypeName,
            ec.EventName, ec.TicketPrice AS EventTicketPrice,
            er.ParentName AS EventParentName,
            TIMESTAMPDIFF(MINUTE, ec.StartDate, ec.EndDate) AS EventTimeLimit,
            CASE
              WHEN ps.Status = 'Playing' AND ps.CheckinTime IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, ps.CheckinTime, NOW())
              ELSE 0
            END AS PlayedMinutes,
            NOW() AS PreviewCheckoutTime,
            (c.IsVIP = TRUE AND (c.VIPExpiryDate IS NULL OR c.VIPExpiryDate >= NOW())) AS IsVIPActive
     FROM PlaySession ps
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN EventCampaign ec ON ec.EventID = ps.EventID
     LEFT JOIN EventRegistration er ON er.RegistrationID = ps.EventRegistrationID
     WHERE ps.SessionID = ?`,
    [sessionId],
  );
  const session = rows[0];
  if (!session) throw notFound('Play session not found');
  if (session.Status !== 'Playing') throw badRequest('This session has not been checked in');

  const bill = calculateBillFromRow(session, 0);

  return {
    sessionId: Number(sessionId),
    customerName: session.EventParentName || session.FullName || session.GuestName || 'Khách vãng lai',
    phone: session.Phone || null,
    purpose: session.Purpose || 'Play',
    ticketType: session.TypeName || session.EventName || (session.Purpose === 'Event' ? 'Sự kiện' : null),
    eventName: session.EventName || null,
    prepaidOnline: Boolean(session.PrepaidOnline),
    checkinTime: session.CheckinTime,
    checkoutTime: session.PreviewCheckoutTime,
    status: session.Status,
    ...bill,
    services: [],
  };
}

function checkoutTransactionComponents(calculation) {
  return [
    {
      amount: Number(calculation.ticketFee || 0),
      type: calculation.purpose === 'Event' ? 'Sự kiện' : 'Vé vào cửa',
      note: calculation.prepaidOnline ? 'Đã thanh toán online' : calculation.ticketType,
    },
    {
      amount: Number(calculation.overtimePenalty || 0),
      type: 'Phạt lố giờ',
      note: `${calculation.overtimeMinutes || 0} phút lố giờ`,
    },
  ].filter((item) => item.amount > 0);
}

async function recordCheckoutTransactions(connection, calculation, {
  paymentMethod,
  staffId = null,
  customerId = null,
  sessionId,
}) {
  if (Number(calculation.finalAmount || 0) <= 0) return [];

  const components = checkoutTransactionComponents(calculation);
  const isVip = Number(calculation.vipDiscount || 0) > 0;
  let allocated = 0;
  const transactionIds = [];

  for (const [index, component] of components.entries()) {
    const isLast = index === components.length - 1;
    const netAmount = isLast
      ? Math.max(0, Number(calculation.finalAmount || 0) - allocated)
      : isVip
        ? Math.round(component.amount * 0.8)
        : component.amount;

    if (netAmount <= 0) continue;
    allocated += netAmount;
    const transactionId = await recordTransaction(connection, {
      amount: netAmount,
      type: component.type,
      paymentMethod,
      staffId,
      customerId,
      sessionId,
      note: isVip ? `${component.note || ''} - đã trừ ưu đãi VIP 20%`.trim() : component.note,
    });
    transactionIds.push(transactionId);
  }

  return transactionIds;
}

async function checkoutSession(sessionId, { staffId = null, user = null, paymentMethod = 'Tiền mặt' } = {}) {
  await requireGateTicketAccess(user);
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [locked] = await connection.query(`SELECT * FROM PlaySession WHERE SessionID = ? FOR UPDATE`, [sessionId]);
    if (!locked[0]) throw notFound('Play session not found');
    if (locked[0].Status !== 'Playing') throw badRequest('This play session has already been checked out');

    const calculation = await calculateCheckout(sessionId, user, connection);
    await connection.query(
      `UPDATE PlaySession
       SET CheckoutTime = NOW(),
           Status = 'Completed',
           PaymentMethod = CASE WHEN ? > 0 THEN ? ELSE PaymentMethod END,
           PaidAmount = ?
       WHERE SessionID = ?`,
      [calculation.finalAmount, normalizedPaymentMethod, calculation.finalAmount, sessionId],
    );
    await connection.query(
      `INSERT INTO TicketInvoice
        (SessionID, StaffID, TicketFee, OvertimePenalty, ServiceAmount, VIPDiscount, FinalAmount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        staffId,
        calculation.ticketFee,
        calculation.overtimePenalty,
        calculation.serviceAmount,
        calculation.vipDiscount,
        calculation.finalAmount,
      ],
    );

    await recordCheckoutTransactions(connection, calculation, {
      paymentMethod: normalizedPaymentMethod,
      staffId,
      customerId: locked[0].CustomerID,
      sessionId,
    });

    await connection.query(
      `UPDATE Customer c
       JOIN PlaySession ps ON ps.CustomerID = c.CustomerID
       SET c.AccumulatedHours = c.AccumulatedHours + ?,
           c.LoyaltyPoints = c.LoyaltyPoints + ?,
           c.UpdatedAt = NOW()
       WHERE ps.SessionID = ? AND c.IsVIP = TRUE`,
      [calculation.playedMinutes / 60, Math.max(1, Math.floor(calculation.playedMinutes / 30)), sessionId],
    );

    await connection.commit();
    return { ...calculation, status: 'Completed', paymentMethod: calculation.finalAmount > 0 ? normalizedPaymentMethod : null };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function sellServiceOrder({
  username = '',
  customerId = null,
  items = [],
  paymentMethod = 'Tiền mặt',
  staffId = null,
  user = null,
}) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('At least one service item is required');
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let resolvedCustomer = null;
    if (username) {
      const customer = await findCustomerByUsername(username, connection);
      if (customer) {
        resolvedCustomer = customer;
        customerId = customer.CustomerID;
      }
    }

    let activeSessionId = null;
    if (customerId) {
      const [sessions] = await connection.query(
        `SELECT SessionID
         FROM PlaySession
         WHERE CustomerID = ? AND Status = 'Playing'
         ORDER BY CheckinTime DESC
         LIMIT 1
         FOR UPDATE`,
        [customerId],
      );
      activeSessionId = sessions[0]?.SessionID || null;
    }

    let serviceAmount = 0;
    const orderLines = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity || 0);
      if (!productId || quantity <= 0) continue;
      const [products] = await connection.query(
        `SELECT * FROM Product WHERE ProductID = ? AND Active = TRUE FOR UPDATE`,
        [productId],
      );
      const product = products[0];
      if (!product) throw notFound('Service item not found');
      await assertProductSaleAccess(user, product.FacilityID);
      if (Number(product.Stock) < quantity) throw badRequest('Not enough stock for selected service');
      const unitPrice = toNumber(product.Price);
      const lineTotal = unitPrice * quantity;
      serviceAmount += lineTotal;
      orderLines.push({ productId, quantity, unitPrice });
      await connection.query(`UPDATE Product SET Stock = Stock - ? WHERE ProductID = ?`, [quantity, productId]);
    }

    if (serviceAmount <= 0) throw badRequest('At least one service item is required');
    const isVip = customerIsVip(resolvedCustomer);
    const vipDiscount = isVip ? Math.round(serviceAmount * 0.2) : 0;
    const finalAmount = Math.max(0, serviceAmount - vipDiscount);

    const [orderResult] = await connection.query(
      `INSERT INTO RetailOrder (CustomerID, StaffID, TotalAmount, Source, Status)
       VALUES (?, ?, ?, 'Service', 'Paid')`,
      [customerId || null, staffId, finalAmount],
    );
    const orderId = orderResult.insertId;

    for (const line of orderLines) {
      await connection.query(
        `INSERT INTO RetailOrderDetail (OrderID, ProductID, Quantity, UnitPrice)
         VALUES (?, ?, ?, ?)`,
        [orderId, line.productId, line.quantity, line.unitPrice],
      );
    }

    const transactionId = await recordTransaction(connection, {
      amount: finalAmount,
      type: 'Dịch vụ lẻ',
      paymentMethod: normalizedPaymentMethod,
      staffId,
      customerId: customerId || null,
      sessionId: activeSessionId,
      orderId,
      note: isVip ? 'Thanh toán riêng dịch vụ - đã trừ ưu đãi VIP 20%' : 'Thanh toán riêng dịch vụ',
    });

    await connection.commit();
    return {
      orderId,
      transactionId,
      customerId: customerId || null,
      sessionId: activeSessionId,
      grossAmount: serviceAmount,
      vipDiscount,
      finalAmount,
      paymentMethod: normalizedPaymentMethod,
      message: 'Service order was paid separately',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  calculateCheckout,
  checkinSession,
  checkoutSession,
  createSession,
  listActiveSessions,
  listProducts,
  listTicketTypes,
  sellServiceOrder,
};
