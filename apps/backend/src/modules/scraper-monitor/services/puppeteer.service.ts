import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

puppeteerExtra.use(StealthPlugin());

@Injectable()
export class PuppeteerService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: Browser | null = null;

  async fetchSession(url: string): Promise<{ html: string; cookies: string[] }> {
    const page = await this.getPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.autoScroll(page);
      const html = await page.content();
      const cookies = await page.cookies();
      const cookieStrings = cookies.map((c) => `${c.name}=${c.value}`);
      return { html, cookies: cookieStrings };
    } finally {
      await page.close().catch(() => {});
    }
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.logger.log('Launching headless browser...');
      this.browser = await puppeteerExtra.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      });
      this.logger.log('Browser launched.');
    }
    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    });
    return page;
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
