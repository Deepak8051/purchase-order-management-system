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

@Entity('SUPPLIERS')
@Index('IDX_SUPPLIERS_ORG_CODE', ['organizationId', 'code'], {
  unique: true,
})
export class Supplier extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'NAME', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'CODE', type: 'varchar', length: 50 })
  code: string;

  @Column({
    name: 'CONTACT_PERSON',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  contactPerson: string | null;

  @Column({ name: 'EMAIL', type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ name: 'PHONE', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'ADDRESS', type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'ORGANIZATION_ID', type: 'int' })
  organizationId: number;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'ORGANIZATION_ID',
    referencedColumnName: 'id',
  })
  organization: Organization;

  @Column({ name: 'IS_ACTIVE', type: 'boolean', default: true })
  isActive: boolean;
}
