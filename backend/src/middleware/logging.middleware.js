export const loggingMiddleware = (req, res, next) => {
    const startTime = process.hrtime();
    const { method, url, ip } = req;
    const userAgent = req.get("user-agent") || "unknown";
  
    console.log(
      `[REQUEST] ${new Date().toISOString()} - ${method} ${url} - IP: ${ip} - Agent: ${userAgent}`
    );
  
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[REQUEST_BODY] Body present. Keys: ${Object.keys(req.body).join(', ')}`);
    }
  
  
    res.on("finish", () => {
      const diff = process.hrtime(startTime);
      const durationInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
      const { statusCode } = res;
  
      console.log(
        `[RESPONSE] ${new Date().toISOString()} - ${method} ${url} - Status: ${statusCode} - Duration: ${durationInMs}ms`
      );
    });
  
    res.on("close", () => {
      if (!res.writableEnded) { 
        const diff = process.hrtime(startTime);
        const durationInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        console.log(
          `[RESPONSE_CLOSE] ${new Date().toISOString()} - ${method} ${url} - Status: (connection closed before finish) - Duration: ${durationInMs}ms`
        );
      }
    });
  
    next(); 
  }
    