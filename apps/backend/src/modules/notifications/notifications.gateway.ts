import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private tenantSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const token = client.handshake.auth?.token || client.handshake.query?.token as string;

    if (!tenantId || !token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.tenantId !== tenantId) {
        this.logger.warn(`Socket tenant mismatch: token=${payload.tenantId} != requested=${tenantId}`);
        client.disconnect();
        return;
      }
    } catch {
      this.logger.warn(`Socket rejected: invalid JWT for tenant ${tenantId}`);
      client.disconnect();
      return;
    }

    if (!this.tenantSockets.has(tenantId)) {
      this.tenantSockets.set(tenantId, new Set());
    }
    this.tenantSockets.get(tenantId)!.add(client.id);

    client.join(`tenant:${tenantId}`);
    this.logger.log(`Client connected: ${client.id} for tenant ${tenantId}`);
  }

  handleDisconnect(client: Socket) {
    for (const [tenantId, sockets] of this.tenantSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.tenantSockets.delete(tenantId);
        break;
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendNotification(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  sendAlert(tenantId: string, payload: { title: string; message: string; tenderId?: string }) {
    this.sendNotification(tenantId, 'alert', payload);
  }
}
