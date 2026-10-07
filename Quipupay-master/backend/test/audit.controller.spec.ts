import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AuditController } from '../src/audit/audit.controller';
import { AuditPermissionsGuard } from '../src/audit/audit-permissions.guard';
import { REQUIRED_PERMISSION_METADATA } from '../src/audit/require-permission.decorator';
import type { AuditService } from '../src/audit/audit.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

function serviceDouble() {
  return {
    getAdminIdentity: jest.fn(),
    getSummary: jest.fn(),
    listEvents: jest.fn(),
    getEvent: jest.fn(),
    listUsers: jest.fn(),
    getUserActivity: jest.fn(),
  };
}

describe('AuditController', () => {
  it('protects every route with JWT and audit:read', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditController)).toBe('admin');
    expect(Reflect.getMetadata(GUARDS_METADATA, AuditController)).toEqual([
      JwtAuthGuard,
      AuditPermissionsGuard,
    ]);
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSION_METADATA, AuditController),
    ).toBe('audit:read');
  });

  it('exposes exactly the approved read route paths', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditController.prototype.me)).toBe(
      'me',
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, AuditController.prototype.summary),
    ).toBe('audit/summary');
    expect(
      Reflect.getMetadata(PATH_METADATA, AuditController.prototype.events),
    ).toBe('audit/events');
    expect(
      Reflect.getMetadata(PATH_METADATA, AuditController.prototype.event),
    ).toBe('audit/events/:source/:id');
    expect(
      Reflect.getMetadata(PATH_METADATA, AuditController.prototype.users),
    ).toBe('users');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AuditController.prototype.userActivity,
      ),
    ).toBe('users/:id/activity');
  });

  it('delegates identity, summary, event, user, and activity queries unchanged', async () => {
    const service = serviceDouble();
    const controller = new AuditController(service as unknown as AuditService);
    const identity = { id: 'user-1', permissions: ['audit:read'] };
    const summary = { totalEvents: 10 };
    const events = { items: [], nextCursor: null };
    const event = { id: 'event-1', source: 'audit' };
    const users = { items: [], nextCursor: null };
    const activity = { user: { id: 'user-2' }, activity: events };
    const range = {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-10T00:00:00.000Z',
    };
    const eventQuery = { limit: 25, result: 'FAILURE' };
    const userQuery = { limit: 25, query: 'Ada' };

    service.getAdminIdentity.mockResolvedValue(identity);
    service.getSummary.mockResolvedValue(summary);
    service.listEvents.mockResolvedValue(events);
    service.getEvent.mockResolvedValue(event);
    service.listUsers.mockResolvedValue(users);
    service.getUserActivity.mockResolvedValue(activity);

    await expect(
      controller.me({ id: 'user-1', dni: '12345678' }),
    ).resolves.toBe(identity);
    await expect(controller.summary(range)).resolves.toBe(summary);
    await expect(controller.events(eventQuery)).resolves.toBe(events);
    await expect(
      controller.event(
        'audit',
        '10000000-0000-4000-8000-000000000001',
      ),
    ).resolves.toBe(event);
    await expect(controller.users(userQuery)).resolves.toBe(users);
    await expect(
      controller.userActivity(
        '20000000-0000-4000-8000-000000000001',
        eventQuery,
      ),
    ).resolves.toBe(activity);

    expect(service.getAdminIdentity).toHaveBeenCalledWith('user-1');
    expect(service.getSummary).toHaveBeenCalledWith(range);
    expect(service.listEvents).toHaveBeenCalledWith(eventQuery);
    expect(service.getEvent).toHaveBeenCalledWith(
      'audit',
      '10000000-0000-4000-8000-000000000001',
    );
    expect(service.listUsers).toHaveBeenCalledWith(userQuery);
    expect(service.getUserActivity).toHaveBeenCalledWith(
      '20000000-0000-4000-8000-000000000001',
      eventQuery,
    );
  });
});
