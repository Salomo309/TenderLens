import { Injectable, Logger } from '@nestjs/common';

export interface StructuredTenderSummary {
  eligibility: string[];
  requiredCertifications: string[];
  deadlines: {
    clarificationPeriodEnd?: string;
    proposalSubmissionDeadline: string;
    announcementWinner?: string;
  };
  keyTechnicalSpecs: string[];
  estimatedDurationMonths?: number;
  risksAndGotchas?: string[];
}

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);
  private readonly geminiApiKey = process.env.GEMINI_API_KEY;

  /**
   * Routes the tender document text or HTML page content to the Gemini API
   * to parse and structure into key business parameters.
   */
  async generateTenderSummary(rawContent: string): Promise<StructuredTenderSummary> {
    if (!this.geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY is not defined. Falling back to structured mockup parser.');
      return this.getMockupSummary(rawContent);
    }

    try {
      // Endpoint definition for Gemini API (e.g. Gemini 1.5/2.0/3.5 endpoints)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
      
      const prompt = `
        You are a procurement expert reviewing Indonesian Government LPSE tenders.
        Extract relevant criteria from this Tender content into a strict, single JSON format matching this TypeScript interface:
        {
          "eligibility": string[],
          "requiredCertifications": string[],
          "deadlines": {
            "clarificationPeriodEnd": string,
            "proposalSubmissionDeadline": string,
            "announcementWinner": string
          },
          "keyTechnicalSpecs": string[],
          "estimatedDurationMonths": number,
          "risksAndGotchas": string[]
        }
        Return ONLY valid JSON. Keep description localized to Indonesian/English.
        Tender details content:
        ---
        ${rawContent.substring(0, 15000)}
        ---
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('Empty response content received from Gemini model API');
      }

      return JSON.parse(rawText.trim()) as StructuredTenderSummary;
    } catch (error) {
      this.logger.error('Failed to parse Gemini AI summary details:', error);
      return this.getMockupSummary(rawContent);
    }
  }

  /**
   * Standard fallback mock structure if credentials/APIs fail to connect
   */
  private getMockupSummary(content: string): StructuredTenderSummary {
    return {
      eligibility: [
        'Memiliki SIUP / NIB di bidang Jasa Teknologi Informasi',
        'Memiliki sertifikasi tingkat kelayakan finansial minimal 1 tahun terakhir',
        'Tidak masuk dalam daftar hitam (blacklist) LKPP',
      ],
      requiredCertifications: [
        'ISO 27001:2013 (Information Security Management System)',
        'ISO 9001:2015 (Quality Management System)',
      ],
      deadlines: {
        clarificationPeriodEnd: '2026-07-02T16:00:00Z',
        proposalSubmissionDeadline: '2026-07-10T14:00:00Z',
        announcementWinner: '2026-07-15T10:00:00Z',
      },
      keyTechnicalSpecs: [
        'Penyediaan High-Availability Kubernetes Cluster di Pusat Data Nasional',
        'Sistem Autentikasi Tunggal berbasis OpenID Connect (OIDC)',
        'Dukungan Teknis SLA 99.9% (24/7/365)',
      ],
      estimatedDurationMonths: 6,
      risksAndGotchas: [
        'Syarat sertifikasi personil utama (Keahlian Ahli Madya) relatif ketat.',
        'Waktu penyampaian dokumen penawaran teknis sangat singkat (hanya 8 hari kerja).',
      ],
    };
  }
}
