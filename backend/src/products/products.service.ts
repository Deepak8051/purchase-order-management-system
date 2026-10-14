import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/product.dto';

type CurrentUser = {
  id: number;
  role: UserRole;
  organizationId: number | null;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private getOrganizationId(user: CurrentUser): number | null {
    if (user.role === UserRole.HQ_SUPER_ADMIN) return null;

    if (user.organizationId == null) {
      throw new ForbiddenException('Your account has no organization.');
    }

    return user.organizationId;
  }

  async create(dto: CreateProductDto, user: CurrentUser) {
    const organizationId =
      user.role === UserRole.HQ_SUPER_ADMIN
        ? dto.organizationId
        : this.getOrganizationId(user);

    if (organizationId == null) {
      throw new ForbiddenException(
        'HQ_SUPER_ADMIN must provide an organizationId.',
      );
    }

    const product = this.productRepository.create({
      name: dto.name.trim(),
      sku: dto.sku.trim(),
      description: dto.description ?? null,
      unitPrice: dto.unitPrice.toFixed(2),
      unit: dto.unit?.trim() || 'PCS',
      organizationId,
      isActive: dto.isActive ?? true,
    });

    try {
      return await this.productRepository.save(product);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'This SKU already exists in the organization.',
        );
      }
      throw error;
    }
  }

  async findAll(user: CurrentUser, city?: string, outletId?: number) {
    const organizationId = this.getOrganizationId(user);

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.organization', 'organization')
      .orderBy('product.createdAt', 'DESC');

    // Non-HQ users remain restricted to their assigned organization.
    if (organizationId !== null) {
      query.andWhere('product.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Filter by city when provided.
    if (city?.trim()) {
      query.andWhere('organization.city = :city', {
        city: city.trim(),
      });
    }

    // Filter by a specific outlet when provided.
    if (outletId !== undefined) {
      if (!Number.isInteger(outletId) || outletId <= 0) {
        throw new BadRequestException('outletId must be a positive integer.');
      }

      query.andWhere('product.organizationId = :outletId', {
        outletId,
      });
    }

    return query.getMany();
  }

  async findOne(id: number, user: CurrentUser) {
    const organizationId = this.getOrganizationId(user);

    const query = this.productRepository
      .createQueryBuilder('product')
      .where('product.id = :id', { id });

    if (organizationId !== null) {
      query.andWhere('product.organizationId = :organizationId', {
        organizationId,
      });
    }

    const product = await query.getOne();

    if (!product) throw new NotFoundException('Product not found.');

    return product;
  }

  async update(id: number, dto: UpdateProductDto, user: CurrentUser) {
    const product = await this.findOne(id, user);

    if (
      dto.organizationId !== undefined &&
      dto.organizationId !== product.organizationId
    ) {
      throw new ForbiddenException(
        'Changing a product organization is not allowed.',
      );
    }

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.sku !== undefined) product.sku = dto.sku.trim();
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.unitPrice !== undefined)
      product.unitPrice = dto.unitPrice.toFixed(2);
    if (dto.unit !== undefined) product.unit = dto.unit.trim();
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    try {
      return await this.productRepository.save(product);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'This SKU already exists in the organization.',
        );
      }
      throw error;
    }
  }

  async remove(id: number, user: CurrentUser) {
    const product = await this.findOne(id, user);
    await this.productRepository.remove(product);

    return { message: 'Product deleted successfully.' };
  }
}
