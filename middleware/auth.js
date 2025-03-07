const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // console.log("req.headers", );
    // if (req.header('AuthorizationS')) {
    //   return res.status(403).json({ message: 'Please login to continue' });
    // }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("error", error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

const authAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;

    if (decoded.role === 'USER') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = { auth, authAdmin }; 