import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { PasswordRecoveryController } from './password-recovery.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, UsersController, PasswordRecoveryController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
