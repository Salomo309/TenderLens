import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlaresolverrService {
  private readonly logger = new Logger(FlaresolverrService.name);
  private readonly baseUrl = 'http://localhost:8191/v1';
  private sessionId: string | null = null;

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
  ): Promise<{ html: string; cookies: string[] }> {
    const sessionId = this.sessionId || `session_${Date.now()}`;
    if (!this.sessionId) {
      this.sessionId = sessionId;
    }

    const flaresolverrRes = await this.requestPost(url, formData, sessionId);
    return { html: flaresolverrRes.html, cookies: flaresolverrRes.cookies };
  }

  private async requestGet(url: string): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    const sessionId = this.sessionId || `session_${Date.now()}`;
    if (!this.sessionId) {
      this.sessionId = sessionId;
    }

    const response = await axios.post(
      this.baseUrl,
      {
        cmd: 'request.get',
        url,
        session: sessionId,
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