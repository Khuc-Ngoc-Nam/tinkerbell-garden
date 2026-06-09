const db = require('../../config/db');
const customerService = require('../customer/customer.service');
const eventService = require('../event/event.service');
const { badRequest, notFound } = require('../../utils/http');
const { generatePublicCode } = require('../../utils/security');

async function getParkInfo() {
  const events = await eventService.listEvents({ publicOnly: true });
  const [tickets] = await db.query(
    `SELECT TypeID AS id, TypeName AS type, BasePrice AS price, TimeLimit AS timeLimit
     FROM TicketType
     WHERE Active = TRUE
     ORDER BY TypeID`,
  );
  const [facilities] = await db.query(
    `SELECT FacilityID AS id, FacilityName AS name, Description AS description, Status AS status,
            AssetStatus AS assetStatus, Capacity AS capacity, ImageURL AS imageUrl
     FROM Facility
     ORDER BY FacilityName`,
  );
  const [serviceRows] = await db.query(
    `SELECT ps.ServiceID AS id, ps.FacilityID AS facilityId, f.FacilityName AS facilityName,
            ps.ServiceName AS name, ps.Description AS description, ps.ImageURL AS imageUrl
     FROM PaidService ps
     JOIN Facility f ON f.FacilityID = ps.FacilityID
     WHERE ps.Active = TRUE
     ORDER BY f.FacilityName, ps.ServiceName`,
  );
  const [productRows] = await db.query(
    `SELECT p.ProductID AS id, p.FacilityID AS facilityId, p.ServiceID AS serviceId,
            f.FacilityName AS facilityName, ps.ServiceName AS serviceName,
            p.ProductName AS name, p.Category AS category, p.Price AS price,
            p.Stock AS stock, p.ImageURL AS imageUrl
     FROM Product p
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN PaidService ps ON ps.ServiceID = p.ServiceID
     WHERE p.Active = TRUE
     ORDER BY f.FacilityName, COALESCE(ps.ServiceName, p.Category), p.ProductName`,
  );
  const normalizedProducts = productRows.map((product) => ({
    ...product,
    facilityId: product.facilityId ? Number(product.facilityId) : null,
    serviceId: product.serviceId ? Number(product.serviceId) : null,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
  }));
  const normalizedServices = serviceRows.map((service) => ({
    ...service,
    facilityId: Number(service.facilityId),
    products: normalizedProducts.filter((product) => Number(product.serviceId) === Number(service.id)),
  }));
  const facilitiesWithProducts = facilities.map((facility) => ({
    ...facility,
    capacity: Number(facility.capacity || 0),
    services: normalizedServices.filter((service) => Number(service.facilityId) === Number(facility.id)),
    products: normalizedProducts.filter((product) => Number(product.facilityId) === Number(facility.id)),
  }));

  return {
    name: 'TinkerBell Garden',
    tagline: 'Khu vui chơi trong nhà cho trẻ em và gia đình',
    description:
      'TinkerBell Garden vận hành vé vào cửa, hoạt động sự kiện, dịch vụ tính phí và thành viên VIP trên cùng một hệ thống.',
    openingHours: '08:00 - 22:00 hằng ngày',
    ticketPrices: tickets,
    events,
    facilities: facilitiesWithProducts,
    paidServices: normalizedProducts,
    policies: {
      guardian: 'Một bé được đi kèm một phụ huynh miễn phí.',
      overtime: 'Vé 2 giờ tính thêm 50.000 VND cho mỗi block 30 phút phát sinh.',
      vip: 'VIP 400.000 VND/năm, giảm 20% vé vào cửa cho một bé mỗi lượt chơi.',
    },
  };
}

async function getPaidServiceDetail(serviceId) {
  const [serviceRows] = await db.query(
    `SELECT ps.ServiceID AS id, ps.FacilityID AS facilityId, f.FacilityName AS facilityName,
            ps.ServiceName AS name, ps.Description AS description, ps.ImageURL AS imageUrl
     FROM PaidService ps
     JOIN Facility f ON f.FacilityID = ps.FacilityID
     WHERE ps.ServiceID = ? AND ps.Active = TRUE
     LIMIT 1`,
    [serviceId],
  );
  if (!serviceRows[0]) throw notFound('Paid service not found');

  const [productRows] = await db.query(
    `SELECT ProductID AS id, FacilityID AS facilityId, ServiceID AS serviceId,
            ProductName AS name, Category AS category, Price AS price, Stock AS stock,
            ImageURL AS imageUrl
     FROM Product
     WHERE ServiceID = ? AND Active = TRUE
     ORDER BY ProductName`,
    [serviceId],
  );

  return {
    ...serviceRows[0],
    facilityId: Number(serviceRows[0].facilityId),
    products: productRows.map((product) => ({
      ...product,
      facilityId: product.facilityId ? Number(product.facilityId) : null,
      serviceId: product.serviceId ? Number(product.serviceId) : null,
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
    })),
  };
}

async function listEvents() {
  return eventService.listEvents({ publicOnly: true });
}

async function getEventDetail(eventId) {
  return eventService.getPublicEvent(eventId);
}

async function bookEvent(payload) {
  return eventService.bookEvent(payload);
}

async function registerEventOnline(eventId, payload, user) {
  return eventService.registerEventOnline(eventId, payload, user);
}

async function registerVipOnline(customerId) {
  return customerService.registerOrRenewVipForCustomer({ customerId, channel: 'Online', staffId: null });
}

async function createVipPaymentRequest(customerId, payload = {}) {
  return customerService.createVipPaymentRequest({
    customerId,
    years: payload.years,
  });
}

function mapReservation(row) {
  const children = typeof row.ChildrenJson === 'string' ? JSON.parse(row.ChildrenJson) : row.ChildrenJson || [];
  return {
    id: row.ReservationID,
    ticketTypeId: row.TypeID,
    ticketType: row.TypeName,
    customerName: row.FullName,
    email: row.Email,
    phone: row.Phone,
    childrenCount: Number(row.ChildrenCount || 1),
    adultsCount: Number(row.AdultsCount || 1),
    visitDate: row.VisitDate,
    children,
    specialRequests: row.SpecialRequests,
    unitPrice: Number(row.UnitPrice || 0),
    discountAmount: Number(row.DiscountAmount || 0),
    finalAmount: Number(row.FinalAmount || 0),
    qrCode: row.QRCode,
    status: row.Status,
    paidAt: row.PaidAt,
    createdAt: row.CreatedAt,
  };
}

async function getReservationByCode(qrCode) {
  const [rows] = await db.query(
    `SELECT tr.*, tt.TypeName, c.FullName, c.Email, c.Phone
     FROM TicketReservation tr
     JOIN TicketType tt ON tt.TypeID = tr.TypeID
     JOIN Customer c ON c.CustomerID = tr.CustomerID
     WHERE tr.QRCode = ?
     LIMIT 1`,
    [qrCode],
  );
  if (!rows[0]) throw notFound('Ticket reservation not found');
  return mapReservation(rows[0]);
}

async function reserveTicket(payload) {
  const {
    typeId,
    fullName,
    email,
    phone,
    children = [],
    childrenCount = children.length || 1,
    adultsCount = 1,
    visitDate,
    specialRequests = '',
  } = payload;

  if (!typeId || !fullName || !email || !phone || !visitDate) {
    throw badRequest('Ticket type, guardian information and visit date are required');
  }

  const childList = Array.isArray(children) ? children : [];
  const resolvedChildrenCount = Number(childrenCount || childList.length || 1);
  if (!Number.isInteger(resolvedChildrenCount) || resolvedChildrenCount < 1 || resolvedChildrenCount > 10) {
    throw badRequest('Children count must be between 1 and 10');
  }
  if (childList.some((child) => !child.fullName || !String(child.fullName).trim())) {
    throw badRequest('Each child must have a full name');
  }
  const selectedVisitDate = new Date(`${visitDate}T00:00:00`);
  if (Number.isNaN(selectedVisitDate.getTime())) {
    throw badRequest('Visit date is invalid');
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedVisitDate < today) {
    throw badRequest('Visit date cannot be in the past');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [ticketRows] = await connection.query(
      `SELECT TypeID, TypeName, BasePrice FROM TicketType WHERE TypeID = ? AND Active = TRUE`,
      [typeId],
    );
    if (!ticketRows[0]) throw notFound('Ticket type not found');

    const customer = await customerService.findOrCreateCustomer(connection, { fullName, email, phone });
    const unitPrice = Number(ticketRows[0].BasePrice || 0);
    const finalAmount = unitPrice * resolvedChildrenCount;
    const qrCode = generatePublicCode('TK');

    const [result] = await connection.query(
      `INSERT INTO TicketReservation
        (TypeID, CustomerID, ChildrenCount, AdultsCount, VisitDate, ChildrenJson,
         SpecialRequests, UnitPrice, DiscountAmount, FinalAmount, QRCode, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'PendingPayment')`,
      [
        typeId,
        customer.CustomerID,
        resolvedChildrenCount,
        Number(adultsCount || 1),
        visitDate,
        JSON.stringify(childList),
        specialRequests || null,
        unitPrice,
        finalAmount,
        qrCode,
      ],
    );

    await connection.commit();
    const reservation = await getReservationByCode(qrCode);
    return { ...reservation, id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markTicketReservationPaid(qrCode) {
  await getReservationByCode(qrCode);
  await db.query(
    `UPDATE TicketReservation
     SET Status = 'Paid', PaidAt = COALESCE(PaidAt, NOW())
     WHERE QRCode = ? AND Status = 'PendingPayment'`,
    [qrCode],
  );
  return getReservationByCode(qrCode);
}

module.exports = {
  bookEvent,
  getEventDetail,
  getParkInfo,
  getPaidServiceDetail,
  listEvents,
  markTicketReservationPaid,
  createVipPaymentRequest,
  registerEventOnline,
  reserveTicket,
  registerVipOnline,
};
