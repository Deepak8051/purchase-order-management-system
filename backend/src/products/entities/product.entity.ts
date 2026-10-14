import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('PRODUCTS')
@Index('IDX_PRODUCTS_ORG_SKU', ['organizationId', 'sku'], {
  unique: true,
})
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'NAME', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'SKU', type: 'varchar', length: 50 })
  sku: string;

  @Column({ name: 'DESCRIPTION', type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'UNIT_PRICE',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  unitPrice: string;

  @Column({ name: 'UNIT', type: 'varchar', length: 20, default: 'PCS' })
  unit: string;

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

  @Column({ name: 'IS_ACTIVE', type: 'boolean', default: true })
  isActive: boolean;
}
