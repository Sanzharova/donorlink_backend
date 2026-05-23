import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    res
      .status(401)
      .send({ message: 'No token provided, authorization denied' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS);
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).send({ message: 'User not found, authorization denied' });
      return;
    }
    if (user.status === 'banned') {
      res.status(403).send({ message: 'Your account is banned' });
      return;
    }
    req.user = user;
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      res.status(401).send({ message: 'Token expired' });
      return;
    }

    res.status(401).send({ message: 'Token is not valid' });
  }
};

export default auth;
