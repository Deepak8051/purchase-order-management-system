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

export enum UserRole {
  HQ_HQ_SUPER_ADMIN = 'HQ_HQ_SUPER_ADMIN',
  OUTLET_HQ_SUPER_ADMIN = 'OUTLET_HQ_SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  USER = 'USER',
  HQ_SUPER_ADMIN = 'HQ_SUPER_ADMIN',
}

@Entity('USERS')
@Index('IDX_USERS_EMAIL', ['email'], { unique: true })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'NAME', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'EMAIL', type: 'varchar', length: 150 })
  email: string;

  @Column({
    name: 'PASSWORD_HASH',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({
    name: 'ROLE',
    type: 'enum',
    enum: UserRole,
    default: UserRole.ORG_ADMIN,
  })
  role: UserRole;

  @Column({
    name: 'ORGANIZATION_ID',
    type: 'int',
    nullable: true,
  })
  organizationId: number | null;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'ORGANIZATION_ID',
    referencedColumnName: 'id',
  })
  organization: Organization | null;

  @Column({
    name: 'IS_ACTIVE',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
