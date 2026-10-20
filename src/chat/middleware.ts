import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  logger
    .child({
      sessionId: req.headers["x-session-id"] as string,
      method: req.method,
      request: req.originalUrl,
    })
    .info("Request started");

  next();
}
