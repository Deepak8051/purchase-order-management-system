import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'LAP-001' })
  @IsString()
  @MaxLength(50)
  sku: string;

  @ApiPropertyOptional({ example: 'Business laptop, 16GB RAM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 55000.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;

  @ApiPropertyOptional({ example: 'PCS' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Required for SUPER_ADMIN; ignored for ORG_ADMIN.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  organizationId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
