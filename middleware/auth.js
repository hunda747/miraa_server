const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // console.log("req.headers", );
    // if (req.header('AuthorizationS')) {
    //   return res.status(403).json({ message: 'Please login to continue' });
    // }
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log("token", token);

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("error", error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = auth; 