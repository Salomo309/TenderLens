import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import * as crypto from 'crypto';

export interface MidtransNotificationDto {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string; // Resolves to Midtrans invoice link
  gross_amount: string;
  fraud_status?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly serverKey = process.env.MIDTRANS_SERVER_KEY;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate webhook request payload using Midtrans HMAC SHA512 signature key specs
   */
  validateSignature(dto: MidtransNotificationDto): boolean {
    if (!this.serverKey) {
      this.logger.warn('MIDTRANS_SERVER_KEY is undefined. Skipping webhook validation check (Sandbox).');
      return true; // Bypassed during local debugging
    }

    const payload = dto.order_id + dto.status_code + dto.gross_amount + this.serverKey;
    const computedSignature = crypto
      .createHash('sha512')
      .update(payload)
      .digest('hex');

    return computedSignature === dto.signature_key;
  }

  /**
   * Generates a new invoice and requests a Midtrans Snap transaction token
   */
  async createSubscriptionInvoice(tenantId: string, tier: string, amount: number, email: string, name: string): Promise<any> {
    const orderId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

    let snapToken = null;

    if (this.serverKey) {
      try {
        const authHeader = Buffer.from(`${this.serverKey}:`).toString('base64');
        const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
        const snapBaseUrl = isProduction
          ? 'https://app.midtrans.com/snap/v1/transactions'
          : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        const response = await fetch(snapBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: orderId,
              gross_amount: amount,
            },
            customer_details: {
              first_name: name,
              email: email,
            },
            item_details: [
              {
                id: `${tier.toLowerCase()}_monthly`,
                price: amount,
                quantity: 1,
                name: `TenderLens ${tier} Subscription - 30 Days`,
              },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          snapToken = result.token;
        } else {
          this.logger.error(`Midtrans Snap Request failed with status ${response.status}`);
        }
      } catch (err) {
        this.logger.error('Failed to communicate with Midtrans Snap API:', err);
      }
    }

    // Default fallback mock token for offline development if credentials are empty
    if (!snapToken) {
      snapToken = `mock-snap-token-${Date.now()}`;
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        amount,
        status: 'PENDING',
        midtransOrderId: orderId,
        midtransSnapToken: snapToken,
      },
    });

    return { invoice, snapToken };
  }

  /**
   * Handle invoice payments and update tenant subscription packages
   */
  async handleNotification(dto: MidtransNotificationDto) {
    this.logger.log(`Received billing callback for Order ID: ${dto.order_id}. Transaction Status: ${dto.transaction_status}`);

    const isValid = this.validateSignature(dto);
    if (!isValid) {
      this.logger.error(`Signature mismatch detected for Order ID: ${dto.order_id}! Rejecting webhook.`);
      throw new BadRequestException('Invalid signature verification token.');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { midtransOrderId: dto.order_id },
    });

    if (!invoice) {
      throw new BadRequestException(`Invoice associated with Order ID: ${dto.order_id} could not be resolved.`);
    }

    const status = dto.transaction_status;
    let finalInvoiceStatus = 'PENDING';
    let shouldActivateSubscription = false;

    if (status === 'settlement' || status === 'capture') {
      finalInvoiceStatus = 'PAID';
      shouldActivateSubscription = true;
    } else if (status === 'deny' || status === 'cancel' || status === 'expire') {
      finalInvoiceStatus = 'FAILED';
    } else if (status === 'pending') {
      finalInvoiceStatus = 'PENDING';
    }

    // 1. Update invoice status in database
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: finalInvoiceStatus,
        paidAt: finalInvoiceStatus === 'PAID' ? new Date() : null,
      },
    });

    // 2. Upgrade tenant subscription structure if payment is cleared
    if (shouldActivateSubscription) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30-day license active

      // Determine tier from amount (stored in invoice)
      let targetTier: SubscriptionTier = SubscriptionTier.PRO;
      const amt = Number(invoice.amount);
      if (amt === 59000) targetTier = SubscriptionTier.STARTER;
      else if (amt === 300000) targetTier = SubscriptionTier.ENTERPRISE;

      await this.prisma.subscription.upsert({
        where: { tenantId: invoice.tenantId },
        update: {
          tier: targetTier,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: expirationDate,
        },
        create: {
          tenantId: invoice.tenantId,
          tier: targetTier,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: expirationDate,
        },
      });

      this.logger.log(`Tenant ${invoice.tenantId} upgraded successfully to ${targetTier}. Expires on: ${expirationDate.toISOString()}`);
    }

    return { status: 'success', invoiceStatus: finalInvoiceStatus };
  }
}
