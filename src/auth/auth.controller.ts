import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  HttpCode,
  Cookies,
  Get,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { Response } from 'express';
import { Public } from '../common/decorators/jwt-auth.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ResponseMessage('Successfully logged in')
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginResponse = await this.authService.login(loginDto);

    res.cookie('accessToken', loginResponse.accessToken, {
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000, // express maxAge is in ms
    });

    res.cookie('refreshToken', loginResponse.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });

    return {
      accessToken: loginResponse.accessToken,
    };
  }

  @Public()
  @ResponseMessage('Successfully logged out')
  @HttpCode(HttpStatus.OK)
  @Post('/logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Cookies('refreshToken') refreshToken?: string,
  ) {
    if (refreshToken) await this.authService.logout(refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/auth' });

    return;
  }

  @Post('/refresh')
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @Cookies('refreshToken') refreshToken?: string,
  ) {
    const refreshResponse = await this.authService.refresh(refreshToken);

    res.cookie('accessToken', refreshResponse.accessToken, {
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000, // express maxAge is in ms
    });

    res.cookie('refreshToken', refreshResponse.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });
  }

  @Get('/me')
  async me(
    @Res({ passthrough: true }) res: Response,
    @Cookies('accessToken') accessToken?: string,
  ) {
    return this.authService.me(accessToken);
  }
}
