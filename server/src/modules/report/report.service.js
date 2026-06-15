const db = require('../../config/db');
const { parseDateRange, toNumber } = require('../../utils/http');

function withDayBounds(from, to) {
  return [`${from} 00:00:00`, `${to} 23:59:59`];
}

async function visitorStats(query) {
  const { from, to } = parseDateRange(query);
  const [start, end] = withDayBounds(from, to);

  const [[summary]] = await db.query(
    `SELECT COUNT(*) AS sessions,
            COALESCE(SUM(ChildrenCount), 0) AS children,
            COALESCE(SUM(AdultsCount), 0) AS adults,
            COALESCE(SUM(CASE WHEN c.IsVIP = TRUE THEN 1 ELSE 0 END), 0) AS vipSessions
     FROM PlaySession ps
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     WHERE ps.CheckinTime BETWEEN ? AND ?`,
    [start, end],
  );

  const [byTicketType] = await db.query(
    `SELECT tt.TypeName AS ticketType,
            COUNT(*) AS sessions,
            COALESCE(SUM(ps.ChildrenCount), 0) AS children
     FROM PlaySession ps
     JOIN TicketType tt ON tt.TypeID = ps.TypeID
     WHERE ps.CheckinTime BETWEEN ? AND ?
     GROUP BY tt.TypeID, tt.TypeName
     ORDER BY tt.TypeID`,
    [start, end],
  );

  const [daily] = await db.query(
    `SELECT DATE(ps.CheckinTime) AS date,
            COUNT(*) AS sessions,
            COALESCE(SUM(ps.ChildrenCount), 0) AS children,
            COALESCE(SUM(ps.AdultsCount), 0) AS adults
     FROM PlaySession ps
     WHERE ps.CheckinTime BETWEEN ? AND ?
     GROUP BY DATE(ps.CheckinTime)
     ORDER BY date`,
    [start, end],
  );

  return {
    range: { from, to },
    summary: {
      sessions: toNumber(summary.sessions),
      children: toNumber(summary.children),
      adults: toNumber(summary.adults),
      vipSessions: toNumber(summary.vipSessions),
    },
    byTicketType: byTicketType.map((row) => ({
      ticketType: row.ticketType,
      sessions: toNumber(row.sessions),
      children: toNumber(row.children),
    })),
    daily: daily.map((row) => ({
      date: row.date,
      sessions: toNumber(row.sessions),
      children: toNumber(row.children),
      adults: toNumber(row.adults),
    })),
  };
}

async function revenueReport(query) {
  const { from, to } = parseDateRange(query);
  const [start, end] = withDayBounds(from, to);

  const [summaryRows] = await db.query(
    `SELECT Type, COALESCE(SUM(Amount), 0) AS amount
     FROM Transactions
     WHERE Timestamp BETWEEN ? AND ?
     GROUP BY Type`,
    [start, end],
  );

  const amountByType = summaryRows.reduce((map, row) => {
    map[row.Type] = toNumber(row.amount);
    return map;
  }, {});

  const sourceBreakdown = {
    ticket: amountByType['Vé vào cửa'] || 0,
    overtime: amountByType['Phạt lố giờ'] || 0,
    paidService: amountByType['Dịch vụ lẻ'] || 0,
    vipMembership: amountByType.VIP || 0,
    eventBooking: amountByType['Sự kiện'] || 0,
  };

  const [daily] = await db.query(
    `SELECT DATE(Timestamp) AS date,
            SUM(CASE WHEN Type = 'Vé vào cửa' THEN Amount ELSE 0 END) AS ticket,
            SUM(CASE WHEN Type = 'Phạt lố giờ' THEN Amount ELSE 0 END) AS overtime,
            SUM(CASE WHEN Type = 'Dịch vụ lẻ' THEN Amount ELSE 0 END) AS paidService,
            SUM(CASE WHEN Type = 'VIP' THEN Amount ELSE 0 END) AS vipMembership,
            SUM(CASE WHEN Type = 'Sự kiện' THEN Amount ELSE 0 END) AS eventBooking
     FROM Transactions
     WHERE Timestamp BETWEEN ? AND ?
     GROUP BY date
     ORDER BY date`,
    [start, end],
  );

  const totalRevenue = Object.values(sourceBreakdown).reduce((sum, value) => sum + value, 0);

  return {
    range: { from, to },
    sourceBreakdown,
    totalRevenue,
    daily: daily.map((row) => ({
      date: row.date,
      ticket: toNumber(row.ticket),
      overtime: toNumber(row.overtime),
      paidService: toNumber(row.paidService),
      vipMembership: toNumber(row.vipMembership),
      eventBooking: toNumber(row.eventBooking),
      total:
        toNumber(row.ticket) +
        toNumber(row.overtime) +
        toNumber(row.paidService) +
        toNumber(row.vipMembership) +
        toNumber(row.eventBooking),
    })),
  };
}

function mapCustomerName(row) {
  return row.FullName || row.GuestName || row.ParentName || 'Khách vãng lai';
}

function mapUsername(row) {
  return row.Username || row.Email || row.Phone || '';
}

async function dashboardData() {
  const [ticketTypes] = await db.query(
    `SELECT TypeID AS id, TypeName AS name
     FROM TicketType
     WHERE Active = TRUE
     ORDER BY TypeID`,
  );

  const [facilities] = await db.query(
    `SELECT FacilityID AS id, FacilityName AS name
     FROM Facility
     ORDER BY FacilityName`,
  );

  const [gatePayments] = await db.query(
    `SELECT ps.SessionID AS id, ps.SessionID AS sessionId,
            COALESCE(SUM(CASE WHEN t.Type = 'Vé vào cửa' THEN t.Amount ELSE 0 END), 0) AS ticketAmount,
            COALESCE(SUM(CASE WHEN t.Type = 'Phạt lố giờ' THEN t.Amount ELSE 0 END), 0) AS overtimeAmount,
            COALESCE(SUM(t.Amount), 0) AS amount,
            MAX(t.PaymentMethod) AS paymentMethod,
            MAX(t.Timestamp) AS paidAt,
            ps.ChildrenCount AS quantity, ps.GuestName,
            c.FullName, c.Email AS Username, c.Phone,
            tt.TypeID AS ticketTypeId, tt.TypeName AS ticketType
     FROM PlaySession ps
     JOIN Transactions t ON t.SessionID = ps.SessionID
       AND t.Type IN ('Vé vào cửa', 'Phạt lố giờ')
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     WHERE ps.Purpose = 'Play'
     GROUP BY ps.SessionID, ps.ChildrenCount, ps.GuestName, c.FullName, c.Email, c.Phone, tt.TypeID, tt.TypeName
     ORDER BY paidAt DESC, ps.SessionID DESC`,
  );

  const [servicePayments] = await db.query(
    `SELECT CONCAT(rod.OrderID, '-', rod.ProductID) AS id,
            ro.OrderID AS orderId,
            t.TransactionID AS transactionId,
            t.SessionID AS sessionId,
            rod.ProductID AS productId,
            rod.Quantity AS quantity,
            rod.UnitPrice AS unitPrice,
            (rod.Quantity * rod.UnitPrice) AS lineTotal,
            order_total.OrderGross AS orderGross,
            COALESCE(t.Amount, ro.TotalAmount, 0) AS servicePaidAmount,
            t.PaymentMethod AS paymentMethod,
            COALESCE(t.Timestamp, ro.OrderDate) AS paidAt,
            ps.GuestName, ps.ChildrenCount,
            c.FullName, c.Email AS Username, c.Phone,
            tt.TypeID AS ticketTypeId, tt.TypeName AS ticketType,
            f.FacilityID AS facilityId, f.FacilityName AS facilityName,
            p.ProductName AS productName
     FROM RetailOrderDetail rod
     JOIN RetailOrder ro ON ro.OrderID = rod.OrderID
     JOIN Product p ON p.ProductID = rod.ProductID
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN Transactions t ON t.OrderID = ro.OrderID AND t.Type = 'Dịch vụ lẻ'
     LEFT JOIN PlaySession ps ON ps.SessionID = t.SessionID
     LEFT JOIN Customer c ON c.CustomerID = ro.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN (
       SELECT OrderID, SUM(Quantity * UnitPrice) AS OrderGross
       FROM RetailOrderDetail
       GROUP BY OrderID
     ) order_total ON order_total.OrderID = rod.OrderID
     WHERE ro.Source = 'Service' AND ro.Status = 'Paid'
     ORDER BY paidAt DESC, ro.OrderID DESC`,
  );

  const [playHistory] = await db.query(
    `SELECT ps.SessionID AS id, ps.SessionID AS sessionId, ps.GuestName,
            ps.CheckinTime AS checkinTime, ps.CheckoutTime AS checkoutTime,
            TIMESTAMPDIFF(MINUTE, ps.CheckinTime, ps.CheckoutTime) AS playedMinutes,
            CASE
              WHEN ps.Purpose = 'Event' AND ec.EventID IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ec.StartDate, ec.EndDate)
              ELSE tt.TimeLimit
            END AS timeLimit,
            COALESCE(gate_tx.TicketAmount, 0) AS ticketAmount,
            COALESCE(gate_tx.OvertimeAmount, 0) AS overtimeAmount,
            COALESCE(service_tx.ServiceAmount, 0) AS serviceAmount,
            COALESCE(gate_tx.Amount, 0) + COALESCE(service_tx.ServiceAmount, 0) AS totalAmount,
            COALESCE(gate_tx.PaymentMethod, service_tx.PaymentMethod) AS paymentMethod,
            COALESCE(gate_tx.PaidAt, service_tx.PaidAt, ps.CheckoutTime) AS paidAt,
            c.FullName, c.Email AS Username, c.Phone,
            tt.TypeID AS ticketTypeId,
            CASE
              WHEN ps.Purpose = 'Event' THEN CONCAT('Sự kiện: ', ec.EventName)
              ELSE tt.TypeName
            END AS ticketType
     FROM PlaySession ps
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN EventCampaign ec ON ec.EventID = ps.EventID
     LEFT JOIN (
       SELECT SessionID,
              SUM(CASE WHEN Type = 'Vé vào cửa' THEN Amount ELSE 0 END) AS TicketAmount,
              SUM(CASE WHEN Type = 'Phạt lố giờ' THEN Amount ELSE 0 END) AS OvertimeAmount,
              SUM(Amount) AS Amount,
              MAX(PaymentMethod) AS PaymentMethod,
              MAX(Timestamp) AS PaidAt
       FROM Transactions
       WHERE Type IN ('Vé vào cửa', 'Phạt lố giờ')
       GROUP BY SessionID
     ) gate_tx ON gate_tx.SessionID = ps.SessionID
     LEFT JOIN (
       SELECT SessionID, SUM(Amount) AS ServiceAmount, MAX(PaymentMethod) AS PaymentMethod, MAX(Timestamp) AS PaidAt
       FROM Transactions
       WHERE Type = 'Dịch vụ lẻ' AND SessionID IS NOT NULL
       GROUP BY SessionID
     ) service_tx ON service_tx.SessionID = ps.SessionID
     WHERE ps.Status = 'Completed'
     ORDER BY ps.CheckoutTime DESC, ps.SessionID DESC`,
  );

  const [vipTransactions] = await db.query(
    `SELECT t.TransactionID AS id, t.Amount AS amount, t.PaymentMethod AS paymentMethod,
            t.Timestamp AS paidAt, c.FullName, c.Email AS Username, c.Phone
     FROM Transactions t
     LEFT JOIN Customer c ON c.CustomerID = t.CustomerID
     WHERE t.Type = 'VIP'
     ORDER BY t.Timestamp DESC, t.TransactionID DESC`,
  );

  const [eventTransactions] = await db.query(
    `SELECT t.TransactionID AS id, t.Amount AS amount, t.PaymentMethod AS paymentMethod,
            t.Timestamp AS paidAt,
            COALESCE(ec.EventName, ec_session.EventName, t.Note) AS eventName,
            COALESCE(ps_direct.SessionID, ps_registration.SessionID) AS sessionId,
            COALESCE(ps_direct.CheckinTime, ps_registration.CheckinTime) AS checkinTime,
            COALESCE(ps_direct.CheckoutTime, ps_registration.CheckoutTime) AS checkoutTime,
            er.ParentName, er.Phone AS RegistrationPhone, er.Email AS RegistrationEmail,
            c.FullName, c.Email AS Username, c.Phone,
            COALESCE(ps_direct.GuestName, ps_registration.GuestName) AS GuestName
     FROM Transactions t
     LEFT JOIN EventRegistration er ON er.RegistrationID = t.EventRegistrationID
     LEFT JOIN EventCampaign ec ON ec.EventID = er.EventID
     LEFT JOIN PlaySession ps_direct ON ps_direct.SessionID = t.SessionID
     LEFT JOIN PlaySession ps_registration ON ps_registration.EventRegistrationID = er.RegistrationID
     LEFT JOIN EventCampaign ec_session ON ec_session.EventID = COALESCE(ps_direct.EventID, ps_registration.EventID)
     LEFT JOIN Customer c ON c.CustomerID = COALESCE(t.CustomerID, er.CustomerID, ps_direct.CustomerID, ps_registration.CustomerID)
     WHERE t.Type = 'Sự kiện'
     ORDER BY t.Timestamp DESC, t.TransactionID DESC`,
  );

  return {
    ticketTypes: ticketTypes.map((row) => ({
      id: Number(row.id),
      name: row.name,
    })),
    facilities: facilities.map((row) => ({
      id: Number(row.id),
      name: row.name,
    })),
    gatePayments: gatePayments.map((row) => ({
      id: Number(row.id),
      sessionId: Number(row.sessionId),
      customerName: mapCustomerName(row),
      username: mapUsername(row),
      ticketTypeId: row.ticketTypeId ? Number(row.ticketTypeId) : null,
      ticketType: row.ticketType || 'Vé vào cửa',
      quantity: toNumber(row.quantity),
      paymentMethod: row.paymentMethod,
      ticketAmount: toNumber(row.ticketAmount),
      overtimeAmount: toNumber(row.overtimeAmount),
      amount: toNumber(row.amount),
      paidAt: row.paidAt,
    })),
    servicePayments: servicePayments.map((row) => {
      const lineTotal = toNumber(row.lineTotal);
      const serviceGross = toNumber(row.orderGross);
      const servicePaidAmount = toNumber(row.servicePaidAmount);
      const ratio = serviceGross > 0 && servicePaidAmount > 0 ? servicePaidAmount / serviceGross : 1;
      return {
        id: String(row.id),
        orderId: Number(row.orderId),
        transactionId: row.transactionId ? Number(row.transactionId) : null,
        sessionId: row.sessionId ? Number(row.sessionId) : null,
        customerName: mapCustomerName(row),
        username: mapUsername(row),
        ticketTypeId: row.ticketTypeId ? Number(row.ticketTypeId) : null,
        ticketType: row.ticketType || '',
        facilityId: row.facilityId ? Number(row.facilityId) : null,
        facilityName: row.facilityName || 'Chưa gán khu',
        productId: Number(row.productId),
        productName: row.productName,
        quantity: toNumber(row.quantity),
        paymentMethod: row.paymentMethod,
        amount: Math.round(lineTotal * ratio),
        paidAt: row.paidAt,
      };
    }),
    playHistory: playHistory.map((row) => {
      const playedMinutes = toNumber(row.playedMinutes);
      const timeLimit = row.timeLimit === null || row.timeLimit === undefined ? null : toNumber(row.timeLimit);
      const overtimeMinutes = timeLimit && playedMinutes > timeLimit ? playedMinutes - timeLimit : 0;
      return {
        id: Number(row.id),
        sessionId: Number(row.sessionId),
        customerName: mapCustomerName(row),
        username: mapUsername(row),
        ticketTypeId: row.ticketTypeId ? Number(row.ticketTypeId) : null,
        ticketType: row.ticketType || 'Sự kiện',
        checkinTime: row.checkinTime,
        checkoutTime: row.checkoutTime,
        playedMinutes,
        overtimeMinutes,
        overtimeBlocks: overtimeMinutes > 0 ? Math.ceil(overtimeMinutes / 30) : 0,
        paymentMethod: row.paymentMethod,
        ticketAmount: toNumber(row.ticketAmount),
        overtimeAmount: toNumber(row.overtimeAmount),
        serviceAmount: toNumber(row.serviceAmount),
        amount: toNumber(row.totalAmount),
        paidAt: row.paidAt || row.checkoutTime,
      };
    }),
    vipTransactions: vipTransactions.map((row) => ({
      id: Number(row.id),
      customerName: mapCustomerName(row),
      username: mapUsername(row),
      paymentMethod: row.paymentMethod,
      amount: toNumber(row.amount),
      paidAt: row.paidAt,
    })),
    eventTransactions: eventTransactions.map((row) => ({
      id: Number(row.id),
      customerName: mapCustomerName({
        ...row,
        FullName: row.FullName || row.ParentName,
        Phone: row.Phone || row.RegistrationPhone,
        Email: row.Username || row.RegistrationEmail,
      }),
      username: row.Username || row.RegistrationEmail || row.RegistrationPhone || '',
      eventName: row.eventName || 'Sự kiện',
      sessionId: row.sessionId ? Number(row.sessionId) : null,
      checkinTime: row.checkinTime,
      checkoutTime: row.checkoutTime,
      paymentMethod: row.paymentMethod,
      amount: toNumber(row.amount),
      paidAt: row.paidAt,
    })),
  };
}

module.exports = {
  dashboardData,
  revenueReport,
  visitorStats,
};
