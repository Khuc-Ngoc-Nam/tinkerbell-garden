require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { assertDatabaseConnection } = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const customerRoutes = require('./modules/customer/customer.routes');
const eventRoutes = require('./modules/event/event.routes');
const facilityRoutes = require('./modules/facility/facility.routes');
const portalRoutes = require('./modules/portal/portal.routes');
const reportRoutes = require('./modules/report/report.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const ticketRoutes = require('./modules/ticket/ticket.routes');
const { scheduleVipRenewalJob } = require('./jobs/vip-renewal.job');

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'tinkerbell-garden-api' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    success: false,
    message: error.message || 'Internal server error',
    details: error.details,
  });
});

async function start() {
  const port = Number(process.env.PORT || 5000);
  await assertDatabaseConnection();
  scheduleVipRenewalJob();
  app.listen(port, () => {
    console.log(`TinkerBell Garden API is running on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start API server:', error.message);
    process.exit(1);
  });
}

module.exports = app;
