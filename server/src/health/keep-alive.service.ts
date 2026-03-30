import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly appUrl: string;

  constructor() {
    // Explicitly use your render URL so it routes through Render's proxy. 
    // Internal localhost requests don't reset the activity timer!
    this.appUrl =
      process.env.RENDER_EXTERNAL_URL ||
      'https://legal-document-editor-cdi9.onrender.com';
  }

  /**
   * Pings the health endpoint every 5 minutes (Render sleeps after 15m)
   */
  @Cron('*/5 * * * *')
  async ping() {
    try {
      const url = `${this.appUrl}/health`;
      this.logger.log(`Attempting keep-alive ping to: ${url}`);
      
      const res = await fetch(url);
      
      if (res.ok) {
        this.logger.log(`Keep-alive ping success → ${res.status} ${res.statusText}`);
      } else {
        this.logger.warn(`Keep-alive ping failed with status → ${res.status}`);
      }
    } catch (error) {
      this.logger.error(`Keep-alive ping error: ${error.message}`);
    }
  }
}
