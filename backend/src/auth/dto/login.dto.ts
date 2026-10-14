import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Registered user email address',
  })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({
    example: 'DemoPassword123!',
    description: 'User password',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
