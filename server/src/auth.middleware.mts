import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import httpStatus from "http-status";

const JWT_SECRET = process.env.JWT_SECRET || '';

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Splits "Bearer <token>"

  if (!token) {
    res.status(httpStatus.UNAUTHORIZED).json({ error: 'Access token missing. Unauthorized.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      res.status(httpStatus.FORBIDDEN).json({ error: 'Token is invalid or expired.' });
      return;
    }
    // Attach the decrypted user payload to the request object
    req.user = decodedUser;
    next();
  });
};

export default authMiddleware;
