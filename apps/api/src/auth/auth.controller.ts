import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './public.decorator.js';
import { readRefreshCookie, REFRESH_COOKIE_NAME } from './refresh-cookie.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() input: RegisterDto) {
    return { user: await this.auth.register(input) };
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(input);
    response.cookie(
      'driverfin_refresh',
      result.refreshToken,
      this.auth.refreshCookieOptions(result.refreshMaxAgeSeconds),
    );
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  async refresh(@Req() request: Request) {
    const result = await this.auth.refresh(readRefreshCookie(request));
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  @Public()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readRefreshCookie(request), request.header('Authorization'));
    response.clearCookie(REFRESH_COOKIE_NAME, this.auth.refreshCookieOptions(0));
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Public()
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    await this.auth.forgotPassword(input.email);
    return {
      message:
        'Se houver uma conta para este e-mail, você receberá instruções para redefinir a senha.',
    };
  }

  @Post('reset-password')
  @HttpCode(204)
  @Public()
  async resetPassword(
    @Body() input: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.resetPassword(input.token, input.password);
    response.clearCookie(REFRESH_COOKIE_NAME, this.auth.refreshCookieOptions(0));
  }
}
