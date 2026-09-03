import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateRoutinesDto } from './dto/create-routines.dto';
import { UpdateRoutinesDto } from './dto/update-routines.dto';
import { RoutinesService } from './routines.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routineService: RoutinesService) {}

  @RequirePermissions('routines.read')
  @Get()
  getRoutinesList() { return this.routineService.getRoutinesList(); }

  @RequirePermissions('routines.read')
  @Get('count/:description')
  countWithLike(@Param('description') description: string) { return this.routineService.countWithLike(description); }

  @RequirePermissions('routines.read')
  @Get(':id')
  getRoutines(@Param('id', ParseIntPipe) id: number) { return this.routineService.getRoutines(id); }

  @RequirePermissions('routines.create')
  @Post()
  createRoutines(@Body() body: CreateRoutinesDto) { return this.routineService.createRoutines(body); }

  @RequirePermissions('routines.update')
  @Patch(':id')
  updateRoutines(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRoutinesDto) { return this.routineService.updateRoutines(id, body); }

  @RequirePermissions('routines.delete')
  @Delete(':id')
  deleteRoutines(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.routineService.deleteRoutines(id, getSecurityAuditActorUserId(request));
  }
}
