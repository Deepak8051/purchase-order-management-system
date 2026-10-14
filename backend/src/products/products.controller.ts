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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ProductsService } from './products.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/product.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    organizationId: number | null;
  };
}

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto, @Req() req: AuthenticatedRequest) {
    return this.productsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List products accessible to the user' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('city') city?: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.productsService.findAll(
      req.user,
      city,
      outletId === undefined || outletId.trim() === ''
        ? undefined
        : Number(outletId),
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.remove(id, req.user);
  }
}
