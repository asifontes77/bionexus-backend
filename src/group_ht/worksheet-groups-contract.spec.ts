import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Worksheet groups hardened contracts', () => {
  const root = __dirname;
  const groupController = readFileSync(join(root, 'group_ht.controller.ts'), 'utf8');
  const groupService = readFileSync(join(root, 'group_ht.service.ts'), 'utf8');
  const itemController = readFileSync(join(root, '../group_ht_items/group_ht_items.controller.ts'), 'utf8');
  const itemService = readFileSync(join(root, '../group_ht_items/group_h_itemst.service.ts'), 'utf8');
  const createItemDto = readFileSync(join(root, '../group_ht_items/dto/create-group_ht_items.dto.ts'), 'utf8');

  it('protege todos los endpoints con permisos granulares', () => {
    for (const permission of ['worksheet-groups.read', 'worksheet-groups.create', 'worksheet-groups.update', 'worksheet-groups.change-status', 'worksheet-groups.delete']) expect(groupController).toContain(permission);
    for (const permission of ['worksheet-group-items.read', 'worksheet-group-items.create', 'worksheet-group-items.update', 'worksheet-group-items.delete']) expect(itemController).toContain(permission);
  });

  it('separa dinamicamente update y change-status en el PATCH', () => {
    expect(groupController).toContain('AuthorizationService');
    expect(groupController).toContain("requiredPermissions.push('worksheet-groups.update')");
    expect(groupController).toContain("requiredPermissions.push('worksheet-groups.change-status')");
    expect(groupController).toContain('hasAllPermissions(actorUserId, requiredPermissions)');
    expect(groupController).not.toContain("@RequirePermissions('worksheet-groups.update', 'worksheet-groups.change-status')");
  });

  it('corrige el contrato groupHtId', () => {
    expect(createItemDto).toContain('groupHtId: number');
    expect(createItemDto).not.toContain('gruopHtId');
  });

  it('valida grupos, elementos, duplicados y grupos inactivos', () => {
    for (const token of ['WORKSHEET_GROUP_DESCRIPTION_REQUIRED', 'WORKSHEET_GROUP_DESCRIPTION_ALREADY_EXISTS', 'WORKSHEET_GROUP_HAS_ITEMS']) expect(groupService).toContain(token);
    for (const token of ['WORKSHEET_GROUP_ITEM_ALREADY_EXISTS', 'WORKSHEET_GROUP_ITEM_EXAM_NOT_FOUND', 'WORKSHEET_GROUP_INACTIVE']) expect(itemService).toContain(token);
  });
});

