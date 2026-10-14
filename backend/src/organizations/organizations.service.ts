import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/organization.dto';

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

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [organizations, total] =
      await this.organizationRepository.findAndCount({
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
}
