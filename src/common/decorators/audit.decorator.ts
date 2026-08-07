import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  module: string;
  action: string;
}

export const Audit = (module: string, action: string) =>
  SetMetadata(AUDIT_KEY, { module, action } as AuditMeta);
