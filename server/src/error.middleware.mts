import type { NextFunction, Request, Response } from "express";
import type ApiError from "./ApiError.mjs";
import httpStatus from "http-status";
    
export const errorMiddleware = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({ message });
};

