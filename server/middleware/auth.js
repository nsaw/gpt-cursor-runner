const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Skip auth for health endpoints
  if (req.path === '/health' || req.path === '/healthz') {
    return next();
  }
  
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'No token provided',
      message: 'Authorization header required' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Token verification failed' 
    });
  }
}; 