import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlaresolverrService {
  private readonly logger = new Logger(FlaresolverrService.name);
  private readonly baseUrl = 'http://localhost:8191/v1';

  async fetchSession(url: string): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    return this.requestGet(url);
  }

  async getSession(url: string): Promise<{ cookies: string[]; userAgent: string }> {
    const res = await this.requestGet(url);
    return { cookies: res.cookies, userAgent: res.userAgent };
  }

  async postWithSession(
    url: string,
    formData: Record<string, string>,
    cookies: string[],
    userAgent: string,
  ): Promise<{ html: string; cookies: string[] }> {
    const cookieStr = cookies.map((c) => c.split(';')[0]).join('; ');

    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': new URL(url).origin,
      'Referer': url,
      'Cookie': cookieStr,
    };

    const params = new URLSearchParams(formData).toString();

    try {
      const res = await axios.post(url, params, {
        headers,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      if (res.status === 200) {
        return { html: typeof res.data === 'string' ? res.data : JSON.stringify(res.data), cookies };
      }

      if (res.status === 403) {
        this.logger.warn(`Direct POST got ${res.status}, retrying through Flaresolverr...`);
      } else {
        this.logger.warn(`Direct POST got ${res.status}, retrying through Flaresolverr...`);
      }
    } catch (err) {
      this.logger.warn(`Direct POST failed (${(err as Error).message}), retrying through Flaresolverr...`);
    }

    const flaresolverrRes = await this.requestPost(url, formData);
    return { html: flaresolverrRes.html, cookies: flaresolverrRes.cookies };
  }

  private async requestGet(url: string): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    const response = await axios.post(
      this.baseUrl,
      {
        cmd: 'request.get',
        url,
        maxTimeout: 60000,
      },
      { timeout: 70000 },
    );

    const data = response.data;
    if (data.status !== 'ok') {
      throw new Error(`Flaresolverr error: ${data.message || 'Unknown error'}`);
    }

    const solution = data.solution;
    const html: string = solution.response || '';
    const cookies: string[] = (solution.cookies || []).map(
      (c: { name: string; value: string }) => `${c.name}=${c.value}`,
    );
    const userAgent: string = solution.userAgent || '';

    return { html, cookies, userAgent };
  }

  private async requestPost(
    url: string,
    formData: Record<string, string>,
  ): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    const params = new URLSearchParams(formData).toString();

    const response = await axios.post(
      this.baseUrl,
      {
        cmd: 'request.post',
        url,
        postData: params,
        maxTimeout: 60000,
      },
      { timeout: 70000 },
    );

    const data = response.data;
    if (data.status !== 'ok') {
      throw new Error(`Flaresolverr POST error: ${data.message || 'Unknown error'}`);
    }

    const solution = data.solution;
    const html: string = solution.response || '';
    const cookies: string[] = (solution.cookies || []).map(
      (c: { name: string; value: string }) => `${c.name}=${c.value}`,
    );
    const userAgent: string = solution.userAgent || '';

    return { html, cookies, userAgent };
  }
}
