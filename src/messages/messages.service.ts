import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(senderId: string, createMessageDto: CreateMessageDto) {
    const { receiverId, content } = createMessageDto;

    // Check if receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) throw new NotFoundException('Receiver not found');

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
    });

    // Fetch sender to format a friendly notification
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });
    const senderName = sender?.name || sender?.email || 'A user';
    const preview =
      content.length > 60 ? `${content.substring(0, 57)}...` : content;

    // Trigger in-app notification for recipient
    await this.notifications.create(
      receiverId,
      'NEW_MESSAGE',
      `${senderName}: "${preview}"`,
      { senderId, messageId: message.id, senderName },
    );

    return message;
  }

  async getConversation(userId: string, otherUserId: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getConversations(userId: string) {
    // A simple approach to get distinct conversations is to find all messages
    // involving the user and group them by the other participant.
    // Prisma doesn't have a direct "group by" for this scenario that returns the full row easily,
    // so we'll fetch all unique user pairs.

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        receiver: { select: { id: true, name: true, profileImage: true } },
      },
    });

    // Group by other user
    const conversationsMap = new Map<string, any>();

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          contact: otherUser,
          lastMessage: msg,
        });
      }
    }

    return Array.from(conversationsMap.values());
  }

  async remove(id: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId !== userId) {
      throw new NotFoundException(
        'Message not found or you are not the sender',
      );
    }

    await this.prisma.message.delete({ where: { id } });
    return { success: true };
  }
}
