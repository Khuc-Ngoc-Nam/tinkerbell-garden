const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sqlPath = path.join(rootDir, 'server', 'database.sql');
const outputPath = path.join(rootDir, 'docs', 'database_design_source.svg');

const canvas = {
  width: 2420,
  height: 2140,
  margin: 40,
  tableWidth: 340,
  titleHeight: 56,
  headerHeight: 34,
  rowHeight: 18,
  groupHeight: 1940,
};

const domainStyles = {
  people: { fill: '#eef8f0', stroke: '#7fbf8e', header: '#d5f0db' },
  customer: { fill: '#eef7fb', stroke: '#7aa9d5', header: '#d8ebfb' },
  facility: { fill: '#fff7ea', stroke: '#d9ab57', header: '#fde9bf' },
  event: { fill: '#fff0f1', stroke: '#d98790', header: '#ffd9de' },
  billing: { fill: '#f4f1ff', stroke: '#9588d8', header: '#e4ddff' },
  utility: { fill: '#f5f7f8', stroke: '#9da8b3', header: '#e7edf1' },
};

const groupBands = [
  { x: 40, width: 360, title: 'Personnel & Assignment', color: '#f4fbf5' },
  { x: 420, width: 360, title: 'Customer & VIP', color: '#f2f9fd' },
  { x: 800, width: 360, title: 'Ticket & Facility', color: '#fff9ef' },
  { x: 1180, width: 360, title: 'Paid Services & POS', color: '#fff9ef' },
  { x: 1560, width: 360, title: 'Event & Registration', color: '#fff3f4' },
  { x: 1940, width: 420, title: 'Session, Invoice & Revenue', color: '#f7f4ff' },
];

const layout = {
  Staff: { x: 50, y: 104, domain: 'people' },
  StaffAreaAssignment: { x: 50, y: 364, domain: 'people' },
  FacilityCashier: { x: 50, y: 562, domain: 'people' },

  Customer: { x: 430, y: 104, domain: 'customer' },
  VIPTransaction: { x: 430, y: 434, domain: 'customer' },
  VipPaymentRequest: { x: 430, y: 654, domain: 'customer' },

  TicketType: { x: 810, y: 104, domain: 'facility' },
  TicketReservation: { x: 810, y: 266, domain: 'facility' },
  Facility: { x: 810, y: 604, domain: 'facility' },
  FacilityIssue: { x: 810, y: 876, domain: 'facility' },

  PaidService: { x: 1190, y: 104, domain: 'facility' },
  Product: { x: 1190, y: 356, domain: 'facility' },
  RetailOrder: { x: 1190, y: 640, domain: 'billing' },
  RetailOrderDetail: { x: 1190, y: 860, domain: 'billing' },

  EventCampaign: { x: 1570, y: 104, domain: 'event' },
  EventBooking: { x: 1570, y: 580, domain: 'event' },
  EventRegistration: { x: 1570, y: 916, domain: 'event' },
  EventRegistrationChild: { x: 1570, y: 1290, domain: 'event' },

  PlaySession: { x: 1950, y: 104, domain: 'billing' },
  SessionService: { x: 1950, y: 540, domain: 'billing' },
  TicketInvoice: { x: 1950, y: 740, domain: 'billing' },
  Transactions: { x: 1950, y: 964, domain: 'billing' },
  EmailOutbox: { x: 1950, y: 1324, domain: 'utility' },
};

const relationshipConfig = [
  { from: 'StaffAreaAssignment', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'StaffAreaAssignment', fromField: 'FacilityID', to: 'Facility', toField: 'FacilityID' },
  { from: 'FacilityCashier', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'FacilityCashier', fromField: 'FacilityID', to: 'Facility', toField: 'FacilityID' },
  { from: 'FacilityIssue', fromField: 'FacilityID', to: 'Facility', toField: 'FacilityID' },
  { from: 'PaidService', fromField: 'FacilityID', to: 'Facility', toField: 'FacilityID' },
  { from: 'Product', fromField: 'FacilityID', to: 'Facility', toField: 'FacilityID' },
  { from: 'Product', fromField: 'ServiceID', to: 'PaidService', toField: 'ServiceID' },
  { from: 'RetailOrder', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'RetailOrder', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'RetailOrderDetail', fromField: 'OrderID', to: 'RetailOrder', toField: 'OrderID' },
  { from: 'RetailOrderDetail', fromField: 'ProductID', to: 'Product', toField: 'ProductID' },
  { from: 'EventBooking', fromField: 'EventID', to: 'EventCampaign', toField: 'EventID' },
  { from: 'EventBooking', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'EventRegistration', fromField: 'EventID', to: 'EventCampaign', toField: 'EventID' },
  { from: 'EventRegistration', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'EventRegistrationChild', fromField: 'RegistrationID', to: 'EventRegistration', toField: 'RegistrationID' },
  { from: 'TicketReservation', fromField: 'TypeID', to: 'TicketType', toField: 'TypeID' },
  { from: 'TicketReservation', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'PlaySession', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'PlaySession', fromField: 'TypeID', to: 'TicketType', toField: 'TypeID' },
  { from: 'PlaySession', fromField: 'EventID', to: 'EventCampaign', toField: 'EventID' },
  { from: 'PlaySession', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'PlaySession', fromField: 'EventBookingID', to: 'EventBooking', toField: 'BookingID' },
  { from: 'PlaySession', fromField: 'EventRegistrationID', to: 'EventRegistration', toField: 'RegistrationID' },
  { from: 'SessionService', fromField: 'SessionID', to: 'PlaySession', toField: 'SessionID' },
  { from: 'SessionService', fromField: 'ProductID', to: 'Product', toField: 'ProductID' },
  { from: 'TicketInvoice', fromField: 'SessionID', to: 'PlaySession', toField: 'SessionID' },
  { from: 'TicketInvoice', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'VIPTransaction', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'VIPTransaction', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'Transactions', fromField: 'StaffID', to: 'Staff', toField: 'StaffID' },
  { from: 'Transactions', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  { from: 'Transactions', fromField: 'SessionID', to: 'PlaySession', toField: 'SessionID' },
  { from: 'Transactions', fromField: 'OrderID', to: 'RetailOrder', toField: 'OrderID' },
  { from: 'Transactions', fromField: 'EventRegistrationID', to: 'EventRegistration', toField: 'RegistrationID' },
  { from: 'Transactions', fromField: 'VIPTransactionID', to: 'VIPTransaction', toField: 'VIPTransactionID' },
  { from: 'VipPaymentRequest', fromField: 'CustomerID', to: 'Customer', toField: 'CustomerID' },
  {
    from: 'EventRegistration',
    fromField: 'TransactionID',
    to: 'Transactions',
    toField: 'TransactionID',
    dashed: true,
    stroke: '#d97706',
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readSql() {
  return fs.readFileSync(sqlPath, 'utf8');
}

function extractType(segment) {
  const source = String(segment || '').trim();
  let value = '';
  let depth = 0;
  let inQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'") {
      inQuote = !inQuote;
      value += char;
      continue;
    }
    if (!inQuote) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ' ' && depth === 0) break;
    }
    value += char;
  }

  return value;
}

function normalizeType(type) {
  const upper = String(type || '').toUpperCase();
  if (upper.startsWith('ENUM(')) return 'ENUM';
  if (upper.startsWith('VARCHAR(')) return upper.match(/^VARCHAR\(\d+\)/)?.[0] || 'VARCHAR';
  if (upper.startsWith('DECIMAL(')) return upper.match(/^DECIMAL\(\d+,\d+\)/)?.[0] || 'DECIMAL';
  if (upper.startsWith('INT')) return 'INT';
  if (upper.startsWith('BOOLEAN')) return 'BOOLEAN';
  if (upper.startsWith('DATETIME')) return 'DATETIME';
  if (upper.startsWith('DATE')) return 'DATE';
  if (upper.startsWith('TIME')) return 'TIME';
  if (upper.startsWith('LONGTEXT')) return 'LONGTEXT';
  if (upper.startsWith('TEXT')) return 'TEXT';
  if (upper.startsWith('JSON')) return 'JSON';
  return upper.replace(/\s+/g, ' ');
}

function parseTables(sql) {
  const createRegex = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\) ENGINE=/g;
  const tables = {};
  let match = createRegex.exec(sql);

  while (match) {
    const [, tableName, body] = match;
    const lines = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const columns = [];
    const pk = new Set();
    const fk = new Set();
    const logical = new Set();

    lines.forEach((line) => {
      if (line.startsWith('`')) {
        const nameMatch = line.match(/^`([^`]+)`\s+(.+)$/);
        if (!nameMatch) return;
        const columnName = nameMatch[1];
        const rest = nameMatch[2];
        const type = normalizeType(extractType(rest));
        const nullable = !/\bNOT NULL\b/i.test(rest);
        columns.push({ name: columnName, type, nullable });
      }

      if (/^PRIMARY KEY/i.test(line)) {
        const fields = [...line.matchAll(/`([^`]+)`/g)].map((item) => item[1]);
        fields.forEach((field) => pk.add(field));
      }

      if (/FOREIGN KEY/i.test(line)) {
        const fkMatch = line.match(/FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)/i);
        if (fkMatch) fk.add(fkMatch[1]);
      }
    });

    if (tableName === 'EventRegistration') {
      logical.add('TransactionID');
    }

    tables[tableName] = { name: tableName, columns, pk, fk, logical };
    match = createRegex.exec(sql);
  }

  return tables;
}

function buildTableGeometry(tableName, table) {
  const config = layout[tableName];
  if (!config) {
    throw new Error(`Missing layout for table ${tableName}`);
  }

  const height = canvas.headerHeight + (table.columns.length * canvas.rowHeight) + 16;
  return {
    ...config,
    width: canvas.tableWidth,
    height,
  };
}

function fieldY(tableGeometry, table, fieldName) {
  const rowIndex = table.columns.findIndex((column) => column.name === fieldName);
  const safeIndex = rowIndex >= 0 ? rowIndex : 0;
  return tableGeometry.y + canvas.headerHeight + 12 + (safeIndex * canvas.rowHeight);
}

function tableCenterX(geometry) {
  return geometry.x + (geometry.width / 2);
}

function tableCenterY(geometry) {
  return geometry.y + (geometry.height / 2);
}

function buildPath(fromGeometry, toGeometry, startY, endY) {
  const fromRight = fromGeometry.x + fromGeometry.width;
  const toRight = toGeometry.x + toGeometry.width;

  if (fromRight <= toGeometry.x) {
    const startX = fromRight;
    const endX = toGeometry.x;
    const midX = Math.round((startX + endX) / 2);
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  }

  if (toRight <= fromGeometry.x) {
    const startX = fromGeometry.x;
    const endX = toRight;
    const midX = Math.round((startX + endX) / 2);
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  }

  if (fromGeometry.y + fromGeometry.height <= toGeometry.y) {
    const startX = tableCenterX(fromGeometry);
    const endX = tableCenterX(toGeometry);
    const start = fromGeometry.y + fromGeometry.height;
    const end = toGeometry.y;
    const midY = Math.round((start + end) / 2);
    return `M ${startX} ${start} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${end}`;
  }

  const startX = tableCenterX(fromGeometry);
  const endX = tableCenterX(toGeometry);
  const start = fromGeometry.y;
  const end = toGeometry.y + toGeometry.height;
  const midY = Math.round((start + end) / 2);
  return `M ${startX} ${start} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${end}`;
}

function buildSvg() {
  const sql = readSql();
  const parsedTables = parseTables(sql);
  const tableNames = Object.keys(layout);

  tableNames.forEach((tableName) => {
    if (!parsedTables[tableName]) {
      throw new Error(`Table ${tableName} not found in database.sql`);
    }
  });

  const geometries = {};
  tableNames.forEach((tableName) => {
    geometries[tableName] = buildTableGeometry(tableName, parsedTables[tableName]);
  });

  const relationPaths = relationshipConfig
    .filter((relation) => parsedTables[relation.from] && parsedTables[relation.to])
    .map((relation) => {
      const fromTable = parsedTables[relation.from];
      const toTable = parsedTables[relation.to];
      const fromGeometry = geometries[relation.from];
      const toGeometry = geometries[relation.to];
      const startY = fieldY(fromGeometry, fromTable, relation.fromField);
      const endY = fieldY(toGeometry, toTable, relation.toField);
      const path = buildPath(fromGeometry, toGeometry, startY, endY);
      return { ...relation, path };
    });

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`);
  svg.push(`<defs>`);
  svg.push(`<filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">`);
  svg.push(`<feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.09"/>`);
  svg.push(`</filter>`);
  svg.push(`</defs>`);
  svg.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="#f8fbf8"/>`);
  svg.push(`<text x="${canvas.margin}" y="42" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#16324f">TinkerBell Garden - Database Design</text>`);
  svg.push(`<text x="${canvas.margin}" y="66" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#526273">Generated from server/database.sql with primary keys, foreign keys, logical links and domain grouping.</text>`);

  groupBands.forEach((band) => {
    svg.push(`<rect x="${band.x}" y="86" width="${band.width}" height="${canvas.groupHeight}" rx="20" ry="20" fill="${band.color}" stroke="#e3e9eb"/>`);
    svg.push(`<text x="${band.x + 18}" y="112" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#35556d">${escapeXml(band.title)}</text>`);
  });

  svg.push(`<g fill="none" stroke-width="1.6">`);
  relationPaths.forEach((relation) => {
    const stroke = relation.stroke || '#8a97a6';
    const dash = relation.dashed ? ` stroke-dasharray="6 5"` : '';
    svg.push(`<path d="${relation.path}" stroke="${stroke}"${dash}/>`);
  });
  svg.push(`</g>`);

  tableNames.forEach((tableName) => {
    const table = parsedTables[tableName];
    const geometry = geometries[tableName];
    const style = domainStyles[geometry.domain];

    svg.push(`<g filter="url(#shadow)">`);
    svg.push(`<rect x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="14" ry="14" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.2"/>`);
    svg.push(`<rect x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${canvas.headerHeight}" rx="14" ry="14" fill="${style.header}" stroke="${style.stroke}" stroke-width="1.2"/>`);
    svg.push(`<path d="M ${geometry.x} ${geometry.y + canvas.headerHeight} H ${geometry.x + geometry.width}" stroke="${style.stroke}" stroke-width="1.2"/>`);
    svg.push(`</g>`);
    svg.push(`<text x="${geometry.x + 12}" y="${geometry.y + 22}" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#193247">${escapeXml(tableName)}</text>`);

    table.columns.forEach((column, index) => {
      const y = geometry.y + canvas.headerHeight + 14 + (index * canvas.rowHeight);
      let prefix = '';
      if (table.pk.has(column.name) && table.fk.has(column.name)) prefix = 'PK/FK';
      else if (table.pk.has(column.name)) prefix = 'PK';
      else if (table.fk.has(column.name)) prefix = 'FK';
      else if (table.logical.has(column.name)) prefix = 'LINK';

      const nullable = column.nullable ? '?' : '';
      const leftText = prefix ? `${prefix} ${column.name}` : column.name;
      const rightText = `${column.type}${nullable}`;
      svg.push(`<text x="${geometry.x + 12}" y="${y}" font-family="Consolas, 'Courier New', monospace" font-size="11" fill="#243746">${escapeXml(leftText)}</text>`);
      svg.push(`<text x="${geometry.x + geometry.width - 12}" y="${y}" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="11" fill="#5b6e7c">${escapeXml(rightText)}</text>`);
    });
  });

  svg.push(`<g>`);
  svg.push(`<rect x="40" y="2044" width="1120" height="56" rx="12" fill="#ffffff" stroke="#d9e2e8"/>`);
  svg.push(`<text x="58" y="2078" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#344054">Legend: PK = primary key, FK = foreign key, LINK = logical reference without FK constraint. Dotted orange line = logical relation only.</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join('\n');
}

function main() {
  const svg = buildSvg();
  fs.writeFileSync(outputPath, svg, 'utf8');
  console.log(`Created ${outputPath}`);
}

main();
