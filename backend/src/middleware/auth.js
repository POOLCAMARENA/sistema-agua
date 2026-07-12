const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No hay token, autorización denegada' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token no válido' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
  });
};

const cajeroAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'cajero') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de cajero o administrador' });
    }
    next();
  });
};

module.exports = { auth, adminAuth, cajeroAuth };
