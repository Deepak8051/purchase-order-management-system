import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseOrderItemDto } from './purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 1, description: 'Existing supplier ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId: number;

  @ApiProperty({ example: '2026-10-14' })
  @IsDateString()
  orderDate: string;

  @ApiPropertyOptional({ example: '2026-11-14' })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'Deliver during business hours' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    type: [CreatePurchaseOrderItemDto],
    example: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 5 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Required for HQ_SUPER_ADMIN; ignored for ORG_ADMIN.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId?: number;
}
