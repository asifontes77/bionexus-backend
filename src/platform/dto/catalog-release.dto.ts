export class CreateCatalogReleaseDto {
  packageCode: string;
  version: string;
  minimumSchemaVersion: string;
  checksum: string;
  snapshotPayload: Record<string, unknown>;
}

export class PublishCatalogReleaseDto {
  releaseId: string;
}

export class RetireCatalogReleaseDto {
  releaseId: string;
  reason: string;
}
