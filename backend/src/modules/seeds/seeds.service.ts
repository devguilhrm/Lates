import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { User } from '../../database/entities';

@Injectable()
export class SeedsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn('Seed admin ignorado: ADMIN_EMAIL/ADMIN_PASSWORD não configurados.');
      return;
    }

    const exists = await this.usersRepo.exists({ where: { email } });
    if (exists) return;

    await this.usersRepo.save(
      this.usersRepo.create({
        name: this.config.get<string>('ADMIN_NAME') ?? 'Administrador',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );

    this.logger.log(`Usuário admin inicial criado: ${email}`);
  }
}
