import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  create(@Body() createMessageDto: CreateMessageDto, @CurrentUser() user: any) {
    return this.messagesService.create(user.userId, createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user conversations' })
  getConversations(@CurrentUser() user: any) {
    return this.messagesService.getConversations(user.userId);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages with a specific user (conversationId is the other user ID)' })
  getConversation(@Param('conversationId') otherUserId: string, @CurrentUser() user: any) {
    return this.messagesService.getConversation(user.userId, otherUserId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message (Sender only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.remove(id, user.userId);
  }
}
