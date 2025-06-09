import mongoose from 'mongoose'; 
import jwt from 'jsonwebtoken';  

export class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'GENERAL_API_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode; 
    this.details = details;     
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor); 
  }
}

export const globalErrorHandler = (err, req, res, next) => {
  // Log the error with more details
  console.error(`[ERROR_HANDLER] Timestamp: ${new Date().toISOString()}`);
  console.error(`[ERROR_HANDLER] Route: ${req.method} ${req.originalUrl}`);
  if (req.auth) { 
    console.error(`[ERROR_HANDLER] Authenticated User (from req.auth): ${req.auth.walletAddress}`);
  }
  console.error(`[ERROR_HANDLER] Received error NAME: ${err.name}`);
  console.error(`[ERROR_HANDLER] Received error MESSAGE: ${err.message}`);
  console.error(`[ERROR_HANDLER] Is instance of ApiError: ${err instanceof ApiError}`);
  if (res.headersSent) {
    console.error("[ERROR_HANDLER] Headers already sent, delegating to next error handler.");
    return next(err);
  }

  let statusCode = 500;
  let responseBody = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred on the server.',
    },
  };

  if (err instanceof ApiError) {
    console.log("[ERROR_HANDLER] Processing as ApiError.");
    statusCode = err.statusCode;
    responseBody.error.code = err.errorCode;
    responseBody.error.message = err.message;
    if (err.details) {
      responseBody.error.details = err.details;
    }
  } else if (err instanceof mongoose.Error.ValidationError) {
    console.log("[ERROR_HANDLER] Processing as Mongoose ValidationError.");
    statusCode = 400; 
    responseBody.error.code = 'VALIDATION_ERROR';
    responseBody.error.message = 'Data validation failed.';
    responseBody.error.details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      kind: e.kind,
    }));
  } else if (err instanceof jwt.JsonWebTokenError) {
    console.log("[ERROR_HANDLER] Processing as JsonWebTokenError.");
    statusCode = 401; 
    responseBody.error.code = 'INVALID_TOKEN';
    responseBody.error.message = 'Token is invalid or malformed.';
  } else if (err instanceof jwt.TokenExpiredError) {
    console.log("[ERROR_HANDLER] Processing as TokenExpiredError.");
    statusCode = 401; 
    responseBody.error.code = 'TOKEN_EXPIRED';
    responseBody.error.message = 'Token has expired.';
  }else if (err instanceof mongoose.Error.CastError) { 
  console.log("[GLOBAL ERROR_HANDLER] Processing as Mongoose CastError.");
  statusCode = 400; 
  responseBody.error.code = 'INVALID_ID_FORMAT'; 
  responseBody.error.message = 'Invalid ID format';
  if (process.env.NODE_ENV === 'development' && err.reason) {
      responseBody.error.details = { reason: err.reason.message || err.reason.toString() };
  }
} else if (err.name === 'MulterError') { 
    console.log("[ERROR_HANDLER] Processing as MulterError.");
    statusCode = 400; 
    responseBody.error.code = `FILE_UPLOAD_ERROR_${err.code}`; 
    responseBody.error.message = err.message;
  } else {
    console.log(`[ERROR_HANDLER] Processing as a generic error. Original error name: ${err.name}`);
  }
  
  if (process.env.NODE_ENV === 'development' && !(err instanceof ApiError)) {
    // For dev, include stack for easier debugging
    responseBody.error.dev_stack = err.stack;
  }
  
  console.log(`[ERROR_HANDLER] Attempting to send status ${statusCode} with body:`, JSON.stringify(responseBody));
  res.status(statusCode).json(responseBody);
};
