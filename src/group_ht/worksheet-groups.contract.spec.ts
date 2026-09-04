const { readFileSync } = require('fs');

describe('Worksheet groups hardened contract', () => {
  const read = (relative: string): string =>
    readFileSync(`${process.cwd()}/src/${relative}`, 'utf8');
  const groupController = read('group_ht/group_ht.controller.ts');
  const groupService = read('group_ht/group_ht.service.ts');
  const itemController = read('group_ht_items/group_ht_items.controller.ts');
  const itemService = read('group_ht_items/group_h_itemst.service.ts');

  it('protege todas las rutas legacy con permisos explicitos', () => {
    for (const code of [
      'worksheet-groups.read',
      'worksheet-groups.create',
      'worksheet-groups.update',
      'worksheet-groups.change-status',
      'worksheet-groups.delete',
      'worksheet-group-items.read',
      'worksheet-group-items.create',
      'worksheet-group-items.update',
      'worksheet-group-items.delete',
    ])
      expect(groupController + itemController).toContain(code);
    expect(groupController).toContain("@Controller('groupHt')");
    expect(itemController).toContain("@Controller('groupHtItems')");
  });

  it('protege relaciones, alias legacy y eliminacion', () => {
    expect(groupService).toContain('WORKSHEET_GROUP_HAS_ITEMS');
    expect(groupService).not.toContain("onDelete: 'CASCADE'");
    expect(itemService).toContain('WORKSHEET_GROUP_ITEM_GROUP_ALIAS_CONFLICT');
    expect(itemService).toContain("'gruopHtId'");
    expect(itemService).toContain('WORKSHEET_GROUP_ITEM_ALREADY_EXISTS');
    expect(itemService).toContain('WORKSHEET_GROUP_ITEM_EXAM_NOT_FOUND');
  });

  it('mantiene escrituras transaccionales y auditadas', () => {
    for (const source of [groupService, itemService]) {
      expect(source).toContain('dataSource!.transaction');
      expect(source).toContain('audit!.write');
      expect(source).toContain('actorUserId');
    }
  });
});
