import { Request, Response, NextFunction } from 'express';

export const reqLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  let errorPayload: any = null;

  // Intercept res.json to capture error payload
  const originalJson = res.json;
  res.json = function (this: Response, body: any) {
    if (res.statusCode >= 400 && body) {
      errorPayload = body;
    }
    return originalJson.call(this, body);
  } as any;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // ANSI color codes
    const reset  = '\x1b[0m';
    const dim    = '\x1b[2m';
    const bold   = '\x1b[1m';
    const cyan   = '\x1b[36m';
    const yellow = '\x1b[33m';
    const green  = '\x1b[32m';
    const red    = '\x1b[31m';
    const blue   = '\x1b[34m';

    // Color status based on HTTP code
    const statusColor =
      status >= 500 ? red :
      status >= 400 ? yellow :
      status >= 300 ? cyan :
      green;

    // Color duration based on speed
    const durationColor = duration > 1000 ? red : duration > 300 ? yellow : green;

    console.log('');
    console.log(
      `${dim}[${time} IST]${reset} ${bold}Method:${reset} ${bold}${blue}${req.method}${reset} | ${bold}API:${reset} ${req.originalUrl} | ${bold}Status:${reset} ${statusColor}${bold}${status}${reset} | ${bold}Duration:${reset} ${durationColor}${bold}${duration}ms${reset}`
    );

    if (status >= 400 && errorPayload) {
      const errorStr = errorPayload.error || 'ERROR';
      const messageStr = errorPayload.message || 'No message provided';
      console.log(`  ${red}↳ [${errorStr}] ${messageStr}${reset}`);
    }
  });

  next();
};
