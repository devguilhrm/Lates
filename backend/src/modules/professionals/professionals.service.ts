import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Availability, Professional, User } from '../../database/entities';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { ListProfessionalsQueryDto } from './dto/list-professionals-query.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalsRepo: Repository<Professional>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Availability)
    private readonly availabilityRepo: Repository<Availability>,
  ) {}

  async create(dto: CreateProfessionalDto): Promise<Professional> {
    await this.ensureEmailAvailable(dto.email);

    const user = await this.usersRepo.save(this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: UserRole.PROFESSIONAL,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
    }));

    const professional = this.professionalsRepo.create({
      user,
      specialty: dto.specialty,
      bio: dto.bio,
    });

    return this.professionalsRepo.save(professional);
  }

  async findAll(query: ListProfessionalsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.specialty ? { specialty: ILike(`%${query.specialty}%`) } : {}),
      ...(query.search ? { user: { name: ILike(`%${query.search}%`) } } : {}),
    };

    const [items, total] = await this.professionalsRepo.findAndCount({
      where,
      relations: { user: true, availabilities: true },
      order: { user: { name: 'ASC' } },
      skip,
      take: limit,
    });

    return { items, meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<Professional> {
    const professional = await this.professionalsRepo.findOne({
      where: { id },
      relations: { user: true, availabilities: true },
    });

    if (!professional) throw new NotFoundException('Profissional não encontrado.');
    return professional;
  }

  async update(id: string, dto: UpdateProfessionalDto): Promise<Professional> {
    const professional = await this.findOne(id);

    if (dto.email && dto.email !== professional.user.email) {
      await this.ensureEmailAvailable(dto.email);
      professional.user.email = dto.email;
    }

    if (dto.name !== undefined) professional.user.name = dto.name;
    if (dto.phone !== undefined) professional.user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) professional.user.avatarUrl = dto.avatarUrl;
    if (dto.isActive !== undefined) professional.user.isActive = dto.isActive;
    if (dto.password) professional.user.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.specialty !== undefined) professional.specialty = dto.specialty;
    if (dto.bio !== undefined) professional.bio = dto.bio;

    await this.usersRepo.save(professional.user);
    return this.professionalsRepo.save(professional);
  }

  async remove(id: string): Promise<void> {
    const professional = await this.findOne(id);
    professional.user.isActive = false;
    await this.usersRepo.save(professional.user);
    await this.usersRepo.softDelete(professional.user.id);
  }

  async replaceAvailability(id: string, dto: UpsertAvailabilityDto[]): Promise<Availability[]> {
    const professional = await this.findOne(id);

    dto.forEach((availability) => {
      if (availability.endTime <= availability.startTime) {
        throw new BadRequestException('Horário final deve ser maior que o horário inicial.');
      }
    });

    await this.availabilityRepo.delete({ professional: { id } });

    const availabilities = dto.map((availability) =>
      this.availabilityRepo.create({ ...availability, professional }),
    );

    return this.availabilityRepo.save(availabilities);
  }

  async findAvailability(id: string): Promise<Availability[]> {
    await this.findOne(id);
    return this.availabilityRepo.find({
      where: { professional: { id } },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const exists = await this.usersRepo.exists({ where: { email } });
    if (exists) throw new ConflictException('E-mail já cadastrado.');
  }
}
