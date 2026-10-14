import {
  Body,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  ForbiddenException,
  Controller,
  UseGuards,
  Get,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request } from 'express';

import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role: UserRole;
    organizationId: number | null;
  };
};

const ADMIN_ROLES = [
  UserRole.HQ_SUPER_ADMIN,
  UserRole.OUTLET_SUPER_ADMIN,
  UserRole.ORG_ADMIN,
];

@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(...ADMIN_ROLES)
  async findAll(@Req() req: AuthenticatedRequest) {
    const users = await this.usersService.findAll();

    // Non-HQ admins can only see users in their own organization.
    if (req.user.role === UserRole.HQ_SUPER_ADMIN) {
      return users;
    }

    return users.filter(
      (user) => user.organizationId === req.user.organizationId,
    );
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  async create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    // Only HQ Super Admin can create other administrator accounts.
    if (
      dto.role !== UserRole.USER &&
      req.user.role !== UserRole.HQ_SUPER_ADMIN
    ) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException(
        'Only HQ Super Admin can create administrator accounts',
      );
    }

    // Organization admins cannot create users outside their organization.
    if (req.user.role !== UserRole.HQ_SUPER_ADMIN) {
      if (
        !req.user.organizationId ||
        dto.organizationId !== req.user.organizationId
      ) {
        const { ForbiddenException } = await import('@nestjs/common');
        throw new ForbiddenException(
          'You can only create users within your own organization',
        );
      }
    }

    return this.usersService.create(dto);
  }
  @Patch('change-password')
  async changeMyPassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const target = await this.usersService.findById(id);

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (
      req.user.role !== UserRole.HQ_SUPER_ADMIN &&
      target.organizationId !== req.user.organizationId
    ) {
      throw new ForbiddenException(
        'You cannot update users outside your organization',
      );
    }

    // Only HQ super admins may grant or change privileged roles.
    if (
      dto.role !== undefined &&
      dto.role !== UserRole.USER &&
      req.user.role !== UserRole.HQ_SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HQ super admins can assign admin roles',
      );
    }

    if (
      req.user.role !== UserRole.HQ_SUPER_ADMIN &&
      dto.organizationId !== undefined &&
      dto.organizationId !== req.user.organizationId
    ) {
      throw new ForbiddenException(
        'You cannot move users to another organization',
      );
    }

    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/status')
  @Roles(...ADMIN_ROLES)
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const target = await this.usersService.findById(id);

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (
      req.user.role !== UserRole.HQ_SUPER_ADMIN &&
      target.organizationId !== req.user.organizationId
    ) {
      throw new ForbiddenException(
        'You cannot change users outside your organization',
      );
    }

    if (target.id === req.user.id && dto.isActive === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (
      target.role === UserRole.HQ_SUPER_ADMIN &&
      req.user.role !== UserRole.HQ_SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HQ super admins can change this account',
      );
    }

    return this.usersService.updateStatus(id, dto.isActive);
  }
}
