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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/jwt-auth.decorator.js';
import {
  ApiCsrf,
  ApiEnvelope,
  ApiError,
  ApiValidationError,
} from '../common/swagger/decorators.js';
import {
  EmployeeWithRoleModel,
  LoginResponseModel,
} from '../common/swagger/models.js';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

const TOKEN_COOKIES = {
  'Set-Cookie': {
    description:
      'accessToken (15 minutes) and refreshToken (7 days, path /auth), both HttpOnly, Secure, SameSite=Strict',
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Log in and receive the auth cookies' })
  @ApiCsrf()
  @ApiEnvelope(LoginResponseModel, {
    message: 'Successfully logged in',
    headers: TOKEN_COOKIES,
  })
  @ApiError(401, 'Invalid credentials')
  @ApiValidationError()
  @Throttle(AUTH_THROTTLE)
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
      sameSite: 'strict',
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

  @ApiOperation({
    summary: 'Revoke the refresh token and clear the auth cookies',
  })
  @ApiCsrf()
  @ApiEnvelope(null, { message: 'Successfully logged out' })
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

  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
    description:
      'Reads the refreshToken cookie. Presenting an already rotated refresh token revokes every refresh token of that employee.',
  })
  @ApiCsrf()
  @ApiEnvelope(null, { headers: TOKEN_COOKIES })
  @ApiError(
    401,
    'Invalid refresh token, Refresh token expired or Refresh token reuse detected',
  )
  @Throttle(AUTH_THROTTLE)
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('/refresh')
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @Cookies('refreshToken') refreshToken?: string,
  ) {
    const refreshResponse = await this.authService.refresh(refreshToken);

    res.cookie('accessToken', refreshResponse.accessToken, {
      sameSite: 'strict',
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

  @ApiOperation({
    summary: 'Get the logged in employee',
    description: 'Reads the accessToken cookie.',
  })
  @ApiCookieAuth()
  @ApiError(
    401,
    'Missing token',
    ['UNAUTHENTICATED', 'TOKEN_EXPIRED', 'TOKEN_INVALID'],
    false,
  )
  @ApiEnvelope(EmployeeWithRoleModel)
  @Get('/me')
  async me(
    @Res({ passthrough: true }) res: Response,
    @Cookies('accessToken') accessToken?: string,
  ) {
    return this.authService.me(accessToken);
  }
}
