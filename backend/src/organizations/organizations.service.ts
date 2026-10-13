
import {
  ConflictException,
  Injectable,
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

  async create(
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const existing = await this.organizationRepository.findOne({
      where: [
        { name: dto.name.trim() },
        { code: dto.code.trim() },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'Organization name or code already exists',
      );
    }

    const organization = this.organizationRepository.create({
      name: dto.name.trim(),
      code: dto.code.trim(),
      isActive: dto.isActive ?? true,
    });

    return this.organizationRepository.save(organization);
  }
  
async findAll(): Promise<Organization[]> {
  return this.organizationRepository.find({
    order: {
      id: 'ASC',
    },
  });
}

}
