import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({
    name: 'CREATED_AT',
    type: 'datetime',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'UPDATED_AT',
    type: 'datetime',
  })
  updatedAt: Date;
}
