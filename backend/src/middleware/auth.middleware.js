import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; 
import { ApiError } from './errorHandler.middleware.js'; 

export const authenticateToken = async (req, res, next) => {
  console.log("[AUTH_MIDDLEWARE] authenticateToken called.");
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : null; 

  console.log("[AUTH_MIDDLEWARE] Auth Header:", authHeader);
  console.log("[AUTH_MIDDLEWARE] Extracted Token:", token);

  if (!token || token === 'undefined' || token === 'null') { 
    console.log("[AUTH_MIDDLEWARE] No token provided or token is invalid/string 'undefined'/'null'. Passing ApiError to next.");
    return next(new ApiError(401, "No token provided", "NO_TOKEN_PROVIDED")); 
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_fallback_INSECURE");
    console.log("[AUTH_MIDDLEWARE] Token verified. Decoded payload:", decoded);
    
    req.auth = { 
      walletAddress: decoded.walletAddress, 
      isMusician: decoded.isMusician, 
      userId: decoded.userId 
    };
    next();
  } catch (error) {
    console.error("[AUTH_MIDDLEWARE] Token verification error:", error.name, error.message);
    if (error instanceof jwt.TokenExpiredError) {
        return next(new ApiError(401, "Token has expired", "TOKEN_EXPIRED"));
    }
    return next(new ApiError(401, "Invalid or malformed token", "INVALID_TOKEN", { originalError: error.message }));
  }
};

export const protectRouteUser = async (req, res, next) => {
  if (!req.auth || !req.auth.walletAddress) {
    return next(new ApiError(401, "Authentication required. No user identity found.", "AUTH_REQUIRED_USER_ROUTE"));
  }
  next();
};

export const protectRouteMusician = async (req, res, next) => {
  if (!req.auth || !req.auth.walletAddress) {
    return next(new ApiError(401, "Authentication required.", "AUTH_REQUIRED_MUSICIAN_ROUTE"));
  }
  
  // Check the isMusician flag from the authenticated token's payload
  if (req.auth.isMusician === true) {
    next();
  } else {
    console.log(`[PROTECT_MUSICIAN_ROUTE] Access denied for user ${req.auth.walletAddress}. isMusician flag in token: ${req.auth.isMusician}`);
    return next(new ApiError(403, "Forbidden: User is not a musician.", "FORBIDDEN_NOT_MUSICIAN"));
  }
};
