import { PlatformCatalogMaterializerService } from './platform-catalog-materializer.service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateCatalogReleaseDto } from './dto/catalog-release.dto';

@Injectable()
export class PlatformCatalogReleaseService {
  constructor(private readonly dataSource: DataSource, private readonly materializer: PlatformCatalogMaterializerService) {}

  async bootstrapInitialReleases(ownerId: number) {
    if (!Number.isInteger(ownerId) || ownerId <= 0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
    const root = resolve(process.cwd(), 'src/database/seed-data/releases/1.0.0');
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as {
      releaseVersion: string;
      minimumSchemaVersion: string;
      packages: Array<{ packageCode: string; file: string; checksum: string }>;
    };
    if (!Array.isArray(manifest.packages) || manifest.packages.length !== 6) {
      throw new BadRequestException('PLATFORM_CATALOG_INITIAL_MANIFEST_INVALID');
    }
    return this.dataSource.transaction(async manager => {
      const registered: Array<Record<string, unknown>> = [];
      for (const item of manifest.packages) {
        const document = JSON.parse(readFileSync(resolve(root, item.file), 'utf8')) as Record<string, unknown>;
        if (document.checksum !== item.checksum) throw new BadRequestException('PLATFORM_CATALOG_INITIAL_CHECKSUM_INVALID');
        const existing = await manager.query(
          `SELECT id,package_code AS "packageCode",version,status,checksum FROM platform_catalog_releases WHERE package_code=$1 AND version=$2 LIMIT 1`,
          [item.packageCode, manifest.releaseVersion],
        );
        if (existing[0]) {
          if (existing[0].checksum !== item.checksum) throw new ConflictException('PLATFORM_CATALOG_INITIAL_RELEASE_CONFLICT');
          await this.materializer.materializeGlobal(manager, { package_code: item.packageCode, snapshot_payload: document });
          registered.push(existing[0]);
          continue;
        }
        const { checksum, ...snapshotPayload } = document;
        await manager.query(`UPDATE platform_catalog_releases SET status='retired' WHERE package_code=$1 AND status='published'`, [item.packageCode]);
        const rows = await manager.query(
          `INSERT INTO platform_catalog_releases (package_code,version,status,checksum,minimum_schema_version,snapshot_payload,published_at,published_by,created_by) VALUES ($1,$2,'published',$3,$4,$5::jsonb,now(),$6,$6) RETURNING id,package_code AS "packageCode",version,status,checksum`,
          [item.packageCode, manifest.releaseVersion, item.checksum, manifest.minimumSchemaVersion, JSON.stringify(snapshotPayload), ownerId],
        );
        await this.materializer.materializeGlobal(manager, { package_code: item.packageCode, snapshot_payload: document });
        registered.push(rows[0]);
      }
      return { releaseVersion: manifest.releaseVersion, registered };
    });
  }

  async list() {
    return this.dataSource.query(`SELECT id,package_code AS "packageCode",version,status,checksum,minimum_schema_version AS "minimumSchemaVersion",published_at AS "publishedAt",created_at AS "createdAt" FROM platform_catalog_releases ORDER BY package_code,created_at DESC`);
  }

  async createDraft(input: CreateCatalogReleaseDto, ownerId: number) {
    const dto=this.normalize(input);
    try {
      const rows=await this.dataSource.query(`INSERT INTO platform_catalog_releases (package_code,version,status,checksum,minimum_schema_version,snapshot_payload,created_by) VALUES ($1,$2,'draft',$3,$4,$5::jsonb,$6) RETURNING id,package_code AS "packageCode",version,status,checksum`,[dto.packageCode,dto.version,dto.checksum,dto.minimumSchemaVersion,JSON.stringify(dto.snapshotPayload),ownerId]);
      return rows[0];
    } catch(error) {
      if(String(error).includes('UQ_platform_catalog_releases_package_version')) throw new ConflictException('PLATFORM_CATALOG_RELEASE_VERSION_EXISTS');
      throw error;
    }
  }

  async publish(releaseId: string, ownerId: number) {
    return this.dataSource.transaction(async manager => {
      const release=await this.lockRelease(manager,releaseId);
      if(release.status!=='draft') throw new ConflictException('PLATFORM_CATALOG_RELEASE_NOT_DRAFT');
      await manager.query(`UPDATE platform_catalog_releases SET status='retired' WHERE package_code=$1 AND status='published'`,[release.package_code]);
      const rows=await manager.query(`UPDATE platform_catalog_releases SET status='published',published_at=now(),published_by=$2 WHERE id=$1 RETURNING id,package_code AS "packageCode",version,status,checksum`,[releaseId,ownerId]);
      return rows[0];
    });
  }

  async retire(releaseId: string, reason: string, ownerId: number) {
    if(!String(reason||'').trim()) throw new BadRequestException('PLATFORM_CATALOG_RELEASE_RETIRE_REASON_REQUIRED');
    const rows=await this.dataSource.query(`UPDATE platform_catalog_releases SET status='retired' WHERE id=$1 AND status IN ('draft','published') RETURNING id,package_code AS "packageCode",version,status`,[releaseId]);
    if(!rows[0]) throw new NotFoundException('PLATFORM_CATALOG_RELEASE_NOT_FOUND');
    await this.dataSource.query(`INSERT INTO security_audit_logs (event_type,actor_user_id,details,created_at) VALUES ('platform.catalog.release.retired',$1,$2::jsonb,now())`,[ownerId,JSON.stringify({releaseId,reason:String(reason).trim()})]);
    return rows[0];
  }

  async getLatestCompatible(packageCode: string, schemaVersion: string, manager: EntityManager=this.dataSource.manager) {
    const rows=await manager.query(`SELECT id,package_code,version,checksum,minimum_schema_version,snapshot_payload FROM platform_catalog_releases WHERE package_code=$1 AND status='published' AND minimum_schema_version=$2 LIMIT 1`,[packageCode,schemaVersion]);
    if(!rows[0]) throw new NotFoundException('PLATFORM_CATALOG_RELEASE_COMPATIBLE_NOT_FOUND');
    return rows[0];
  }

  private async lockRelease(manager: EntityManager, releaseId: string) {
    const rows=await manager.query(`SELECT id,package_code,status FROM platform_catalog_releases WHERE id=$1 FOR UPDATE`,[releaseId]);
    if(!rows[0]) throw new NotFoundException('PLATFORM_CATALOG_RELEASE_NOT_FOUND');
    return rows[0];
  }

  private normalize(input: CreateCatalogReleaseDto) {
    const packageCode=String(input?.packageCode||'').trim().toLowerCase();
    const version=String(input?.version||'').trim();
    const minimumSchemaVersion=String(input?.minimumSchemaVersion||'').trim();
    const checksum=String(input?.checksum||'').trim().toUpperCase();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packageCode)) throw new BadRequestException('PLATFORM_CATALOG_PACKAGE_CODE_INVALID');
    if(!/^\d+\.\d+\.\d+$/.test(version)) throw new BadRequestException('PLATFORM_CATALOG_RELEASE_VERSION_INVALID');
    if(!minimumSchemaVersion) throw new BadRequestException('PLATFORM_CATALOG_SCHEMA_VERSION_REQUIRED');
    if(!/^[A-F0-9]{64}$/.test(checksum)) throw new BadRequestException('PLATFORM_CATALOG_RELEASE_CHECKSUM_INVALID');
    if(!input.snapshotPayload||typeof input.snapshotPayload!=='object'||Array.isArray(input.snapshotPayload)) throw new BadRequestException('PLATFORM_CATALOG_RELEASE_PAYLOAD_INVALID');
    return {packageCode,version,minimumSchemaVersion,checksum,snapshotPayload:input.snapshotPayload};
  }
}
