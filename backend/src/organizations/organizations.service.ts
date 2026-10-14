import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/organization.dto';
import { Like, FindOptionsWhere } from 'typeorm';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const existing = await this.organizationRepository.findOne({
      where: [{ name: dto.name.trim() }, { code: dto.code.trim() }],
    });

    if (existing) {
      throw new ConflictException('Organization name or code already exists');
    }

    const organization = this.organizationRepository.create({
      name: dto.name.trim(),
      code: dto.code.trim(),
      isActive: dto.isActive ?? true,
    });

    return this.organizationRepository.save(organization);
  }

  async findAll(page = 1, limit = 10, search?: string, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Organization>[] = [];
    if (search?.trim()) {
      where.push(
        {
          name: Like(`%${search.trim()}%`),
          ...(isActive !== undefined && { isActive }),
        },
        {
          code: Like(`%${search.trim()}%`),
          ...(isActive !== undefined && { isActive }),
        },
      );
    } else if (isActive !== undefined) {
      where.push({ isActive });
    }
    const [organizations, total] =
      await this.organizationRepository.findAndCount({
        where: where.length ? where : undefined,
        order: { id: 'ASC' },
        skip,
        take: limit,
      });

    return {
      data: organizations,
      pagination: {
        totalRecords: total,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (dto.name !== undefined) {
      organization.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      organization.code = dto.code.trim();
    }

    if (dto.isActive !== undefined) {
      organization.isActive = dto.isActive;
    }

    try {
      return await this.organizationRepository.save(organization);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Organization name or code already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepository.remove(organization);

    return {
      message: `Organization with ID ${id} deleted successfully`,
    };
  }
}
