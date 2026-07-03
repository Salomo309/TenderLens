import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, Page, HTTPResponse } from 'puppeteer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const puppeteerExtra = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

try {
  puppeteerExtra.use(StealthPlugin());
} catch (e) {
  // stealth plugin failed to initialize, continuing without it
}

export interface CookieParam {
  name: string;
  value: string;
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

  async scrapeTendersViaBrowser(
    pageUrl: string,
    apiPath: string,
    cookies: CookieParam[],
    pageSize = 200,
    maxPages = 5,
  ): Promise<string[]> {
    const apiUrlPattern = new RegExp(apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const page = await this.getPageForBrowserScrape(cookies);

    const jsonResponses: string[] = [];
    page.on('response', async (response: HTTPResponse) => {
      const req = response.request();
      if (req.method() === 'POST' && apiUrlPattern.test(req.url())) {
        try {
          const text = await response.text();
          if (text && text.startsWith('{')) {
            jsonResponses.push(text);
          }
        } catch (e) {
          // ignore response parsing errors
        }
      }
    });

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 60000 });

      await this.waitForDataTable(page);

      for (let i = 1; i < maxPages; i++) {
        const hasNext = await page.evaluate(() => {
          const btn = document.querySelector('#tbllelang_next a') as HTMLElement;
          if (!btn || btn.classList.contains('disabled')) return false;
          btn.click();
          return true;
        });
        if (!hasNext) break;
        await new Promise((r) => setTimeout(r, 2000));
        await this.waitForDataTable(page);
      }

      return jsonResponses;
    } finally {
      await page.close().catch(() => {});
    }
  }

  private async waitForDataTable(page: Page): Promise<void> {
    await page.waitForFunction(
      () => {
        const info = document.querySelector('#tbllelang_info');
        if (!info) return false;
        const text = info.textContent || '';
        return !text.includes('Memuat') && !text.includes('Sedang proses');
      },
      { timeout: 30000 },
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
  }

  private async getPageForBrowserScrape(cookies?: CookieParam[]): Promise<Page> {
    if (!this.browser) {
      this.logger.log('Launching headless browser...');
      this.browser = await puppeteerExtra.launch(this.getLaunchOptions());
      this.logger.log('Browser launched.');
    }
    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    if (cookies && cookies.length > 0) {
      const urlObj = new URL('https://spse.inaproc.id');
      const puppeteerCookies = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: urlObj.hostname,
        path: '/',
        httpOnly: false,
        secure: true,
      }));
      await page.setCookie(...puppeteerCookies);
    }

    return page;
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
