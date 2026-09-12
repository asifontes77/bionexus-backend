import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { ClosePatientAdmissionDto } from './dto/close-patient-admission.dto';
import { PatientAdmissionCloseService } from './patient-admission-close.service';
@UseGuards(JwtUserGuard,PermissionGuard)
@Controller('patient-admissions')
export class PatientAdmissionCloseController {
  constructor(private readonly service:PatientAdmissionCloseService) {}
  @RequirePermissions('patient-admission.close')
  @Post('close')
  close(@Req() request:SecurityAuthenticatedRequest,@Body() body:ClosePatientAdmissionDto){return this.service.close(body,getSecurityAuditActorUserId(request)??0);}
}
