import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Supplier } from './entities/supplier.entity';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateSupplierDto } from './dto/supplier.dto';

type CurrentUser = {
  id: number;
  role: UserRole;
  organizationId: number | null;
};

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  private getOrganizationId(user: CurrentUser): number | null {
    if (user.role === UserRole.HQ_SUPER_ADMIN) {
      return null;
    }

    if (user.organizationId == null) {
      throw new ForbiddenException('Your account has no organization.');
    }

    return user.organizationId;
  }

  async create(dto: CreateSupplierDto, user: CurrentUser) {
    const organizationId =
      user.role === UserRole.HQ_SUPER_ADMIN
        ? dto.organizationId
        : this.getOrganizationId(user);

    if (
      organizationId == null ||
      !Number.isInteger(organizationId) ||
      organizationId <= 0
    ) {
      throw new BadRequestException('A valid organizationId must be provided.');
    }

    try {
      const supplier = this.supplierRepository.create({
        name: dto.name.trim(),
        code: dto.code.trim(),
        contactPerson: dto.contactPerson ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        organizationId,
        isActive: dto.isActive ?? true,
      });

      return await this.supplierRepository.save(supplier);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'This supplier code already exists in the organization.',
        );
      }
      throw error;
    }
  }

  async findAll(user: CurrentUser, city?: string, outletId?: number) {
    const organizationId = this.getOrganizationId(user);

    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoin('supplier.organization', 'organization')
      .orderBy('supplier.createdAt', 'DESC');

    // Preserve existing organization-level access.
    if (organizationId !== null) {
      query.andWhere('supplier.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Filter suppliers by city.
    if (city?.trim()) {
      query.andWhere('organization.city = :city', {
        city: city.trim(),
      });
    }

    // Filter suppliers by outlet.
    if (outletId !== undefined) {
      if (!Number.isInteger(outletId) || outletId <= 0) {
        throw new BadRequestException('outletId must be a positive integer.');
      }

      query.andWhere('supplier.organizationId = :outletId', {
        outletId,
      });
    }

    return query.getMany();
  }

  async findOne(id: number, user: CurrentUser) {
    const organizationId = this.getOrganizationId(user);

    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.id = :id', { id });

    if (organizationId !== null) {
      query.andWhere('supplier.organizationId = :organizationId', {
        organizationId,
      });
    }

    const supplier = await query.getOne();

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto, user: CurrentUser) {
    const supplier = await this.findOne(id, user);

    if (
      dto.organizationId !== undefined &&
      dto.organizationId !== supplier.organizationId
    ) {
      throw new ForbiddenException(
        'Changing a supplier organization is not allowed.',
      );
    }

    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.code !== undefined) supplier.code = dto.code.trim();
    if (dto.contactPerson !== undefined)
      supplier.contactPerson = dto.contactPerson;
    if (dto.email !== undefined) supplier.email = dto.email;
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.address !== undefined) supplier.address = dto.address;
    if (dto.isActive !== undefined) supplier.isActive = dto.isActive;

    try {
      return await this.supplierRepository.save(supplier);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'This supplier code already exists in the organization.',
        );
      }
      throw error;
    }
  }

  async remove(id: number, user: CurrentUser) {
    const supplier = await this.findOne(id, user);
    await this.supplierRepository.remove(supplier);

    return { message: 'Supplier deleted successfully.' };
  }
}
