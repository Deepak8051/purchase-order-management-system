
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'ABC Technologies',
    description: 'Organization name',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiProperty({
    example: 'ABC001',
    description: 'Unique organization code',
    minLength: 2,
    maxLength: 30,
  })
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the organization is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
