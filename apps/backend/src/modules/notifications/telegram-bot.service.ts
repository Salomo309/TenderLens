import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf | null = null;

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot polling disabled.');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx) => {
      const chatId = ctx.chat.id;
      const name = ctx.from?.first_name || 'Sobat';

      ctx.reply(
        `Halo ${name}! 👋\n\n` +
        `Akun Telegram Anda berhasil terhubung dengan TenderLens.\n\n` +
        `Chat ID Anda: \`${chatId}\`\n\n` +
        `Copy Chat ID di atas, lalu masukkan ke halaman Settings > Telegram di dashboard TenderLens untuk mengaktifkan notifikasi.\n\n` +
        `Terima kasih telah menggunakan TenderLens! 🚀`,
        { parse_mode: 'Markdown' },
      );

      this.logger.log(`/start from ${name} (chat: ${chatId})`);
    });

    this.bot.help((ctx) => {
      ctx.reply(
        'Perintah yang tersedia:\n' +
        '/start - Hubungkan akun Telegram ke TenderLens\n' +
        '/help - Bantuan perintah\n' +
        '/chatid - Tampilkan Chat ID Anda',
      );
    });

    this.bot.command('chatid', (ctx) => {
      ctx.reply(`Chat ID Anda: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
    });

    this.bot.on('text', (ctx) => {
      if (!ctx.message.text.startsWith('/')) return;
    });

    this.bot.launch().then(() => {
      this.logger.log('Telegram bot polling started');
    }).catch((err) => {
      this.logger.error('Failed to start Telegram bot polling:', err);
    });
  }

  isRunning(): boolean {
    return this.bot !== null;
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
      this.logger.log('Telegram bot polling stopped');
    }
  }
}
