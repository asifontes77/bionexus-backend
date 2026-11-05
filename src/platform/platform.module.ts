import { TenantCatalogPackageInstallerService } from './tenant-catalog-package-installer.service';
import { PlatformCatalogMaterializerService } from './platform-catalog-materializer.service';
import { PlatformCatalogReleaseController } from './platform-catalog-release.controller';
import { PlatformCatalogReleaseService } from './platform-catalog-release.service';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformController } from './platform.controller';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { PlatformLaboratoryAdminService } from './platform-laboratory-admin.service';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';
import { PlatformSubscriptionBillingService } from './platform-subscription-billing.service';
import { PlatformPaymentProofStorageService } from './platform-payment-proof-storage.service';
@Module({imports:[UsersModule],controllers: [PlatformAuthController,PlatformController,
    PlatformCatalogReleaseController
  ],providers: [PlatformOwnerGuard,PlatformProvisioningService,PlatformLaboratoryAdminService,
    PlatformLaboratoryAuditService,
    PlatformCatalogReleaseService,
    PlatformCatalogMaterializerService,
    TenantCatalogPackageInstallerService,
    PlatformSubscriptionBillingService,
    PlatformPaymentProofStorageService,
  ],
  exports: [PlatformCatalogReleaseService,
    PlatformCatalogMaterializerService,
    TenantCatalogPackageInstallerService
  ]})
export class PlatformModule {}
