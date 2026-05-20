import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PlanType, UserRole } from '../../common/enums';
import { Client, Professional, User } from '../../database/entities';

interface ClientSeed {
  name: string;
  email: string;
  phone: string;
  plan: PlanType;
  creditsRemaining: number;
  birthDate: string;
  anamnesis: string;
  emergencyContact?: string;
}

interface ProfessionalSeed {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
}

@Injectable()
export class SeedsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedsService.name);
  private readonly demoPassword = 'demo123';

  private readonly demoClients: ClientSeed[] = [
    {
      name: 'Mariana Costa',
      email: 'cliente.mariana@latesos.com',
      phone: '(11) 98765-1001',
      plan: PlanType.MONTHLY,
      creditsRemaining: 8,
      birthDate: '1990-04-15',
      anamnesis: 'Dor lombar leve e encurtamento posterior de coxa.',
      emergencyContact: 'Carlos Costa - (11) 97777-1001',
    },
    {
      name: 'Renato Lima',
      email: 'cliente.renato@latesos.com',
      phone: '(11) 98765-1002',
      plan: PlanType.ANNUAL,
      creditsRemaining: 120,
      birthDate: '1984-10-02',
      anamnesis: 'Pos-operatorio de joelho, foco em fortalecimento gradual.',
      emergencyContact: 'Patricia Lima - (11) 97777-1002',
    },
    {
      name: 'Fernanda Rocha',
      email: 'cliente.fernanda@latesos.com',
      phone: '(11) 98765-1003',
      plan: PlanType.CREDIT_PACK,
      creditsRemaining: 6,
      birthDate: '1995-06-20',
      anamnesis: 'Busca ganho de mobilidade de quadril e melhora postural.',
    },
  ];

  private readonly demoProfessionals: ProfessionalSeed[] = [
    {
      name: 'Paula Nunes',
      email: 'prof.paula@latesos.com',
      phone: '(11) 98888-2001',
      specialty: 'Pilates aparelhos, Reabilitacao postural',
      bio: 'Especialista em pilates clinico com foco em lombalgia e postura.',
    },
    {
      name: 'Bruno Sampaio',
      email: 'prof.bruno@latesos.com',
      phone: '(11) 98888-2002',
      specialty: 'Fisioterapia ortopedica, Pilates solo',
      bio: 'Atuacao em fisioterapia funcional e retorno de lesoes esportivas.',
    },
  ];

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Client)
    private readonly clientsRepo: Repository<Client>,
    @InjectRepository(Professional)
    private readonly professionalsRepo: Repository<Professional>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureAdminSeed();
    await this.ensureDemoData();
  }

  private async ensureAdminSeed(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn('Seed admin ignorado: ADMIN_EMAIL/ADMIN_PASSWORD nao configurados.');
      return;
    }

    const existing = await this.usersRepo.findOne({ where: { email }, withDeleted: true });
    if (existing) {
      if (existing.deletedAt) {
        await this.usersRepo.recover(existing);
      }

      if (!existing.isActive || existing.role !== UserRole.ADMIN) {
        existing.isActive = true;
        existing.role = UserRole.ADMIN;
        await this.usersRepo.save(existing);
      }
      return;
    }

    await this.usersRepo.save(
      this.usersRepo.create({
        name: this.config.get<string>('ADMIN_NAME') ?? 'Administrador',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );

    this.logger.log(`Usuario admin inicial criado: ${email}`);
  }

  private async ensureDemoData(): Promise<void> {
    for (const clientSeed of this.demoClients) {
      await this.ensureClient(clientSeed);
    }

    for (const professionalSeed of this.demoProfessionals) {
      await this.ensureProfessional(professionalSeed);
    }

    this.logger.log('Seeds de clientes e profissionais ficticios verificados.');
  }

  private async ensureClient(seed: ClientSeed): Promise<void> {
    const user = await this.findOrCreateUser({
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      role: UserRole.CLIENT,
    });

    const existing = await this.clientsRepo.findOne({
      where: { user: { id: user.id } },
      relations: { user: true },
    });

    if (existing) return;

    await this.clientsRepo.save(
      this.clientsRepo.create({
        user,
        plan: seed.plan,
        creditsRemaining: seed.creditsRemaining,
        birthDate: new Date(seed.birthDate),
        anamnesis: seed.anamnesis,
        emergencyContact: seed.emergencyContact ?? null,
      }),
    );
  }

  private async ensureProfessional(seed: ProfessionalSeed): Promise<void> {
    const user = await this.findOrCreateUser({
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      role: UserRole.PROFESSIONAL,
    });

    const existing = await this.professionalsRepo.findOne({
      where: { user: { id: user.id } },
      relations: { user: true },
    });

    if (existing) return;

    await this.professionalsRepo.save(
      this.professionalsRepo.create({
        user,
        specialty: seed.specialty,
        bio: seed.bio,
      }),
    );
  }

  private async findOrCreateUser(seed: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
  }): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email: seed.email }, withDeleted: true });

    if (existing) {
      if (existing.deletedAt) {
        await this.usersRepo.recover(existing);
      }

      existing.name = seed.name;
      existing.phone = seed.phone;
      existing.role = seed.role;
      existing.isActive = true;
      return this.usersRepo.save(existing);
    }

    return this.usersRepo.save(
      this.usersRepo.create({
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash: await bcrypt.hash(this.demoPassword, 10),
        role: seed.role,
        isActive: true,
      }),
    );
  }
}
