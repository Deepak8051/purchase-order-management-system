import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from '../products/entities/product.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

type CurrentUser = {
  id: number;
  role: UserRole;
  organizationId: number | null;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository: Repository<PurchaseOrder>,
    private readonly dataSource: DataSource,
  ) {}

  private getOrganizationId(user: CurrentUser): number | null {
    if (user.role === UserRole.SUPER_ADMIN) return null;

    if (user.organizationId == null) {
      throw new ForbiddenException('Your account has no organization.');
    }

    return user.organizationId;
  }

  private async generateOrderNumber(
    organizationId: number,
    manager: import('typeorm').EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    // Serialize order-number generation for this organization and year.
    await manager.query(
      'SELECT ID FROM ORGANIZATIONS WHERE ID = ? FOR UPDATE',
      [organizationId],
    );

    const latest = await manager
      .getRepository(PurchaseOrder)
      .createQueryBuilder('po')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.id', 'DESC')
      .getOne();

    const nextNumber = latest
      ? Number(latest.orderNumber.split('-').pop()) + 1
      : 1;

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  async create(dto: CreatePurchaseOrderDto, user: CurrentUser) {
    const organizationId =
      user.role === UserRole.SUPER_ADMIN
        ? this.getSuperAdminOrganizationId(dto, user)
        : this.getOrganizationId(user);

    if (organizationId == null) {
      throw new BadRequestException(
        'An organization must be specified for this purchase order.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.getRepository(Supplier).findOne({
        where: { id: dto.supplierId, organizationId, isActive: true },
      });

      if (!supplier) {
        throw new BadRequestException(
          'Supplier not found, inactive, or not part of this organization.',
        );
      }

      const productIds = [...new Set(dto.items.map((item) => item.productId))];

      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .andWhere('product.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('product.isActive = :isActive', { isActive: true })
        .getMany();

      if (products.length !== productIds.length) {
        throw new BadRequestException(
          'One or more products are missing, inactive, or belong to another organization.',
        );
      }

      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      const orderItems = dto.items.map((item) => {
        const product = productsById.get(item.productId)!;
        const unitPrice = Number(product.unitPrice);
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

        return manager.getRepository(PurchaseOrderItem).create({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
      });

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      const orderNumber = await this.generateOrderNumber(
        organizationId,
        manager,
      );

      const order = manager.getRepository(PurchaseOrder).create({
        orderNumber,
        orderDate: dto.orderDate,
        expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
        notes: dto.notes ?? null,
        status: PurchaseOrderStatus.DRAFT,
        totalAmount: totalAmount.toFixed(2),
        organizationId,
        supplierId: supplier.id,
        items: orderItems,
      });

      try {
        const saved = await manager.getRepository(PurchaseOrder).save(order);
        return manager.getRepository(PurchaseOrder).findOne({
          where: { id: saved.id },
          relations: { supplier: true, items: { product: true } },
        });
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ER_DUP_ENTRY'
        ) {
          throw new ConflictException(
            'Order number already exists. Please retry.',
          );
        }
        throw error;
      }
    });
  }

  private getSuperAdminOrganizationId(
    dto: CreatePurchaseOrderDto,
    user: CurrentUser,
  ): number | null {
    // A SUPER_ADMIN has no default organization. Use the configured
    // organization ID on the DTO if supplied by the controller.
    const organizationId = (
      dto as CreatePurchaseOrderDto & {
        organizationId?: number;
      }
    ).organizationId;

    if (!organizationId) {
      throw new BadRequestException(
        'SUPER_ADMIN must provide an organizationId.',
      );
    }

    return organizationId;
  }

  async findAll(user: CurrentUser) {
    const organizationId = this.getOrganizationId(user);
    const query = this.orderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('po.createdAt', 'DESC');

    if (organizationId !== null) {
      query.where('po.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async findOne(id: number, user: CurrentUser) {
    const organizationId = this.getOrganizationId(user);
    const query = this.orderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('po.id = :id', { id });

    if (organizationId !== null) {
      query.andWhere('po.organizationId = :organizationId', {
        organizationId,
      });
    }

    const order = await query.getOne();
    if (!order) throw new NotFoundException('Purchase order not found.');

    return order;
  }

  async update(id: number, dto: UpdatePurchaseOrderDto, user: CurrentUser) {
    const order = await this.findOne(id, user);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase orders can be updated.',
      );
    }

    if (dto.expectedDeliveryDate !== undefined) {
      order.expectedDeliveryDate = dto.expectedDeliveryDate;
    }

    if (dto.notes !== undefined) order.notes = dto.notes;

    return this.orderRepository.save(order);
  }

  async changeStatus(
    id: number,
    status: PurchaseOrderStatus,
    user: CurrentUser,
  ) {
    const order = await this.findOne(id, user);

    const allowedTransitions: Record<
      PurchaseOrderStatus,
      PurchaseOrderStatus[]
    > = {
      [PurchaseOrderStatus.DRAFT]: [
        PurchaseOrderStatus.SUBMITTED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.SUBMITTED]: [
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.REJECTED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.APPROVED]: [],
      [PurchaseOrderStatus.REJECTED]: [],
      [PurchaseOrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[order.status].includes(status)) {
      throw new BadRequestException(
        `Cannot change status from ${order.status} to ${status}.`,
      );
    }

    order.status = status;
    return this.orderRepository.save(order);
  }

  async remove(id: number, user: CurrentUser) {
    const order = await this.findOne(id, user);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase orders can be deleted.',
      );
    }

    await this.orderRepository.remove(order);
    return { message: 'Purchase order deleted successfully.' };
  }
}
