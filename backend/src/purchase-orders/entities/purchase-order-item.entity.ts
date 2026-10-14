import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('PURCHASE_ORDER_ITEMS')
export class PurchaseOrderItem extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'PURCHASE_ORDER_ID', type: 'int' })
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrder, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'PURCHASE_ORDER_ID',
    referencedColumnName: 'id',
  })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'PRODUCT_ID', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'PRODUCT_ID',
    referencedColumnName: 'id',
  })
  product: Product;

  @Column({ name: 'QUANTITY', type: 'int' })
  quantity: number;

  @Column({
    name: 'UNIT_PRICE',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  unitPrice: string;

  @Column({
    name: 'LINE_TOTAL',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  lineTotal: string;
}
