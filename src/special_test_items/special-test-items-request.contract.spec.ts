import { readFileSync } from 'node:fs';

describe('Special test item authenticated request contract', () => {
  const controller = readFileSync('src/special_test_items/special_test_items.controller.ts', 'utf8');

  it('injects the authenticated request in every write endpoint', () => {
    expect(controller).toContain('Req, UseGuards');
    expect(controller).toContain('createSpecialTestItems(@Req() request:');
    expect(controller).toContain('updateSpecialTestItems(@Req() request:');
    expect(controller).toContain('deleteTestItems(@Req() request:');
  });
});
