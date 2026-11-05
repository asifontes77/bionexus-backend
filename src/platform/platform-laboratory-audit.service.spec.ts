import { BadRequestException } from '@nestjs/common';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';

describe('PlatformLaboratoryAuditService', () => {
  it('stores the platform owner as actor without associating the event with a tenant user', async () => {
    const manager = { query: jest.fn().mockResolvedValue(undefined) };
    const service = new PlatformLaboratoryAuditService();

    await service.write(manager as never, {
      laboratoryId: 8,
      platformOwnerId: 70,
      action: 'platform.laboratory.lifecycle.updated',
      summary: 'Platform owner updated laboratory lifecycle',
      metadata: { subscriptionStatus: 'suspended' },
    });

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO platform_laboratory_audit_logs'),
      [8, 70, 'platform.laboratory.lifecycle.updated', 'Platform owner updated laboratory lifecycle', '{"subscriptionStatus":"suspended"}'],
    );
    expect(manager.query.mock.calls[0][0]).not.toContain('actor_user_id');
  });

  it('rejects invalid actor or laboratory identifiers without writing an event', async () => {
    const manager = { query: jest.fn() };
    const service = new PlatformLaboratoryAuditService();

    await expect(service.write(manager as never, {
      laboratoryId: 0,
      platformOwnerId: 70,
      action: 'platform.laboratory.deleted',
      summary: 'Platform owner deleted an empty Cloud laboratory',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled();
  });
});
