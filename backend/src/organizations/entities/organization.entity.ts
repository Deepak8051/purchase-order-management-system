
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('ORGANIZATIONS')
export class Organization  extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({
    name: 'NAME',
    type: 'varchar',
    length: 150,
    unique: true,
  })
  name: string;

  @Column({
    name: 'CODE',
    type: 'varchar',
    length: 30,
    unique: true,
  })
  code: string;

  @Column({
    name: 'IS_ACTIVE',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
