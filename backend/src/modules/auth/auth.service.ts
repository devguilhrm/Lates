import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
      if (!user?.refreshTokenHash) throw new UnauthorizedException('Refresh token inválido.');

      const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!tokenMatches) throw new UnauthorizedException('Refresh token inválido.');

      return { accessToken: await this.signAccessToken(user) };
    } catch {
      throw new UnauthorizedException('Refresh token inválido.');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { refreshTokenHash: null });
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.save(user);

    return { accessToken, refreshToken };
  }

  private signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(this.toPayload(user), {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.getJwtExpiration('JWT_EXPIRATION', '15m'),
    });
  }

  private signRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(this.toPayload(user), {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.getJwtExpiration('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  private toPayload(user: User): JwtPayload {
    return { sub: user.id, email: user.email, role: user.role };
  }

  private getJwtExpiration(key: string, fallback: string): JwtSignOptions['expiresIn'] {
    return (this.config.get<string>(key) ?? fallback) as JwtSignOptions['expiresIn'];
  }
}
