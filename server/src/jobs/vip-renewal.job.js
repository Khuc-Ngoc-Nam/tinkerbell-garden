const db = require('../config/db');

async function expireVipMemberships() {
  const [result] = await db.query(
    `UPDATE Customer
     SET IsVIP = FALSE, UpdatedAt = NOW()
     WHERE IsVIP = TRUE AND VIPExpiryDate IS NOT NULL AND VIPExpiryDate < NOW()`,
  );
  return result.affectedRows;
}

function scheduleVipRenewalJob() {
  expireVipMemberships().catch((error) => {
    console.error('VIP expiration job failed:', error.message);
  });

  const oneDay = 24 * 60 * 60 * 1000;
  setInterval(() => {
    expireVipMemberships().catch((error) => {
      console.error('VIP expiration job failed:', error.message);
    });
  }, oneDay).unref();
}

module.exports = {
  expireVipMemberships,
  scheduleVipRenewalJob,
};
