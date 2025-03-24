"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('ERROR:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong';
    const errors = err.errors || [];
    // Detailed error in development
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            message,
            errors,
            stack: err.stack,
        });
    }
    // Sanitized error in production
    return res.status(statusCode).json({
        success: false,
        message,
        errors: errors.length ? errors : undefined,
    });
};
exports.errorHandler = errorHandler;
