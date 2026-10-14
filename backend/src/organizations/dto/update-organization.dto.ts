import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
