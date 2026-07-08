import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlaresolverrService {
  private readonly logger = new Logger(FlaresolverrService.name);
  private readonly baseUrl = 'http://localhost:8191/v1';

  async fetchSession(url: string): Promise<{ session: string; html: string; cookies: string[]; userAgent: string }> {
    const sid = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.requestGet(url, sid);
    return { session: sid, ...res };
  }

  async destroySession(session: string): Promise<void> {
    if (!session) return;
    try {
      await axios.post(this.baseUrl, { cmd: 'sessions.destroy', session }, { timeout: 5000 });
    } catch {
      // ignore destroy errors
    }
  }

  async postWithSession(
    url: string,
    formData: Record<string, string>,
    session: string,
  ): Promise<{ html: string; cookies: string[] }> {
    const flaresolverrRes = await this.requestPost(url, formData, session);
    return { html: flaresolverrRes.html, cookies: flaresolverrRes.cookies };
  }

  private async requestGet(url: string, sessionId: string): Promise<{ html: string; cookies: string[]; userAgent: string }> {

    const response = await axios.post(
      this.baseUrl,
      {
        cmd: 'request.get',
        url,
        session: sessionId,
        maxTimeout: 60000,
        waitInSeconds: 8,
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
    sessionId: string,
  ): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    const params = new URLSearchParams(formData).toString();

    const response = await axios.post(
      this.baseUrl,
      {
        cmd: 'request.post',
        url,
        postData: params,
        session: sessionId,
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
