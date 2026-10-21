import { readFileSync } from 'node:fs';

describe('Document definition duplicate and safe delete', () => {
  const controller = readFileSync('src/document-definitions/document-definitions.controller.ts', 'utf8');
  const service = readFileSync('src/document-definitions/document-definitions.service.ts', 'utf8');

  it('protects duplicate with create and delete with update', () => {
    expect(controller).toContain("@Post(':id/duplicate') @RequirePermissions('document-definitions.create')");
    expect(controller).toContain("@Delete(':id') @RequirePermissions('document-definitions.update')");
    expect(controller).toContain('getSecurityAuditActorUserId(request)');
  });

  it('duplicates as inactive with an independent draft in one transaction', () => {
    for (const token of ['duplicate(id: number', 'this.dataSource.transaction', "setLock('pessimistic_write')", 'isActive: false', 'structuredClone(sourceDraft.documentJson)', 'document.definition.duplicated']) expect(service).toContain(token);
  });

  it('uses a deterministic unique localized copy name', () => {
    for (const token of ['nextCopyName', "'Copia de ' + sourceName", 'DOCUMENT_DEFINITION_COPY_NAME_UNAVAILABLE', 'LOWER(TRIM(definition.name))']) expect(service).toContain(token);
  });

  it('deletes only inactive definitions and removes the draft first', () => {
    const method = service.slice(service.indexOf('delete(id: number'), service.indexOf('/** Activates one definition'));
    for (const token of ['DOCUMENT_DEFINITION_ACTIVE_CANNOT_BE_DELETED', 'drafts.delete({ documentId: id })', 'repository.remove(definition)', 'document.definition.deleted']) expect(method).toContain(token);
    expect(method.indexOf('drafts.delete')).toBeLessThan(method.indexOf('repository.remove'));
    expect(method.indexOf('repository.remove')).toBeLessThan(method.indexOf("document.definition.deleted"));
  });
});
