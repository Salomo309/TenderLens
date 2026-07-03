import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlaresolverrService {
  private readonly logger = new Logger(FlaresolverrService.name);
  private readonly baseUrl = 'http://localhost:8191/v1';

  async fetchSession(url: string): Promise<{ html: string; cookies: string[] }> {
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

    return { html, cookies };
  }
}
