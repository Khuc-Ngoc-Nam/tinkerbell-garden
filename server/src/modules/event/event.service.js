const db = require('../../config/db');
const { sendTransactionalEmail } = require('../../services/email.service');
const { badRequest, notFound } = require('../../utils/http');
const { generatePublicCode } = require('../../utils/security');
const { findOrCreateCustomer } = require('../customer/customer.service');
const { normalizePaymentMethod, recordTransaction } = require('../transaction/transaction.service');

const EVENT_TYPES = [
  'Cuộc thi',
  'Workshop',
  'Tri ân khách hàng',
  'Tri ân CB/NV/BQL',
  'Buổi đào tạo',
  'Buổi gặp mặt/networking',
  'Sự kiện nội bộ',
  'Khác',
  'Lễ hội',
];

const DELIVERY_MODES = ['Online', 'Offline', 'Hybrid'];

function normalizeDiscount(value) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric) || numeric < 0) throw badRequest('Discount rate must be a positive number');
  if (numeric > 100) throw badRequest('Discount rate cannot exceed 100%');
  return numeric > 1 ? numeric / 100 : numeric;
}

function normalizePercent(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
    throw badRequest('Percent value must be between 0 and 100');
  }
  return numeric;
}

function asDateTime(date, time, fallback) {
  if (date && time) return `${date} ${time.length === 5 ? `${time}:00` : time}`;
  if (fallback) return fallback;
  return null;
}

function toDateInput(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${month}-${day}`;
}

function toTimeInput(value) {
  if (!value) return null;
  return String(value).slice(0, 8);
}

function mapEvent(row) {
  const ticketPrice = Number(row.TicketPrice || 0);
  const onlineDiscountPercent = Number(row.OnlineDiscountPercent ?? Number(row.DiscountRate || 0) * 100);

  return {
    id: row.EventID,
    name: row.EventName,
    eventType: row.EventType || 'Khác',
    description: row.Description || '',
    scale: row.ScaleText || '',
    estimatedCost: Number(row.EstimatedCost || 0),
    sponsor: row.Sponsor || '',
    plannedDate: toDateInput(row.PlannedDate || row.StartDate),
    startTime: toTimeInput(row.StartTime || row.StartDate),
    endTime: toTimeInput(row.EndTime || row.EndDate),
    registrationDeadline: toDateInput(row.RegistrationDeadline || row.StartDate),
    deliveryMode: row.DeliveryMode || 'Offline',
    startDate: row.StartDate,
    endDate: row.EndDate,
    ticketPrice,
    participationFee: ticketPrice,
    discountRate: Number(row.DiscountRate || 0),
    discountPercent: Math.round(Number(row.DiscountRate || 0) * 100),
    onlineDiscountPercent,
    marketingHtml: row.MarketingHtml || '',
    capacity: Number(row.Capacity || 0),
    status: row.Status,
  };
}

function mapBooking(row) {
  return {
    id: row.BookingID,
    eventId: row.EventID,
    eventName: row.EventName,
    customerName: row.FullName,
    email: row.Email,
    phone: row.Phone,
    childName: row.ChildName,
    childAge: row.ChildAge,
    quantity: Number(row.Quantity || 1),
    unitPrice: Number(row.UnitPrice || 0),
    discountAmount: Number(row.DiscountAmount || 0),
    finalAmount: Number(row.FinalAmount || 0),
    qrCode: row.QRCode,
    status: row.Status,
    bookingDate: row.BookingDate,
    paidAt: row.PaidAt,
    checkedInAt: row.CheckedInAt,
  };
}

function mapOnlineRegistration(row) {
  return {
    id: row.RegistrationID,
    source: 'registration',
    eventId: row.EventID,
    eventName: row.EventName,
    customerName: row.ParentName,
    parentName: row.ParentName,
    childrenCount: Number(row.TicketCount || 0),
    phone: row.Phone,
    email: row.Email,
    amount: Number(row.FinalAmount || 0),
    finalAmount: Number(row.FinalAmount || 0),
    status: row.Status,
    isPaid: row.Status === 'Confirmed',
    paidAt: row.PaidAt,
    submittedAt: row.SubmittedAt,
  };
}

function mapLegacyBookingRegistration(row) {
  return {
    id: `booking-${row.BookingID}`,
    source: 'booking',
    eventId: row.EventID,
    eventName: row.EventName,
    customerName: row.FullName,
    parentName: row.FullName,
    childrenCount: Number(row.Quantity || 1),
    phone: row.Phone,
    email: row.Email,
    amount: Number(row.FinalAmount || 0),
    finalAmount: Number(row.FinalAmount || 0),
    status: row.Status,
    isPaid: row.Status === 'Paid' || row.Status === 'CheckedIn',
    paidAt: row.PaidAt,
    submittedAt: row.BookingDate,
    qrCode: row.QRCode,
  };
}

async function ensureGateSessionForEventRegistration(connection, registration) {
  const [existing] = await connection.query(
    `SELECT SessionID
     FROM PlaySession
     WHERE EventRegistrationID = ?
     LIMIT 1`,
    [registration.RegistrationID],
  );
  if (existing[0]) return existing[0].SessionID;

  const [result] = await connection.query(
    `INSERT INTO PlaySession
      (CustomerID, TypeID, EventID, StaffID, GuestName, Purpose, Source,
       EventBookingID, EventRegistrationID, PrepaidOnline, ChildrenCount, AdultsCount,
       PaymentMethod, PaidAmount, CheckinTime, Status)
     VALUES (?, NULL, ?, NULL, ?, 'Event', 'EventBooking',
       NULL, ?, TRUE, ?, 0, NULL, 0, NULL, 'Pending')`,
    [
      registration.CustomerID || null,
      registration.EventID,
      registration.ParentName,
      registration.RegistrationID,
      Math.max(1, Number(registration.TicketCount || 1)),
    ],
  );
  return result.insertId;
}

async function ensureGateSessionForEventBooking(connection, booking) {
  const [existing] = await connection.query(
    `SELECT SessionID
     FROM PlaySession
     WHERE EventBookingID = ?
     LIMIT 1`,
    [booking.BookingID],
  );
  if (existing[0]) return existing[0].SessionID;

  const [result] = await connection.query(
    `INSERT INTO PlaySession
      (CustomerID, TypeID, EventID, StaffID, GuestName, Purpose, Source,
       EventBookingID, EventRegistrationID, PrepaidOnline, ChildrenCount, AdultsCount,
       PaymentMethod, PaidAmount, CheckinTime, Status)
     VALUES (?, NULL, ?, NULL, ?, 'Event', 'EventBooking',
       ?, NULL, TRUE, ?, 0, NULL, 0, NULL, 'Pending')`,
    [
      booking.CustomerID || null,
      booking.EventID,
      booking.FullName || booking.ChildName || 'Khách sự kiện',
      booking.BookingID,
      Math.max(1, Number(booking.Quantity || 1)),
    ],
  );
  return result.insertId;
}

async function cleanupEndedEventRegistrations(connection = db) {
  const [registrationRows] = await connection.query(
    `SELECT er.RegistrationID
     FROM EventRegistration er
     JOIN EventCampaign ec ON ec.EventID = er.EventID
     WHERE ec.EndDate < NOW()`,
  );
  const registrationIds = registrationRows.map((row) => row.RegistrationID);

  if (registrationIds.length) {
    await connection.query(
      `UPDATE Transactions SET EventRegistrationID = NULL WHERE EventRegistrationID IN (?)`,
      [registrationIds],
    );
    await connection.query(
      `UPDATE PlaySession SET EventRegistrationID = NULL WHERE EventRegistrationID IN (?)`,
      [registrationIds],
    );
    await connection.query(
      `DELETE FROM EventRegistrationChild WHERE RegistrationID IN (?)`,
      [registrationIds],
    );
    await connection.query(
      `DELETE FROM EventRegistration WHERE RegistrationID IN (?)`,
      [registrationIds],
    );
  }

  const [bookingRows] = await connection.query(
    `SELECT eb.BookingID
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     WHERE ec.EndDate < NOW()`,
  );
  const bookingIds = bookingRows.map((row) => row.BookingID);

  if (bookingIds.length) {
    await connection.query(
      `UPDATE PlaySession SET EventBookingID = NULL WHERE EventBookingID IN (?)`,
      [bookingIds],
    );
    await connection.query(
      `DELETE FROM EventBooking WHERE BookingID IN (?)`,
      [bookingIds],
    );
  }

  return {
    registrationCount: registrationIds.length,
    bookingCount: bookingIds.length,
  };
}

async function listEvents({ publicOnly = false, search = '' } = {}) {
  const params = [];
  const filters = [];
  if (publicOnly) {
    filters.push(`Status = 'Published' AND EndDate >= NOW()`);
  }
  if (search) {
    filters.push(`EventName LIKE ?`);
    params.push(`%${search}%`);
  }

  const [rows] = await db.query(
    `SELECT *
     FROM EventCampaign
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY StartDate ASC`,
    params,
  );
  return rows.map(mapEvent);
}

async function listOnlineRegistrations({ phone = '', search = '' } = {}) {
  await cleanupEndedEventRegistrations();

  const keyword = String(phone || search || '').trim();
  const registrationParams = [];
  const registrationFilters = [];
  if (keyword) {
    registrationFilters.push(`er.Phone LIKE ?`);
    registrationParams.push(`%${keyword}%`);
  }

  const [registrationRows] = await db.query(
    `SELECT er.*, ec.EventName
     FROM EventRegistration er
     JOIN EventCampaign ec ON ec.EventID = er.EventID
     ${registrationFilters.length ? `WHERE ${registrationFilters.join(' AND ')}` : ''}
     ORDER BY er.SubmittedAt DESC`,
    registrationParams,
  );

  const bookingParams = [];
  const bookingFilters = [];
  if (keyword) {
    bookingFilters.push(`c.Phone LIKE ?`);
    bookingParams.push(`%${keyword}%`);
  }

  const [bookingRows] = await db.query(
    `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     JOIN Customer c ON c.CustomerID = eb.CustomerID
     ${bookingFilters.length ? `WHERE ${bookingFilters.join(' AND ')}` : ''}
     ORDER BY eb.BookingDate DESC`,
    bookingParams,
  );

  return [
    ...registrationRows.map(mapOnlineRegistration),
    ...bookingRows.map(mapLegacyBookingRegistration),
  ].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
  });
}

async function getEvent(eventId, connection = db) {
  const [rows] = await connection.query(`SELECT * FROM EventCampaign WHERE EventID = ?`, [eventId]);
  if (!rows[0]) throw notFound('Event not found');
  return rows[0];
}

async function getPublicEvent(eventId) {
  const event = await getEvent(eventId);
  if (event.Status !== 'Published' || new Date(event.EndDate) < new Date()) {
    throw notFound('Event not found');
  }
  return mapEvent(event);
}

function normalizeEventPayload(payload, current = {}) {
  const name = payload.name ?? current.EventName;
  const eventType = payload.eventType ?? current.EventType ?? 'Khác';
  const description = payload.description ?? current.Description ?? '';
  const plannedDate = payload.plannedDate ?? toDateInput(current.PlannedDate || current.StartDate);
  const startTime = payload.startTime ?? toTimeInput(current.StartTime || current.StartDate);
  const endTime = payload.endTime ?? toTimeInput(current.EndTime || current.EndDate);
  const startDate = payload.startDate ?? asDateTime(plannedDate, startTime, current.StartDate);
  const endDate = payload.endDate ?? asDateTime(plannedDate, endTime, current.EndDate);
  const deliveryMode = payload.deliveryMode ?? current.DeliveryMode ?? 'Offline';

  if (!name || !plannedDate || !startTime || !endTime) {
    throw badRequest('Event name, planned date, start time and end time are required');
  }
  if (!EVENT_TYPES.includes(eventType)) throw badRequest('Invalid event type');
  if (!DELIVERY_MODES.includes(deliveryMode)) throw badRequest('Invalid event delivery mode');
  if (new Date(startDate) >= new Date(endDate)) throw badRequest('Start time must be before end time');

  return {
    name,
    eventType,
    description,
    scale: payload.scale ?? payload.capacity ?? current.ScaleText ?? '',
    estimatedCost: Number(payload.estimatedCost ?? current.EstimatedCost ?? 0),
    sponsor: payload.sponsor ?? current.Sponsor ?? null,
    plannedDate,
    startTime,
    endTime,
    registrationDeadline: payload.registrationDeadline ?? current.RegistrationDeadline ?? plannedDate,
    deliveryMode,
    startDate,
    endDate,
    ticketPrice: Number(payload.participationFee ?? payload.ticketPrice ?? current.TicketPrice ?? 0),
    discountRate: normalizeDiscount(payload.discountRate ?? payload.onlineDiscountPercent ?? current.DiscountRate ?? 20),
    onlineDiscountPercent: normalizePercent(payload.onlineDiscountPercent ?? current.OnlineDiscountPercent ?? 20, 20),
    marketingHtml: payload.marketingHtml ?? current.MarketingHtml ?? '',
    capacity: Number(payload.capacity ?? current.Capacity ?? 0),
    status: payload.status ?? current.Status ?? 'Published',
  };
}

async function createEvent(payload) {
  const next = normalizeEventPayload(payload);

  const [result] = await db.query(
    `INSERT INTO EventCampaign
       (EventName, EventType, Description, ScaleText, EstimatedCost, Sponsor, PlannedDate,
        StartTime, EndTime, RegistrationDeadline, DeliveryMode, StartDate, EndDate,
        TicketPrice, DiscountRate, OnlineDiscountPercent, MarketingHtml, Capacity, Status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      next.name,
      next.eventType,
      next.description,
      next.scale,
      next.estimatedCost,
      next.sponsor || null,
      next.plannedDate,
      next.startTime,
      next.endTime,
      next.registrationDeadline,
      next.deliveryMode,
      next.startDate,
      next.endDate,
      next.ticketPrice,
      next.discountRate,
      next.onlineDiscountPercent,
      next.marketingHtml,
      next.capacity,
      next.status,
    ],
  );
  return mapEvent(await getEvent(result.insertId));
}

async function updateEvent(eventId, payload) {
  const current = await getEvent(eventId);
  const next = normalizeEventPayload(payload, current);

  await db.query(
    `UPDATE EventCampaign
     SET EventName = ?, EventType = ?, Description = ?, ScaleText = ?, EstimatedCost = ?,
         Sponsor = ?, PlannedDate = ?, StartTime = ?, EndTime = ?, RegistrationDeadline = ?,
         DeliveryMode = ?, StartDate = ?, EndDate = ?, TicketPrice = ?, DiscountRate = ?,
         OnlineDiscountPercent = ?, MarketingHtml = ?, Capacity = ?, Status = ?, UpdatedAt = NOW()
     WHERE EventID = ?`,
    [
      next.name,
      next.eventType,
      next.description,
      next.scale,
      next.estimatedCost,
      next.sponsor || null,
      next.plannedDate,
      next.startTime,
      next.endTime,
      next.registrationDeadline,
      next.deliveryMode,
      next.startDate,
      next.endDate,
      next.ticketPrice,
      next.discountRate,
      next.onlineDiscountPercent,
      next.marketingHtml,
      next.capacity,
      next.status,
      eventId,
    ],
  );
  return mapEvent(await getEvent(eventId));
}

function pluckIds(rows, key) {
  return rows.map((row) => row[key]).filter(Boolean);
}

async function deleteEvent(eventId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [eventRows] = await connection.query(
      `SELECT EventID FROM EventCampaign WHERE EventID = ? FOR UPDATE`,
      [eventId],
    );
    if (!eventRows[0]) throw notFound('Event not found');

    const [registrationRows] = await connection.query(
      `SELECT RegistrationID FROM EventRegistration WHERE EventID = ? FOR UPDATE`,
      [eventId],
    );
    const [bookingRows] = await connection.query(
      `SELECT BookingID FROM EventBooking WHERE EventID = ? FOR UPDATE`,
      [eventId],
    );

    const registrationIds = pluckIds(registrationRows, 'RegistrationID');
    const bookingIds = pluckIds(bookingRows, 'BookingID');

    await connection.query(`UPDATE PlaySession SET EventID = NULL WHERE EventID = ?`, [eventId]);

    if (registrationIds.length) {
      await connection.query(
        `UPDATE Transactions SET EventRegistrationID = NULL WHERE EventRegistrationID IN (?)`,
        [registrationIds],
      );
      await connection.query(
        `UPDATE PlaySession SET EventRegistrationID = NULL WHERE EventRegistrationID IN (?)`,
        [registrationIds],
      );
      await connection.query(
        `DELETE FROM EventRegistrationChild WHERE RegistrationID IN (?)`,
        [registrationIds],
      );
      await connection.query(
        `DELETE FROM EventRegistration WHERE RegistrationID IN (?)`,
        [registrationIds],
      );
    }

    if (bookingIds.length) {
      await connection.query(
        `UPDATE PlaySession SET EventBookingID = NULL WHERE EventBookingID IN (?)`,
        [bookingIds],
      );
      await connection.query(
        `DELETE FROM EventBooking WHERE BookingID IN (?)`,
        [bookingIds],
      );
    }

    await connection.query(`DELETE FROM EventCampaign WHERE EventID = ?`, [eventId]);

    await connection.commit();
    return { id: Number(eventId), deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function resolveCustomerForRegistration(connection, payload, user) {
  if (user?.type === 'customer') {
    const [rows] = await connection.query(`SELECT * FROM Customer WHERE CustomerID = ? FOR UPDATE`, [user.sub]);
    if (rows[0]) return rows[0];
  }
  return findOrCreateCustomer(connection, {
    fullName: payload.parentName,
    email: payload.email,
    phone: payload.phone,
  });
}

function customerIsVip(customer) {
  return Boolean(customer?.IsVIP) && customer.VIPExpiryDate && new Date(customer.VIPExpiryDate) >= new Date();
}

async function registerEventOnline(eventId, payload, user = null) {
  const parentName = String(payload.parentName || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim();
  const ticketCount = Number(payload.ticketCount || 0);
  const children = Array.isArray(payload.children) ? payload.children : [];

  if (!parentName || !phone || !email || !ticketCount) {
    throw badRequest('Parent name, phone, email and ticket count are required');
  }
  if (ticketCount < 1 || ticketCount > 50) throw badRequest('Ticket count is invalid');
  if (children.length !== ticketCount) throw badRequest('Children rows must match ticket count');
  if (children.some((child) => !String(child.childName || '').trim())) {
    throw badRequest('Child name is required');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const event = await getEvent(eventId, connection);
    if (event.Status !== 'Published' || new Date(event.EndDate) < new Date()) {
      throw badRequest('Event is not available for registration');
    }

    const customer = await resolveCustomerForRegistration(connection, { parentName, email, phone }, user);
    const unitPrice = Number(event.TicketPrice || 0);
    const earlyDiscountPercent = 20;
    const vipDiscountPercent = customerIsVip(customer) ? 20 : 0;
    const finalAmount = Math.max(
      0,
      Math.round(unitPrice * ticketCount * (100 - earlyDiscountPercent - vipDiscountPercent) / 100),
    );
    const transferContent = `${phone} ${parentName}`;

    const [result] = await connection.query(
      `INSERT INTO EventRegistration
        (EventID, CustomerID, ParentName, Phone, Email, TicketCount, UnitPrice,
         EarlyDiscountPercent, VipDiscountPercent, FinalAmount, TransferContent, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TransferSubmitted')`,
      [
        event.EventID,
        customer.CustomerID,
        parentName,
        phone,
        email,
        ticketCount,
        unitPrice,
        earlyDiscountPercent,
        vipDiscountPercent,
        finalAmount,
        transferContent,
      ],
    );

    for (const [index, child] of children.entries()) {
      await connection.query(
        `INSERT INTO EventRegistrationChild (RegistrationID, RowNo, ChildName, Mobile, BirthDate)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.insertId,
          index + 1,
          String(child.childName || '').trim(),
          child.mobile || null,
          child.birthDate || null,
        ],
      );
    }

    await connection.commit();

    return {
      id: result.insertId,
      eventId: event.EventID,
      eventName: event.EventName,
      finalAmount,
      earlyDiscountPercent,
      vipDiscountPercent,
      transferContent,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function parseOnlineRegistrationRef(value) {
  const raw = String(value || '').trim();
  if (raw.startsWith('booking-')) {
    return { source: 'booking', id: Number(raw.replace('booking-', '')) };
  }
  if (raw.startsWith('registration-')) {
    return { source: 'registration', id: Number(raw.replace('registration-', '')) };
  }
  return { source: 'registration', id: Number(raw) };
}

async function confirmLegacyBooking(bookingId, {
  staffId = null,
  paymentMethod = 'Chuyển khoản',
} = {}) {
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
       FROM EventBooking eb
       JOIN EventCampaign ec ON ec.EventID = eb.EventID
       JOIN Customer c ON c.CustomerID = eb.CustomerID
       WHERE eb.BookingID = ?
       FOR UPDATE`,
      [bookingId],
    );
    const booking = rows[0];
    if (!booking) throw notFound('Event booking not found');

    const sessionId = await ensureGateSessionForEventBooking(connection, booking);

    if (booking.Status !== 'Paid' && booking.Status !== 'CheckedIn') {
      await recordTransaction(connection, {
        amount: Number(booking.FinalAmount || 0),
        type: 'Sự kiện',
        paymentMethod: normalizedPaymentMethod,
        staffId,
        customerId: booking.CustomerID,
        sessionId,
        note: booking.EventName,
      });
      await connection.query(
        `UPDATE EventBooking
         SET Status = 'Paid',
             PaidAt = NOW()
         WHERE BookingID = ?`,
        [booking.BookingID],
      );
    }
    await connection.commit();
    const [updated] = await db.query(
      `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
       FROM EventBooking eb
       JOIN EventCampaign ec ON ec.EventID = eb.EventID
       JOIN Customer c ON c.CustomerID = eb.CustomerID
       WHERE eb.BookingID = ?`,
      [bookingId],
    );
    return { ...mapLegacyBookingRegistration(updated[0]), gateSessionId: sessionId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function confirmOnlineRegistration(registrationId, {
  staffId = null,
  paymentMethod = 'Chuyển khoản',
} = {}) {
  const reference = parseOnlineRegistrationRef(registrationId);
  if (reference.source === 'booking') {
    return confirmLegacyBooking(reference.id, { staffId, paymentMethod });
  }
  registrationId = reference.id;
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT er.*, ec.EventName
       FROM EventRegistration er
       JOIN EventCampaign ec ON ec.EventID = er.EventID
       WHERE er.RegistrationID = ?
       FOR UPDATE`,
      [registrationId],
    );
    const registration = rows[0];
    if (!registration) throw notFound('Event registration not found');

    const sessionId = await ensureGateSessionForEventRegistration(connection, registration);

    if (registration.Status !== 'Confirmed') {
      const transactionId = await recordTransaction(connection, {
        amount: Number(registration.FinalAmount || 0),
        type: 'Sự kiện',
        paymentMethod: normalizedPaymentMethod,
        staffId,
        customerId: registration.CustomerID,
        sessionId,
        eventRegistrationId: registration.RegistrationID,
        note: registration.EventName,
      });
      await connection.query(
        `UPDATE EventRegistration
         SET Status = 'Confirmed',
             PaidAt = NOW(),
             TransactionID = ?
         WHERE RegistrationID = ?`,
        [transactionId, registration.RegistrationID],
      );
    }
    await connection.commit();
    const [updated] = await db.query(
      `SELECT er.*, ec.EventName
       FROM EventRegistration er
       JOIN EventCampaign ec ON ec.EventID = er.EventID
       WHERE er.RegistrationID = ?`,
      [registrationId],
    );
    return { ...mapOnlineRegistration(updated[0]), gateSessionId: sessionId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function bookEvent(payload) {
  const { eventId, fullName, email, phone, childName = '', childAge = null, quantity = 1 } = payload;
  if (!eventId || !fullName || !email || !phone) {
    throw badRequest('Event, parent name, email and phone are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Email is invalid');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const event = await getEvent(eventId, connection);
    if (event.Status !== 'Published' || new Date(event.EndDate) < new Date()) {
      throw badRequest('Event is not available for booking');
    }

    const customer = await findOrCreateCustomer(connection, { fullName, email, phone });
    const unitPrice = Number(event.TicketPrice || 0);
    const gross = unitPrice * Number(quantity || 1);
    const discountAmount = gross * Number(event.DiscountRate || 0);
    const finalAmount = Math.max(0, gross - discountAmount);
    const qrCode = generatePublicCode('EV');

    const [result] = await connection.query(
      `INSERT INTO EventBooking
        (EventID, CustomerID, ChildName, ChildAge, Quantity, UnitPrice, DiscountAmount, FinalAmount, QRCode, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PendingPayment')`,
      [eventId, customer.CustomerID, childName || null, childAge || null, Number(quantity || 1), unitPrice, discountAmount, finalAmount, qrCode],
    );

    await connection.commit();

    const [bookedRows] = await db.query(
      `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
       FROM EventBooking eb
       JOIN EventCampaign ec ON ec.EventID = eb.EventID
       JOIN Customer c ON c.CustomerID = eb.CustomerID
       WHERE eb.BookingID = ?`,
      [result.insertId],
    );
    const booking = mapBooking(bookedRows[0]);

    let emailStatus;
    try {
      emailStatus = await sendTransactionalEmail({
        to: email,
        subject: `Xác nhận đăng ký ${event.EventName}`,
        html: `<p>Xin chào ${fullName},</p><p>Mã đặt chỗ của bạn là <strong>${qrCode}</strong>.</p>`,
      });
    } catch (error) {
      emailStatus = { sent: false, status: 'Failed', error: error.message };
    }

    return { ...booking, emailStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listBookings({ status = '', search = '' } = {}) {
  const params = [];
  const filters = [];
  if (status) {
    filters.push('eb.Status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('(eb.QRCode LIKE ? OR c.FullName LIKE ? OR c.Phone LIKE ? OR c.Email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [rows] = await db.query(
    `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     JOIN Customer c ON c.CustomerID = eb.CustomerID
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY eb.BookingDate DESC`,
    params,
  );
  return rows.map(mapBooking);
}

async function setBookingStatus(qrCode, status) {
  const allowed = ['PendingPayment', 'Paid', 'CheckedIn', 'Cancelled'];
  if (!allowed.includes(status)) throw badRequest('Invalid booking status');

  const [rows] = await db.query(
    `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     JOIN Customer c ON c.CustomerID = eb.CustomerID
     WHERE eb.QRCode = ?
     LIMIT 1`,
    [qrCode],
  );
  if (!rows[0]) throw notFound('Booking code not found');

  await db.query(
    `UPDATE EventBooking
     SET Status = ?,
         PaidAt = CASE WHEN ? = 'Paid' AND PaidAt IS NULL THEN NOW() ELSE PaidAt END,
         CheckedInAt = CASE WHEN ? = 'CheckedIn' AND CheckedInAt IS NULL THEN NOW() ELSE CheckedInAt END
     WHERE QRCode = ?`,
    [status, status, status, qrCode],
  );
  const [updated] = await db.query(
    `SELECT eb.*, ec.EventName, c.FullName, c.Email, c.Phone
     FROM EventBooking eb
     JOIN EventCampaign ec ON ec.EventID = eb.EventID
     JOIN Customer c ON c.CustomerID = eb.CustomerID
     WHERE eb.QRCode = ?`,
    [qrCode],
  );
  return mapBooking(updated[0]);
}

module.exports = {
  EVENT_TYPES,
  bookEvent,
  createEvent,
  deleteEvent,
  getPublicEvent,
  confirmOnlineRegistration,
  listBookings,
  listEvents,
  listOnlineRegistrations,
  registerEventOnline,
  setBookingStatus,
  updateEvent,
};
