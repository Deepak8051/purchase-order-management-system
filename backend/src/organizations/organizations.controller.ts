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
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

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
  @ApiOperation({
    summary: 'Get organizations with search, filtering and pagination',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Page must be at least 1 and limit must be between 1 and 100',
      );
    }

    let activeFilter: boolean | undefined;
    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        throw new BadRequestException('isActive must be true or false');
      }
      activeFilter = isActive === 'true';
    }
    return this.organizationsService.findAll(page, limit, search, activeFilter);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization name or code already exists',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organization' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.remove(id);
  }
}
