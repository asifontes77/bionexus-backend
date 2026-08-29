import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/authorization-events', cors: { origin: true, credentials: true } })
export class AuthorizationEventsGateway implements OnGatewayConnection {
  @WebSocketServer() private server!: Server;
  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.readToken(client);
      const payload = await this.jwtService.verifyAsync<{ id?: number }>(token);
      const userId = Number(payload.id);
      if (!Number.isInteger(userId) || userId <= 0) throw new Error('SOCKET_USER_INVALID');
      client.data.userId = userId;
      await client.join(this.userRoom(userId));
    } catch {
      client.emit('authorization.error', { code: 'SOCKET_AUTHENTICATION_FAILED' });
      client.disconnect(true);
    }
  }

  publishToUsers(userIds: number[]): void {
    const normalized = Array.from(new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)));
    for (const userId of normalized) this.server.to(this.userRoom(userId)).emit('authorization.updated', { userId });
  }

  private readToken(client: Socket): string {
    const value = client.handshake.auth?.token;
    const token = typeof value === 'string' ? value.trim() : '';
    if (token === '') throw new Error('SOCKET_TOKEN_REQUIRED');
    return token;
  }

  private userRoom(userId: number): string { return `user:${userId}`; }
}
