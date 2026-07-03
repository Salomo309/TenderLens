import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const puppeteerExtra = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const StealthPlugin = stealthPlugin.default || stealthPlugin;

try {
  puppeteerExtra.use(StealthPlugin());
} catch (e) {
  // stealth plugin failed to initialize, continuing without it
}

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

  async fetchDataViaAjax(
    pageUrl: string,
    apiUrl: string,
    formData: Record<string, string>,
    cookies: { name: string; value: string }[],
    userAgent: string,
  ): Promise<string> {
    const page = await this.getPageForAjax(userAgent, cookies);
    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      const result = await page.evaluate(async (params) => {
        const formBody = new URLSearchParams(params.formData).toString();
        const response = await fetch(params.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': params.pageUrl,
          },
          body: formBody,
        });
        return response.text();
      }, { apiUrl, pageUrl, formData });

      return result;
    } finally {
      await page.close().catch(() => {});
    }
  }

  private getLaunchOptions() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ];
    const options: any = { headless: true, args };
    const systemChromium = '/usr/bin/chromium';
    const fs = require('fs');
    if (fs.existsSync(systemChromium)) {
      options.executablePath = systemChromium;
    }
    return options;
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.logger.log('Launching headless browser...');
      this.browser = await puppeteerExtra.launch(this.getLaunchOptions());
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

  private async getPageForAjax(
    userAgent: string,
    cookies: { name: string; value: string }[],
  ): Promise<Page> {
    if (!this.browser) {
      this.logger.log('Launching headless browser...');
      this.browser = await puppeteerExtra.launch(this.getLaunchOptions());
      this.logger.log('Browser launched.');
    }
    const page = await this.browser.newPage();

    if (userAgent) {
      await page.setUserAgent(userAgent);
    }

    if (cookies.length > 0) {
      const urlObj = new URL('https://spse.inaproc.id');
      const cookieParams = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: urlObj.hostname,
        path: '/',
        httpOnly: false,
        secure: true,
      }));
      await page.setCookie(...cookieParams);
    }

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