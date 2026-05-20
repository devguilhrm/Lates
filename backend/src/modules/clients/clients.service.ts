import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Client, Scheduling, User } from '../../database/entities';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly planCredits = {
    MONTHLY: 12,
    ANNUAL: 144,
    QUARTERLY: 36,
    CREDIT_PACK: 10,
  } as const;

  constructor(
    @InjectRepository(Client)
    private readonly clientsRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Scheduling)
    private readonly schedulingsRepo: Repository<Scheduling>,
  ) {}

  async create(dto: CreateClientDto): Promise<Client> {
    await this.ensureEmailAvailable(dto.email);

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        name: dto.name,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: UserRole.CLIENT,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
      }),
    );

    const client = this.clientsRepo.create({
      user,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      anamnesis: dto.anamnesis,
      emergencyContact: dto.emergencyContact,
      plan: dto.plan,
      creditsRemaining: dto.creditsRemaining ?? this.defaultCreditsByPlan(dto.plan),
    });

    return this.clientsRepo.save(client);
  }

  async findAll(query: ListClientsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.email ? { user: { email: query.email } } : {}),
      ...(query.search ? { user: { name: ILike(`%${query.search}%`) } } : {}),
    };

    const [items, total] = await this.clientsRepo.findAndCount({
      where,
      relations: { user: true },
      order: { user: { name: 'ASC' } },
      skip,
      take: limit,
    });

    return { items, meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!client) throw new NotFoundException('Cliente nao encontrado.');
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    if (dto.email && dto.email !== client.user.email) {
      await this.ensureEmailAvailable(dto.email);
      client.user.email = dto.email;
    }

    if (dto.name !== undefined) client.user.name = dto.name;
    if (dto.phone !== undefined) client.user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) client.user.avatarUrl = dto.avatarUrl;
    if (dto.isActive !== undefined) client.user.isActive = dto.isActive;
    if (dto.password) client.user.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.birthDate !== undefined) client.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.anamnesis !== undefined) client.anamnesis = dto.anamnesis;
    if (dto.emergencyContact !== undefined) client.emergencyContact = dto.emergencyContact;

    if (dto.plan !== undefined) {
      client.plan = dto.plan;
      if (dto.creditsRemaining === undefined) {
        client.creditsRemaining = this.defaultCreditsByPlan(dto.plan);
      }
    }

    if (dto.creditsRemaining !== undefined) client.creditsRemaining = dto.creditsRemaining;

    await this.usersRepo.save(client.user);
    return this.clientsRepo.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    client.user.isActive = false;
    await this.usersRepo.save(client.user);
    await this.usersRepo.softDelete(client.user.id);
  }

  async findSchedulings(id: string): Promise<Scheduling[]> {
    await this.findOne(id);
    return this.schedulingsRepo.find({
      where: { client: { id } },
      relations: { client: { user: true }, professional: { user: true }, createdBy: true },
      order: { startAt: 'DESC' },
    });
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const exists = await this.usersRepo.exists({ where: { email } });
    if (exists) throw new ConflictException('E-mail ja cadastrado.');
  }

  private defaultCreditsByPlan(plan: Client['plan']): number {
    return this.planCredits[plan];
  }
}
