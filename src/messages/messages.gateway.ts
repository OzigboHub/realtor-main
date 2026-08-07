import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> socketId
  private connectedUsers = new Map<string, string>();

  constructor(private readonly messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    // In a real scenario, you'd extract the user ID from the JWT token sent during connection.
    // For simplicity, we assume the client sends userId in headers or query params during handshake.
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedUsers.set(userId, client.id);
      console.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId && this.connectedUsers.get(userId) === client.id) {
      this.connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.handshake.query.userId as string;
    if (!senderId) {
      client.emit('error', 'Unauthorized socket');
      return;
    }

    try {
      // Save message via REST service
      const message = await this.messagesService.create(senderId, createMessageDto);

      // Emit to receiver if online
      const receiverSocketId = this.connectedUsers.get(createMessageDto.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      }

      // Also acknowledge the sender back (optional)
      client.emit('messageSent', message);
    } catch (error) {
      client.emit('error', error.message);
    }
  }
}
