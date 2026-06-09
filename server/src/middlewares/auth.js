const { verifyToken } = require('../utils/security');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  req.user = payload;
  return next();
}

function requireStaff(roles = []) {
  return (req, res, next) => {
    authenticate(req, res, () => {
      if (req.user.type !== 'staff') {
        return res.status(403).json({ success: false, message: 'Staff access required' });
      }
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permission' });
      }
      return next();
    });
  };
}

function requireCustomer(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.type !== 'customer') {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    return next();
  });
}

function optionalCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  const payload = verifyToken(token);

  if (payload?.type === 'customer') {
    req.user = payload;
  }
  return next();
}

module.exports = {
  authenticate,
  optionalCustomer,
  requireCustomer,
  requireStaff,
};
