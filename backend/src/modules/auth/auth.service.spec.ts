import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums';
import { User } from '../../database/entities';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let config: {
    get: jest.Mock;
  };

  const activeUser: User = {
    id: 'user-1',
    name: 'Cliente',
    email: 'cliente@latesos.com',
    passwordHash: 'hashed',
    role: UserRole.CLIENT,
    isActive: true,
    refreshTokenHash: null,
  } as User;

  beforeEach(() => {
    usersRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (user) => user),
      update: jest.fn(async () => undefined),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'jwt-refresh-secret';
        if (key === 'JWT_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return undefined;
      }),
    };

    service = new AuthService(
      usersRepo as any,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve realizar login e emitir tokens', async () => {
    usersRepo.findOne.mockResolvedValue({ ...activeUser });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('refresh-hash');
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({ email: activeUser.email, password: 'senha123' });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(usersRepo.save).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
  });

  it('deve falhar login para usuario inativo', async () => {
    usersRepo.findOne.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(service.login({ email: activeUser.email, password: 'senha123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve falhar login com senha invalida', async () => {
    usersRepo.findOne.mockResolvedValue({ ...activeUser });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: activeUser.email, password: 'senha-errada' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve renovar access token com refresh token valido', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: activeUser.email,
      role: UserRole.CLIENT,
    });
    usersRepo.findOne.mockResolvedValue({ ...activeUser, refreshTokenHash: 'stored-refresh-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('new-access-token');

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
    });
  });

  it('deve falhar refresh token invalido', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve fazer logout removendo hash do refresh token', async () => {
    await expect(service.logout('user-1')).resolves.toBeUndefined();
    expect(usersRepo.update).toHaveBeenCalledWith('user-1', { refreshTokenHash: null });
  });
});
