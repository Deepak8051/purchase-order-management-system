import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
  Req,
  Query,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { PurchaseOrderStatus } from './entities/purchase-order.entity';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    organizationId: number | null;
  };
}

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchaseOrdersService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.purchaseOrdersService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a purchase order by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchaseOrdersService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchaseOrdersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change purchase order status' })
  @ApiQuery({
    name: 'status',
    enum: PurchaseOrderStatus,
    required: true,
  })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status', new ParseEnumPipe(PurchaseOrderStatus))
    status: PurchaseOrderStatus,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchaseOrdersService.changeStatus(id, status, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase order' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchaseOrdersService.remove(id, req.user);
  }
}
