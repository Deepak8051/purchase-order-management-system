import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('PURCHASE_ORDERS')
@Index('IDX_PO_ORG_NUMBER', ['organizationId', 'orderNumber'], {
  unique: true,
})
export class PurchaseOrder extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'ORDER_NUMBER', type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({
    name: 'ORDER_DATE',
    type: 'date',
  })
  orderDate: string;

  @Column({
    name: 'EXPECTED_DELIVERY_DATE',
    type: 'date',
    nullable: true,
  })
  expectedDeliveryDate: string | null;

  @Column({
    name: 'STATUS',
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({
    name: 'TOTAL_AMOUNT',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalAmount: string;

  @Column({ name: 'NOTES', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'ORGANIZATION_ID', type: 'int' })
  organizationId: number;

  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'ORGANIZATION_ID',
    referencedColumnName: 'id',
  })
  organization: Organization;

  @Column({ name: 'SUPPLIER_ID', type: 'int' })
  supplierId: number;

  @ManyToOne(() => Supplier, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'SUPPLIER_ID',
    referencedColumnName: 'id',
  })
  supplier: Supplier;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder)
  items: PurchaseOrderItem[];
}
