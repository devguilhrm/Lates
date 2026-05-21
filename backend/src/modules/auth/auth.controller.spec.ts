import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('deve delegar login para AuthService', async () => {
    const dto: LoginDto = { email: 'cliente@latesos.com', password: 'senha123' };
    authService.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    await expect(controller.login(dto)).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('deve delegar refresh para AuthService', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'new-access' });

    await expect(controller.refresh({ refreshToken: 'r1' })).resolves.toEqual({
      accessToken: 'new-access',
    });
    expect(authService.refresh).toHaveBeenCalledWith('r1');
  });

  it('deve delegar logout para AuthService', async () => {
    authService.logout.mockResolvedValue(undefined);

    await expect(
      controller.logout({ sub: 'user-1', email: 'u@u.com', role: 'CLIENT' }),
    ).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledWith('user-1');
  });
});
