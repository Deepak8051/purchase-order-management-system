import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    return secret;
  }

  private async createAccessToken(userId: number): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      tokenType: 'access',
    });
  }

  private async createRefreshToken(userId: number): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        tokenType: 'refresh',
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: '7d',
      },
    );
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.createAccessToken(user.id);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        tokenType: string;
      }>(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      if (
        payload.tokenType !== 'refresh' ||
        !Number.isInteger(payload.sub) ||
        payload.sub <= 0
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User is inactive or unavailable');
      }

      return {
        accessToken: await this.createAccessToken(user.id),
        tokenType: 'Bearer',
        expiresIn: '15m',
      };
    } catch {
      throw new UnauthorizedException(
        'Refresh token is invalid or expired. Please log in again.',
      );
    }
  }
}
