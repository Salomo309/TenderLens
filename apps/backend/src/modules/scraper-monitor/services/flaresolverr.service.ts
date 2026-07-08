import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlaresolverrService {
  private readonly logger = new Logger(FlaresolverrService.name);
  private readonly baseUrl = 'http://localhost:8191/v1';
  private sessionId: string | null = null;
  private sessionTtlMs = 120_000;
  private sessionExpiresAt = 0;

  private isSessionExpired(): boolean {
    return Date.now() > this.sessionExpiresAt;
  }

  private renewSessionId() {
    this.sessionId = `sess_${Date.now()}`;
    this.sessionExpiresAt = Date.now() + this.sessionTtlMs;
  }

  async initSession(): Promise<void> {
    await this.destroySession();
    this.renewSessionId();
    this.logger.log(`FlareSolverr session initialized: ${this.sessionId}`);
  }

  private async ensureSession(): Promise<string> {
    if (!this.sessionId || this.isSessionExpired()) {
      this.renewSessionId();
      this.logger.log(`FlareSolverr session renewed: ${this.sessionId}`);
    }
    return this.sessionId!;
  }

  async fetchSession(url: string): Promise<{ html: string; cookies: string[]; userAgent: string }> {
    const sid = await this.ensureSession();
    return this.requestGet(url, sid);
  }

  async destroySession(): Promise<void> {
    if (!this.sessionId) return;
    try {
      await axios.post(this.baseUrl, { cmd: 'sessions.destroy', session: this.sessionId }, { timeout: 5000 });
    } catch {
      // ignore destroy errors
    }
    this.sessionId = null;
    this.sessionExpiresAt = 0;
  }

  async getSession(url: string): Promise<{ cookies: string[]; userAgent: string }> {
    const sid = await this.ensureSession();
    const res = await this.requestGet(url, sid);
    return { cookies: res.cookies, userAgent: res.userAgent };
  }

  async postWithSession(
    url: string,
    formData: Record<string, string>,
  ): Promise<{ html: string; cookies: string[] }> {
    const sid = await this.ensureSession();
    const flaresolverrRes = await this.requestPost(url, formData, sid);
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