import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Role, Status } from '@prisma/client';
import { ForgotPasswordDto, LoginDto, RegisterUserDto, ResetPasswordDto } from './dto/create-auth.dto';
import { GoogleProfile } from './google.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

const PENDING_ROLES: Role[] = [
  Role.AGENT,
  Role.ADMIN,
  Role.LANDLORD,
  Role.CARETAKER,
  Role.TENANT,
];

const PROPERTY_REQUIRED_ROLES: Role[] = [Role.CARETAKER, Role.TENANT];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  // ==============================
  // REGISTER
  // ==============================
  async register(dto: RegisterUserDto, ipAddress?: string) {
    const role = dto.role || Role.USER;

    if (role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('SYSTEM_ADMIN cannot self-register.');
    }

    if (PROPERTY_REQUIRED_ROLES.includes(role)) {
      if (!dto.propertyId) {
        throw new BadRequestException(`propertyId is required when registering as ${role}.`);
      }

      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
        include: { agent: true },
      });

      if (!property) throw new NotFoundException(`Property '${dto.propertyId}' not found.`);

      const owner = property.agent;
      if (!owner || (owner.role !== Role.LANDLORD && owner.role !== Role.SUPER_ADMIN && owner.role !== Role.ADMIN)) {
        throw new BadRequestException('The selected property must belong to a registered LANDLORD.');
      }
      if (owner.status !== Status.APPROVED) {
        throw new BadRequestException('The property LANDLORD has not been approved yet.');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already exists.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const status = PENDING_ROLES.includes(role) ? Status.PENDING : Status.APPROVED;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role,
        status,
        ...(dto.propertyId ? { registrationPropertyId: dto.propertyId } : {}),
      },
    });

    const messageMap: Record<string, string> = {
      [Role.USER]:      'User registered successfully.',
      [Role.AGENT]:     'Agent registration submitted. Awaiting ADMIN approval.',
      [Role.ADMIN]:     'Admin registration submitted. Awaiting SYSTEM_ADMIN approval.',
      [Role.LANDLORD]:  'Landlord registration submitted. Awaiting ADMIN or SYSTEM_ADMIN approval.',
      [Role.CARETAKER]: 'Caretaker registration submitted. Awaiting property Landlord approval.',
      [Role.TENANT]:    'Tenant registration submitted. Awaiting property Landlord or Caretaker approval.',
    };

    // Trigger notifications
    if (status === Status.APPROVED) {
      await this.notifications.create(user.id, 'WELCOME', `Welcome to Realtor, ${user.name}!`);
      this.mail.sendWelcome(user.email, user.name);
    } else {
      await this.notifications.create(user.id, 'REGISTRATION_PENDING', messageMap[role]);
      this.mail.sendRegistrationPending(user.email, user.name, role);
    }

    // Audit log
    await this.audit.log({
      action: 'REGISTER',
      module: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      userRole: user.role,
      ipAddress,
      newValue: { email: user.email, role: user.role, status: user.status },
      status: 'SUCCESS',
    });

    return {
      message: messageMap[role] ?? 'Registration successful.',
      pending: status === Status.PENDING,
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    };
  }

  // ==============================
  // LOGIN
  // ==============================
  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      await this.audit.log({ action: 'LOGIN_FAILED', module: 'AUTH', ipAddress, status: 'FAILURE', failReason: 'User not found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      await this.audit.log({ action: 'LOGIN_BLOCKED', module: 'AUTH', entityId: user.id, performedBy: user.id, userRole: user.role, ipAddress, status: 'FAILURE', failReason: 'Account blocked' });
      throw new ForbiddenException('Your account has been blocked.');
    }

    if (PENDING_ROLES.includes(user.role) && user.status === Status.PENDING) {
      await this.audit.log({ action: 'LOGIN_PENDING', module: 'AUTH', entityId: user.id, performedBy: user.id, userRole: user.role, ipAddress, status: 'FAILURE', failReason: 'Account pending approval' });
      throw new ForbiddenException(`Your ${user.role} account is pending approval.`);
    }

    if (user.status === Status.REJECTED) {
      await this.audit.log({ action: 'LOGIN_REJECTED', module: 'AUTH', entityId: user.id, performedBy: user.id, userRole: user.role, ipAddress, status: 'FAILURE', failReason: 'Account registration rejected' });
      throw new ForbiddenException('Your account registration request was rejected.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.audit.log({ action: 'LOGIN_FAILED', module: 'AUTH', entityId: user.id, performedBy: user.id, userRole: user.role, ipAddress, status: 'FAILURE', failReason: 'Wrong password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    await this.audit.log({ action: 'LOGIN', module: 'AUTH', entityId: user.id, performedBy: user.id, userRole: user.role, ipAddress, status: 'SUCCESS' });

    return {
      message: 'Login successful',
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ==============================
  // APPROVE USER (full matrix)
  // ==============================
  async approveUser(targetId: string, callerId: string, callerRole: Role, ipAddress?: string) {
    if (targetId === callerId) throw new ForbiddenException('You cannot approve yourself.');

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: {
        registrationProperty: { include: { agent: true } },
      },
    });

    if (!target) throw new NotFoundException('User not found.');
    if (target.status === Status.APPROVED) throw new BadRequestException('User is already approved.');

    const allowed = await this.canApprove(target, callerId, callerRole);
    if (!allowed) {
      await this.audit.log({ action: 'APPROVE_DENIED', module: 'AUTH', entityType: 'User', entityId: targetId, performedBy: callerId, userRole: callerRole, ipAddress, status: 'FAILURE', failReason: `${callerRole} cannot approve ${target.role}` });
      throw new ForbiddenException(`A ${callerRole} is not permitted to approve a ${target.role}.`);
    }

    const updated = await this.prisma.user.update({ where: { id: targetId }, data: { status: Status.APPROVED } });

    // Trigger notifications
    await this.notifications.create(targetId, 'ACCOUNT_APPROVED', `Your ${target.role} account has been approved. You can now log in.`);
    this.mail.sendApprovalNotification(target.email, target.name, target.role);

    await this.audit.log({ action: 'APPROVE_USER', module: 'AUTH', entityType: 'User', entityId: targetId, performedBy: callerId, userRole: callerRole, ipAddress, prevValue: { status: 'PENDING' }, newValue: { status: 'APPROVED' }, status: 'SUCCESS' });

    return {
      message: `${target.role} account approved successfully.`,
      user: { id: updated.id, email: updated.email, role: updated.role, status: updated.status },
    };
  }

  private async canApprove(target: any, callerId: string, callerRole: Role): Promise<boolean> {
    if (callerRole === Role.SUPER_ADMIN) return true;
    switch (target.role) {
      case Role.USER: return false;
      case Role.ADMIN: return false;
      case Role.LANDLORD:
      case Role.AGENT: return callerRole === Role.ADMIN;
      case Role.CARETAKER:
        if (callerRole === Role.ADMIN) return true;
        if (!target.registrationProperty) return false;
        return callerRole === Role.LANDLORD && target.registrationProperty.agentId === callerId;
      case Role.TENANT:
        if (callerRole === Role.ADMIN) return true;
        if (!target.registrationProperty) return false;
        if (callerRole === Role.LANDLORD) return target.registrationProperty.agentId === callerId;
        if (callerRole === Role.CARETAKER) {
          const building = await this.prisma.building.findFirst({ where: { caretakerId: callerId } });
          return !!building;
        }
        return false;
      default: return false;
    }
  }

  // ==============================
  // REJECT USER
  // ==============================
  async rejectUser(targetId: string, callerId?: string, callerRole?: string, ipAddress?: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found.');

    const updated = await this.prisma.user.update({ where: { id: targetId }, data: { status: Status.REJECTED } });

    await this.notifications.create(targetId, 'ACCOUNT_REJECTED', `Your ${target.role} registration was not approved. Please contact support.`);
    this.mail.sendRejectionNotification(target.email, target.name, target.role);

    await this.audit.log({ action: 'REJECT_USER', module: 'AUTH', entityType: 'User', entityId: targetId, performedBy: callerId, userRole: callerRole, ipAddress, prevValue: { status: target.status }, newValue: { status: 'REJECTED' }, status: 'SUCCESS' });

    return {
      message: `${target.role} account rejected.`,
      user: { id: updated.id, email: updated.email, role: updated.role, status: updated.status },
    };
  }

  // ==============================
  // BLOCK / UNBLOCK USER
  // ==============================
  async blockUser(id: string, block: boolean, callerId?: string, callerRole?: string) {
    const updated = await this.prisma.user.update({ where: { id }, data: { isBlocked: block } });
    await this.audit.log({ action: block ? 'BLOCK_USER' : 'UNBLOCK_USER', module: 'AUTH', entityType: 'User', entityId: id, performedBy: callerId, userRole: callerRole, newValue: { isBlocked: block }, status: 'SUCCESS' });
    return updated;
  }

  // ==============================
  // FORGOT PASSWORD
  // ==============================
  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new NotFoundException('No account found with that email address.');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked.');
    }

    // Generate a secure random token (64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    // Store hashed version so raw token in email cannot be used directly from DB
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });

    // Send email with the raw token
    await this.mail.sendPasswordReset(user.email, user.name, rawToken);

    await this.audit.log({
      action: 'FORGOT_PASSWORD',
      module: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      status: 'SUCCESS',
    });

    this.logger.log(`Password reset email sent to ${user.email}`);
    return { message: 'A password reset link has been sent to your email.' };
  }

  // ==============================
  // RESET PASSWORD
  // ==============================
  async resetPassword(dto: ResetPasswordDto, ipAddress?: string) {
    // Hash the incoming token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: { gt: new Date() }, // Token must not be expired
      },
    });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    await this.notifications.create(
      user.id,
      'PASSWORD_RESET',
      'Your password has been reset successfully. If you did not request this, contact support immediately.',
    );

    await this.audit.log({
      action: 'RESET_PASSWORD',
      module: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      userRole: user.role,
      ipAddress,
      status: 'SUCCESS',
    });

    this.logger.log(`Password reset successfully for ${user.email}`);
    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  // ==============================
  // GOOGLE OAUTH LOGIN
  // ==============================
  async googleLogin(profile: GoogleProfile, ipAddress?: string) {
    if (!profile.email) {
      throw new BadRequestException('Google account has no associated email.');
    }

    // 1. Try find by googleId (returning user)
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    // 2. Try link by email (existing account with same email)
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingByEmail) {
        // Link Google to existing account
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: profile.googleId,
            avatar: existingByEmail.avatar ?? profile.avatar,
          },
        });
        this.logger.log(`Linked Google account to existing user: ${user.email}`);
      }
    }

    // 3. Create brand-new user from Google profile
    if (!user) {
      // Generate a random secure password — user cannot use it (no email/password login path exists for pure Google accounts)
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: randomPassword,
          googleId: profile.googleId,
          avatar: profile.avatar,
          role: Role.USER,
          status: Status.APPROVED, // Google-verified → auto-approved
        },
      });

      // Welcome email
      await this.mail.sendWelcome(user.email, user.name);

      this.logger.log(`New user registered via Google: ${user.email}`);
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked. Contact support.');
    }

    // Sign JWT — same shape as regular login
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    await this.audit.log({
      action: 'GOOGLE_LOGIN',
      module: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      userRole: user.role,
      ipAddress,
      status: 'SUCCESS',
    });

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}
