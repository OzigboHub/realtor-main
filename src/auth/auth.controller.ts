import { Body, Controller, Post, Patch, Param, UseGuards, Get, Request, Redirect } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { ForgotPasswordDto, LoginDto, RegisterUserDto, ResetPasswordDto } from './dto/create-auth.dto';
import { RolesGuard } from 'src/common/roles.guard';
import { JwtAuthGuard } from './jwt.guard';
import { Roles } from 'src/common/roles.decorators';
import { GoogleAuthGuard } from './google.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // =============================
  // REGISTER
  // =============================
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Roles USER → immediate approval. AGENT, ADMIN, LANDLORD, CARETAKER, TENANT → PENDING until approved. SUPER_ADMIN cannot self-register. CARETAKER & TENANT require a propertyId.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'Registration successful.' })
  @ApiResponse({ status: 400, description: 'Validation error or email already exists.' })
  @ApiResponse({ status: 403, description: 'SUPER_ADMIN cannot self-register.' })
  @ApiResponse({ status: 404, description: 'Property not found.' })
  register(@Body() dto: RegisterUserDto, @Request() req: any) {
    return this.authService.register(dto, req.ip);
  }

  // =============================
  // LOGIN
  // =============================
  @Post('login')
  @ApiOperation({ summary: 'Login user and return JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Account pending approval or blocked.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =============================
  // APPROVE USER (Matrix-aware)
  // =============================
  @Patch('approve/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LANDLORD, Role.CARETAKER)
  @ApiOperation({
    summary: 'Approve a pending user',
    description:
      'Approval is role-and-property-aware. ADMIN approved by SUPER_ADMIN only. LANDLORD/AGENT by ADMIN+. CARETAKER by property LANDLORD, ADMIN+. TENANT by property LANDLORD, CARETAKER, ADMIN+.',
  })
  @ApiResponse({ status: 200, description: 'User approved.' })
  @ApiResponse({ status: 403, description: 'Caller is not permitted to approve this role.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  approveUser(@Param('id') id: string, @Request() req: any) {
    return this.authService.approveUser(id, req.user.userId, req.user.role, req.ip);
  }

  // =============================
  // REJECT USER
  // =============================
  @Patch('reject/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LANDLORD, Role.CARETAKER)
  @ApiOperation({ summary: 'Reject a pending user registration' })
  @ApiResponse({ status: 200, description: 'User rejected.' })
  rejectUser(@Param('id') id: string, @Request() req: any) {
    return this.authService.rejectUser(id, req.user.userId, req.user.role, req.ip);
  }

  // =============================
  // BLOCK USER
  // =============================
  @Patch('block/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block user account (Admin or Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User blocked successfully.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  blockUser(@Param('id') id: string, @Request() req: any) {
    return this.authService.blockUser(id, true, req.user.userId, req.user.role);
  }

  // =============================
  // UNBLOCK USER
  // =============================
  @Patch('unblock/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock user account (Admin or Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  unblockUser(@Param('id') id: string, @Request() req: any) {
    return this.authService.blockUser(id, false, req.user.userId, req.user.role);
  }

  // =============================
  // FORGOT PASSWORD
  // =============================
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset email',
    description:
      'Sends a password reset link to the provided email address. Always returns a generic success message to prevent email enumeration.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 201, description: 'Reset email sent (if account exists).' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req: any) {
    return this.authService.forgotPassword(dto, req.ip);
  }

  // =============================
  // RESET PASSWORD
  // =============================
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password using token from email',
    description:
      'Validates the reset token and sets a new password. Token expires after 1 hour.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Password reset successful.' })
  @ApiResponse({ status: 400, description: 'Token is invalid or expired.' })
  resetPassword(@Body() dto: ResetPasswordDto, @Request() req: any) {
    return this.authService.resetPassword(dto, req.ip);
  }

  // =============================
  // GOOGLE OAUTH — INITIATE
  // =============================
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Redirect to Google sign-in',
    description: 'Browser navigates here; backend redirects to Google consent screen.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to Google.' })
  googleAuth() {
    // Guard handles the redirect — this body is never reached
  }

  // =============================
  // GOOGLE OAUTH — CALLBACK
  // =============================
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Google redirects here after user approval. Backend signs a JWT and redirects to the frontend with ?token=<jwt>.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token.' })
  async googleCallback(@Request() req: any) {
    const result = await this.authService.googleLogin(req.user, req.ip);
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    return {
      url: `${frontendUrl}/auth/callback?token=${result.access_token}`,
    };
  }
}
