import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, FindOptionsWhere, Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async findAllCities(): Promise<string[]> {
    const results = await this.organizationRepository
      .createQueryBuilder('organization')
      .select('DISTINCT organization.city', 'city')
      .where('organization.city IS NOT NULL')
      .andWhere("TRIM(organization.city) <> ''")
      .andWhere('organization.isActive = :isActive', {
        isActive: true,
      })
      .orderBy('city', 'ASC')
      .getRawMany<{ city: string }>();

    return results.map((result) => result.city);
  }

  async findOutlets(city?: string): Promise<Organization[]> {
    const query = this.organizationRepository
      .createQueryBuilder('organization')
      .select([
        'organization.id',
        'organization.name',
        'organization.code',
        'organization.city',
      ])
      .where('organization.isActive = :isActive', {
        isActive: true,
      });

    if (city?.trim()) {
      query.andWhere('organization.city = :city', {
        city: city.trim(),
      });
    }

    return query.orderBy('organization.name', 'ASC').getMany();
  }

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

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    isActive?: boolean,
    city?: string,
    outletId?: number,
  ) {
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }

    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    if (
      outletId !== undefined &&
      (!Number.isInteger(outletId) || outletId <= 0)
    ) {
      throw new BadRequestException('Outlet ID must be a positive integer');
    }

    const query = this.organizationRepository
      .createQueryBuilder('organization')
      .orderBy('organization.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search?.trim()) {
      query.andWhere(
        '(organization.name LIKE :search OR organization.code LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    if (isActive !== undefined) {
      query.andWhere('organization.isActive = :isActive', {
        isActive,
      });
    }

    if (city?.trim()) {
      query.andWhere('organization.city = :city', {
        city: city.trim(),
      });
    }

    if (outletId !== undefined) {
      query.andWhere('organization.id = :outletId', {
        outletId,
      });
    }

    const [organizations, total] = await query.getManyAndCount();

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
