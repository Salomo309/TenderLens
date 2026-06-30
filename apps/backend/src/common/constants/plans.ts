export enum PlanTier {
  FREE_TRIAL = 'FREE_TRIAL',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface PlanConfig {
  label: string;
  price: number;
  maxKeywords: number;
  maxSavedTenders: number;
  maxAiSummariesPerMonth: number;
  notificationDelayMinutes: number;
  telegramGroupAllowed: boolean;
  competitorHistory: boolean;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  FREE_TRIAL: {
    label: 'Free Trial',
    price: 0,
    maxKeywords: 1,
    maxSavedTenders: 10,
    maxAiSummariesPerMonth: 2,
    notificationDelayMinutes: 0,
    telegramGroupAllowed: false,
    competitorHistory: false,
    features: [
      'Pantau hingga 10 tender aktif',
      '1 Kata kunci alarm',
      'Notifikasi via Dashboard',
      '2 AI Ringkasan per bulan',
    ],
  },
  STARTER: {
    label: 'Starter',
    price: 59000,
    maxKeywords: 3,
    maxSavedTenders: 30,
    maxAiSummariesPerMonth: 3,
    notificationDelayMinutes: 30,
    telegramGroupAllowed: false,
    competitorHistory: false,
    features: [
      'Maksimal 3 kata kunci dipantau',
      'Notifikasi ke 1 akun Telegram personal',
      'Delay notifikasi 30 menit',
      '3 AI Summary dokumen per bulan',
    ],
  },
  PRO: {
    label: 'Pro License',
    price: 109000,
    maxKeywords: 10,
    maxSavedTenders: 100,
    maxAiSummariesPerMonth: 20,
    notificationDelayMinutes: 0,
    telegramGroupAllowed: true,
    competitorHistory: true,
    features: [
      'Maksimal 10 kata kunci',
      'Notifikasi real-time (< 5 menit)',
      'Bisa masuk ke 1 grup Telegram Tim',
      '20 AI Summary dokumen per bulan',
      'Akses dashboard analitik pemenang',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise License',
    price: 300000,
    maxKeywords: 9999,
    maxSavedTenders: 9999,
    maxAiSummariesPerMonth: 9999,
    notificationDelayMinutes: 0,
    telegramGroupAllowed: true,
    competitorHistory: true,
    features: [
      'Unlimited kata kunci',
      'Multi-grup Telegram',
      'Unlimited AI Summary',
      'Prioritas server bot paling cepat',
      'Fitur mata-mata histori kompetitor',
    ],
  },
};

export function getPlanConfig(tier: string): PlanConfig {
  return PLANS[tier] || PLANS.FREE_TRIAL;
}
