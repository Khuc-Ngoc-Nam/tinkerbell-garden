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
    `SELECT t.TransactionID AS id, t.SessionID AS sessionId, t.Amount AS amount,
            t.PaymentMethod AS paymentMethod, t.Timestamp AS paidAt,
            ps.ChildrenCount AS quantity, ps.GuestName,
            c.FullName, c.Email AS Username, c.Phone,
            tt.TypeID AS ticketTypeId, tt.TypeName AS ticketType
     FROM Transactions t
     JOIN PlaySession ps ON ps.SessionID = t.SessionID
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     WHERE t.Type = 'Vé vào cửa'
     ORDER BY t.Timestamp DESC, t.TransactionID DESC`,
  );

  const [servicePayments] = await db.query(
    `SELECT ss.ServiceLineID AS id, ss.SessionID AS sessionId, ss.ProductID AS productId,
            ss.Quantity AS quantity, ss.UnitPrice AS unitPrice, ss.LineTotal AS lineTotal,
            COALESCE(service_tx.Amount, 0) AS servicePaidAmount,
            service_tx.PaymentMethod AS paymentMethod,
            service_tx.PaidAt AS paidAt,
            service_total.ServiceGross AS sessionServiceGross,
            ps.GuestName, ps.ChildrenCount,
            c.FullName, c.Email AS Username, c.Phone,
            tt.TypeID AS ticketTypeId, tt.TypeName AS ticketType,
            f.FacilityID AS facilityId, f.FacilityName AS facilityName,
            p.ProductName AS productName
     FROM SessionService ss
     JOIN PlaySession ps ON ps.SessionID = ss.SessionID
     JOIN Product p ON p.ProductID = ss.ProductID
     LEFT JOIN Facility f ON f.FacilityID = p.FacilityID
     LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
     LEFT JOIN TicketType tt ON tt.TypeID = ps.TypeID
     LEFT JOIN (
       SELECT SessionID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod, MAX(Timestamp) AS PaidAt
       FROM Transactions
       WHERE Type = 'Dịch vụ lẻ'
       GROUP BY SessionID
     ) service_tx ON service_tx.SessionID = ss.SessionID
     LEFT JOIN (
       SELECT SessionID, SUM(LineTotal) AS ServiceGross
       FROM SessionService
       GROUP BY SessionID
     ) service_total ON service_total.SessionID = ss.SessionID
     WHERE ps.Status = 'Completed'
       AND service_tx.Amount IS NOT NULL
     ORDER BY service_tx.PaidAt DESC, ss.ServiceLineID DESC`,
  );

  const [playHistory] = await db.query(
    `SELECT ps.SessionID AS id, ps.SessionID AS sessionId, ps.GuestName,
            ps.CheckinTime AS checkinTime, ps.CheckoutTime AS checkoutTime,
            TIMESTAMPDIFF(MINUTE, ps.CheckinTime, ps.CheckoutTime) AS playedMinutes,
            CASE
              WHEN ps.Purpose = 'Event' AND ec.EventID IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ec.StartDate, ec.EndDate)
              ELSE tt.TimeLimit
            END AS timeLimit,
            COALESCE(penalty_tx.Amount, 0) AS overtimeAmount,
            penalty_tx.PaymentMethod AS paymentMethod,
            penalty_tx.PaidAt AS paidAt,
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
       SELECT SessionID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod, MAX(Timestamp) AS PaidAt
       FROM Transactions
       WHERE Type = 'Phạt lố giờ'
       GROUP BY SessionID
     ) penalty_tx ON penalty_tx.SessionID = ps.SessionID
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
            er.ParentName, er.Phone AS RegistrationPhone, er.Email AS RegistrationEmail,
            c.FullName, c.Email AS Username, c.Phone,
            ps.GuestName
     FROM Transactions t
     LEFT JOIN EventRegistration er ON er.RegistrationID = t.EventRegistrationID
     LEFT JOIN EventCampaign ec ON ec.EventID = er.EventID
     LEFT JOIN PlaySession ps ON ps.SessionID = t.SessionID
     LEFT JOIN EventCampaign ec_session ON ec_session.EventID = ps.EventID
     LEFT JOIN Customer c ON c.CustomerID = COALESCE(t.CustomerID, er.CustomerID, ps.CustomerID)
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
      amount: toNumber(row.amount),
      paidAt: row.paidAt,
    })),
    servicePayments: servicePayments.map((row) => {
      const lineTotal = toNumber(row.lineTotal);
      const serviceGross = toNumber(row.sessionServiceGross);
      const servicePaidAmount = toNumber(row.servicePaidAmount);
      const ratio = serviceGross > 0 && servicePaidAmount > 0 ? servicePaidAmount / serviceGross : 1;
      return {
        id: Number(row.id),
        sessionId: Number(row.sessionId),
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
        amount: toNumber(row.overtimeAmount),
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
