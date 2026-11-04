import { TenantCatalogPackageInstallerService } from './tenant-catalog-package-installer.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreatePlatformLaboratoryDto } from './dto/create-platform-laboratory.dto';
import { resolveGranularSeedPackages } from './seed-package-catalog';

@Injectable()
export class PlatformProvisioningService {
  constructor(private readonly dataSource: DataSource, private readonly tenantPackages: TenantCatalogPackageInstallerService) {}

  async provision(input: CreatePlatformLaboratoryDto, platformOwnerId: number) {
    if(!Number.isInteger(platformOwnerId)||platformOwnerId<=0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
    const dto=this.validate(input);
    return this.dataSource.transaction('SERIALIZABLE', async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [81426001]);
      await this.ensureAvailable(manager,dto);
      const laboratory=(await manager.query(`INSERT INTO laboratory (rif,name,business_name,address,phone_1,email,print_invoice,print_sample_take,invoice_number,voucher_number,creditnote_number,max_height_logo,max_width_logo,maximum_rows_report,rows_description_receipt,receipt_number,print_receipt) VALUES ($1,$2,$3,$4,$5,$6,false,false,0,0,0,170,170,38,10,0,false) RETURNING id,rif,name,business_name AS "businessName",address`,[dto.rif,dto.name,dto.businessName,dto.address,dto.phone||null,dto.email||null]))[0];
      const branch=(await manager.query(`INSERT INTO laboratory_branches (laboratory_id,code,name,address,phone,email,is_main,is_active,display_order) VALUES ($1,$2,$3,$4,$5,$6,true,true,0) RETURNING id,code,name`,[laboratory.id,dto.branchCode,dto.branchName,dto.address,dto.phone||null,dto.email||null]))[0];
      const installedCatalogPackages = await this.tenantPackages.installSelected(manager, Number(laboratory.id), dto.seedPackages, platformOwnerId);
      const currency=(await manager.query(`SELECT id FROM currencies WHERE laboratory_id=$1 AND upper(btrim(code))='VES' AND is_active=true ORDER BY id LIMIT 1`,[laboratory.id]))[0];
      if(!currency) throw new BadRequestException('PLATFORM_PROVISIONING_VES_CURRENCY_REQUIRED');
      await manager.query(`INSERT INTO application_settings (laboratory_id,financial_primary_currency_id,voucher_format,receipt_format,head_html,body_html,page_html,workshee_format,printer_type,printer_interface) VALUES ($1,$2,'','','','','','','','')`,[laboratory.id,currency.id]);
      const role=(await manager.query(`INSERT INTO security_roles (laboratory_id,code,name,description,is_system,is_active) VALUES ($1,'administrator','Administrador','Administrador inicial del laboratorio',true,true) RETURNING id`,[laboratory.id]))[0];
      await manager.query(`INSERT INTO security_role_permissions (laboratory_id,role_id,permission_id) SELECT $1,$2,p.id FROM security_permissions p WHERE p.is_active=true`,[laboratory.id,role.id]);
      const passwordHash=await bcrypt.hash(dto.administratorPassword,8);
      const user=(await manager.query(`INSERT INTO users (laboratory_id,password,name,user_name,telephone,email,roles,request_password,hide_user) VALUES ($1,$2,$3,$4,'',$5,'administrator',true,false) RETURNING id,name,user_name AS username`,[laboratory.id,passwordHash,dto.administratorName,dto.administratorUsername,dto.administratorEmail||null]))[0];
      await manager.query(`INSERT INTO security_user_roles (laboratory_id,user_id,role_id) VALUES ($1,$2,$3)`,[laboratory.id,user.id,role.id]);
      return { laboratory, mainBranch:branch, administrator:{id:user.id,name:user.name,username:user.username}, installedCatalogPackages };
    });
  }

  private async ensureAvailable(manager:EntityManager,dto:ReturnType<PlatformProvisioningService['validate']>) {
    const duplicate=(await manager.query(`SELECT EXISTS(SELECT 1 FROM laboratory WHERE upper(btrim(rif))=upper(btrim($1))) rif, EXISTS(SELECT 1 FROM users WHERE lower(btrim(user_name))=lower(btrim($2))) username`,[dto.rif,dto.administratorUsername]))[0];
    if(duplicate.rif) throw new ConflictException('PLATFORM_PROVISIONING_RIF_EXISTS');
    if(duplicate.username) throw new ConflictException('PLATFORM_PROVISIONING_USERNAME_EXISTS');
  }

  private validate(input:CreatePlatformLaboratoryDto) {
    const text=(value:unknown,max:number,code:string)=>{const normalized=typeof value==='string'?value.trim():'';if(!normalized||normalized.length>max)throw new BadRequestException(code);return normalized};
    const rif=text(input?.rif,20,'PLATFORM_PROVISIONING_RIF_REQUIRED').toUpperCase();
    if(!/^[VEJG]-?\d{7,9}-?\d$/i.test(rif)) throw new BadRequestException('PLATFORM_PROVISIONING_RIF_INVALID');
    const password=typeof input?.administratorPassword==='string'?input.administratorPassword:'';
    const passwordConfirmation=typeof input?.administratorPasswordConfirmation==='string'?input.administratorPasswordConfirmation:'';
    if(password!==passwordConfirmation) throw new BadRequestException('PLATFORM_PROVISIONING_PASSWORD_CONFIRMATION_MISMATCH');
    if(password.length<12||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!(/[^A-Za-z0-9]/.test(password))) throw new BadRequestException('PLATFORM_PROVISIONING_PASSWORD_INVALID');
    const requestedPackages = input.seedPackages ?? [];
    if (!Array.isArray(requestedPackages) || requestedPackages.some((value) => typeof value !== 'string')) throw new BadRequestException('PLATFORM_PROVISIONING_SEED_PACKAGES_INVALID');
    const seedPackages = resolveGranularSeedPackages(requestedPackages);
    return {rif,name:text(input.name,50,'PLATFORM_PROVISIONING_NAME_REQUIRED'),businessName:text(input.businessName,100,'PLATFORM_PROVISIONING_BUSINESS_NAME_REQUIRED'),address:text(input.address,200,'PLATFORM_PROVISIONING_ADDRESS_REQUIRED'),phone:typeof input.phone==='string'?input.phone.trim():'',email:typeof input.email==='string'?input.email.trim().toLowerCase():'',branchCode:text(input.branchCode,30,'PLATFORM_PROVISIONING_BRANCH_CODE_REQUIRED').toUpperCase(),branchName:text(input.branchName,100,'PLATFORM_PROVISIONING_BRANCH_NAME_REQUIRED'),administratorName:text(input.administratorName,100,'PLATFORM_PROVISIONING_ADMIN_NAME_REQUIRED'),administratorUsername:text(input.administratorUsername,100,'PLATFORM_PROVISIONING_ADMIN_USERNAME_REQUIRED').toLowerCase(),administratorEmail:typeof input.administratorEmail==='string'?input.administratorEmail.trim().toLowerCase():'',administratorPassword:password,administratorPasswordConfirmation:passwordConfirmation,seedPackages};
  }

}
