import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Get,
  Query,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization name or code already exists',
  })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated organizations retrieved successfully',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ) {
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Page must be at least 1 and limit must be between 1 and 100',
      );
    }
    return this.organizationsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.findOne(id);
  }
}
