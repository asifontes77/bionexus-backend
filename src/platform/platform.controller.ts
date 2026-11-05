import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DataSource } from 'typeorm';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreatePlatformLaboratoryDto } from './dto/create-platform-laboratory.dto';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { PlatformLaboratoryAdminService } from './platform-laboratory-admin.service';
import { PlatformSubscriptionBillingService } from './platform-subscription-billing.service';
import { PaymentProofUpload } from './platform-payment-proof-storage.service';
@Controller('platform')
@UseGuards(JwtUserGuard, PlatformOwnerGuard)
export class PlatformController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly provisioning: PlatformProvisioningService,
    private readonly laboratoryAdmin: PlatformLaboratoryAdminService,
    private readonly subscriptionBilling: PlatformSubscriptionBillingService,
  ) {}
  @Get('me') me(@Req() request:{user?:unknown}){return request.user;}
  @Post('laboratories') createLaboratory(@Req() request:{user?:{id?:number;userId?:number;identityType?:string}},@Body() body:CreatePlatformLaboratoryDto){const platformOwnerId=Number(request.user?.userId ?? request.user?.id);if(!Number.isInteger(platformOwnerId)||platformOwnerId<=0)throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');return this.provisioning.provision(body,platformOwnerId);}
  @Get('laboratories') async laboratories(){return this.dataSource.query(`SELECT l.id,l.rif,l.name,l.business_name AS "businessName",l.address,(SELECT COUNT(*)::int FROM laboratory_branches b WHERE b.laboratory_id=l.id) AS "branchCount",(SELECT COUNT(*)::int FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount",(SELECT COUNT(*)::int FROM laboratory_catalog_packages cp WHERE cp.laboratory_id=l.id) AS "catalogPackageCount" FROM laboratory l ORDER BY upper(btrim(l.name)),l.id`);}

  @Get('plans')
  async listSubscriptionPlans(@Query('includeInactive') includeInactive?: string) {
    const includeAll = includeInactive == null || includeInactive === 'true';
    if (includeInactive != null && !['true', 'false'].includes(includeInactive)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_FILTER_INVALID');
    }
    return { plans: await this.subscriptionBilling.listPlans(includeAll) };
  }

  @Post('plans')
  async createSubscriptionPlan(
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return { plan: await this.subscriptionBilling.createPlan(body, this.ownerId(request)) };
  }

  @Patch('plans/:planId')
  async updateSubscriptionPlan(
    @Param('planId') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return { plan: await this.subscriptionBilling.updatePlan(this.parseId(id), body, this.ownerId(request)) };
  }

  @Get('laboratories/:laboratoryId/subscription')
  async getSubscription(@Param('laboratoryId') id: string) {
    return { subscription: await this.subscriptionBilling.getSubscription(this.parseId(id)) };
  }

  @Post('laboratories/:laboratoryId/subscription')
  assignSubscriptionPlan(
    @Param('laboratoryId') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.subscriptionBilling.assignPlan(this.parseId(id), body, this.ownerId(request));
  }

  @Patch('laboratories/:laboratoryId/subscription/status')
  changeSubscriptionStatus(
    @Param('laboratoryId') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.subscriptionBilling.changeStatus(this.parseId(id), body, this.ownerId(request));
  }

  @Get('laboratories/:laboratoryId/payments')
  async listSubscriptionPayments(@Param('laboratoryId') id: string) {
    return { payments: await this.subscriptionBilling.listPayments(this.parseId(id)) };
  }

  @Post('laboratories/:laboratoryId/payments')
  @UseInterceptors(FileInterceptor('proof', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      const accepted = (
        file.mimetype === 'image/png' && extension === 'png'
      ) || (
        file.mimetype === 'image/jpeg' && ['jpg', 'jpeg'].includes(extension ?? '')
      ) || (
        file.mimetype === 'image/webp' && extension === 'webp'
      ) || (
        file.mimetype === 'application/pdf' && extension === 'pdf'
      );
      if (!accepted) {
        callback(new BadRequestException('PLATFORM_PAYMENT_PROOF_TYPE_INVALID'), false);
        return;
      }
      callback(null, true);
    },
  }))
  recordSubscriptionPayment(
    @Param('laboratoryId') id: string,
    @Body() body: { payment?: unknown },
    @UploadedFile() proof: Express.Multer.File | undefined,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    if (typeof body?.payment !== 'string') throw new BadRequestException('PLATFORM_SUBSCRIPTION_PAYMENT_PAYLOAD_REQUIRED');
    let payment: Record<string, unknown>;
    try {
      payment = JSON.parse(body.payment) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_PAYMENT_PAYLOAD_INVALID');
    }
    if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_PAYMENT_PAYLOAD_INVALID');
    }
    const upload: PaymentProofUpload | undefined = proof
      ? { buffer: proof.buffer, originalname: proof.originalname, mimetype: proof.mimetype }
      : undefined;
    return this.subscriptionBilling.recordPayment(this.parseId(id), payment, this.ownerId(request), upload);
  }

  @Get('laboratories/:laboratoryId/payments/:paymentId/proof')
  async downloadSubscriptionPaymentProof(
    @Param('laboratoryId') laboratoryId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const file = await this.subscriptionBilling.downloadPaymentProof(this.parseId(laboratoryId), this.parseId(paymentId));
    const extension = file.contentType === 'application/pdf' ? 'pdf'
      : file.contentType === 'image/png' ? 'png'
        : file.contentType === 'image/webp' ? 'webp' : 'jpg';
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="payment-proof.${extension}"`,
    });
  }

  @Get('laboratories/:laboratoryId')
  getLaboratory(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.getLaboratory(this.parseId(id));
  }

  @Patch('laboratories/:laboratoryId')
  updateLaboratory(
    @Param('laboratoryId') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.updateLaboratory(this.parseId(id), body, this.ownerId(request));
  }

  @Get('laboratories/:laboratoryId/packages')
  listPackages(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.listPackages(this.parseId(id));
  }

  @Post('laboratories/:laboratoryId/packages')
  installPackage(
    @Param('laboratoryId') id: string,
    @Body() body: { packageCode?: string },
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.installPackage(this.parseId(id), body?.packageCode ?? '', this.ownerId(request));
  }

  @Delete('laboratories/:laboratoryId/packages/:packageCode')
  uninstallPackage(@Param('laboratoryId') id: string, @Param('packageCode') packageCode: string) {
    return this.laboratoryAdmin.uninstallPackage(this.parseId(id), packageCode);
  }

  @Get('laboratories/:laboratoryId/branches')
  listBranches(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.listBranches(this.parseId(id));
  }

  @Post('laboratories/:laboratoryId/branches')
  addBranch(@Param('laboratoryId') id: string, @Body() body: Record<string, unknown>) {
    return this.laboratoryAdmin.addBranch(this.parseId(id), body);
  }

  @Delete('laboratories/:laboratoryId/branches/:branchId')
  removeBranch(@Param('laboratoryId') id: string, @Param('branchId') branchId: string) {
    return this.laboratoryAdmin.removeBranch(this.parseId(id), this.parseId(branchId));
  }

  @Delete('laboratories/:laboratoryId')
  deleteLaboratory(
    @Param('laboratoryId') id: string,
    @Body() body: { password?: string },
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.deleteLaboratory(this.parseId(id), this.ownerId(request), body?.password ?? '');
  }

  private ownerId(request: { user?: { id?: number; userId?: number; identityType?: string } }) {
    if (request.user?.identityType !== 'platform-owner') throw new ForbiddenException('PLATFORM_OWNER_REQUIRED');
    const id = Number(request.user.userId ?? request.user.id);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
    return id;
  }

  private parseId(value: string) {
    if (!/^[1-9]\d*$/.test(value)) throw new BadRequestException('PLATFORM_LABORATORY_ID_INVALID');
    const id = Number(value);
    if (!Number.isSafeInteger(id)) throw new BadRequestException('PLATFORM_LABORATORY_ID_INVALID');
    return id;
  }
}
