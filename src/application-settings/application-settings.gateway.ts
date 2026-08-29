import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface SessionPolicyPayload {
  laboratory_id: number;
  session_timeout_minutes: number;
  inactivity_timeout_minutes: number;
  countdown_seconds: number;
}

@WebSocketGateway({ namespace: '/session-policy', cors: { origin: true, credentials: true } })
export class ApplicationSettingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(ApplicationSettingsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.readToken(client);
      const payload = await this.jwtService.verifyAsync<{ id?: number; laboratoryId?: number }>(token);
      if (!Number.isInteger(payload.id) || Number(payload.id) <= 0) throw new Error('SOCKET_USER_INVALID');
      const laboratoryId = Number.isInteger(payload.laboratoryId) && Number(payload.laboratoryId) > 0 ? Number(payload.laboratoryId) : 1;
      client.data.userId = Number(payload.id);
      client.data.laboratoryId = laboratoryId;
      await client.join(this.room(laboratoryId));
    } catch {
      client.emit('session-policy.error', { code: 'SOCKET_AUTHENTICATION_FAILED' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Session policy socket disconnected: ${client.id}`);
  }

  publish(payload: SessionPolicyPayload, excludedSocketId?: string): void {
    const room = this.server.to(this.room(payload.laboratory_id));
    const target = excludedSocketId ? room.except(excludedSocketId) : room;
    target.emit('session-policy.updated', payload);
  }
  private readToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const header = client.handshake.headers.authorization;
    const token = typeof authToken === 'string' && authToken.trim() !== '' ? authToken.trim() : typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token === '') throw new Error('SOCKET_TOKEN_REQUIRED');
    return token;
  }

  private room(laboratoryId: number): string { return `laboratory:${laboratoryId}`; }
}
