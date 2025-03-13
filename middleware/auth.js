const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    req.user = {
      id: decoded.userId,
      ...decoded
    };
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { authenticateToken }; 