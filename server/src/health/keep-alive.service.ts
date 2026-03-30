import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly appUrl: string;

  constructor() {
    this.appUrl =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.APP_URL ||
      `http://localhost:${process.env.PORT || 3001}`;
  }

  /**
   * Pings the health endpoint every 10 minutes to prevent
   * Render free-tier from hibernating the service.
   */
  @Cron('*/10 * * * *')
  async ping() {
    try {
      const url = `${this.appUrl}/health`;
      const res = await fetch(url);
      this.logger.log(`Keep-alive ping → ${res.status} ${res.statusText}`);
    } catch (error) {
      this.logger.warn(`Keep-alive ping failed: ${error.message}`);
    }
  }
}
