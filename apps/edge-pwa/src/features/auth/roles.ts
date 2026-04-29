// ─── Role Types ─────────────────────────────────────

export enum UserRole {
  MANUFACTURER = 'manufacturer',
  CARRIER      = 'carrier',
  RECEIVER     = 'receiver',
  REGULATOR    = 'regulator',
}

// ─── Permissions ─────────────────────────────────────

export enum Permission {
  CREATE_SHIPMENT         = 'create_shipment',
  VIEW_SHIPMENT           = 'view_shipment',
  INITIATE_HANDOFF        = 'initiate_handoff',
  ACCEPT_HANDOFF          = 'accept_handoff',
  CONTEST_HANDOFF         = 'contest_handoff',
  VIEW_TEMPERATURE_DATA   = 'view_temperature_data',
  VIEW_FRESHNESS_SCORE    = 'view_freshness_score',
  UPLOAD_DOCUMENTS        = 'upload_documents',
  VIEW_DOCUMENTS          = 'view_documents',
  VERIFY_DOCUMENT_HASHES  = 'verify_document_hashes',
  VIEW_ALL_SHIPMENTS      = 'view_all_shipments',
  DEEP_AUDIT              = 'deep_audit',
  FLAG_ANOMALY            = 'flag_anomaly',
  MANAGE_CARRIERS         = 'manage_carriers',
  VIEW_ANALYTICS          = 'view_analytics',
}

// ─── Role Definition ─────────────────────────────────

export interface RoleDefinition {
  role: UserRole;
  label: string;
  icon: string;
  color: string;
  description: string;
  permissions: Permission[];
  allowedRoutes: string[];
  homeRoute: string;
}

// ─── Role Configuration ──────────────────────────────

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [UserRole.MANUFACTURER]: {
    role: UserRole.MANUFACTURER,
    label: 'Manufacturer / Shipper',
    icon: '🏭',
    color: '#3B82F6',
    description: 'Create shipments, perform digital birth, initiate first handoff',
    homeRoute: '/manufacturer',
    allowedRoutes: ['/manufacturer', '/manufacturer/create-shipment', '/handoff/send/:id'],
    permissions: [
      Permission.CREATE_SHIPMENT,
      Permission.VIEW_SHIPMENT,
      Permission.INITIATE_HANDOFF,
      Permission.UPLOAD_DOCUMENTS,
      Permission.VIEW_DOCUMENTS,
      Permission.VIEW_FRESHNESS_SCORE,
      Permission.VIEW_ANALYTICS,
    ],
  },
  [UserRole.CARRIER]: {
    role: UserRole.CARRIER,
    label: 'Carrier / Transporter',
    icon: '🚛',
    color: '#F59E0B',
    description: 'Accept shipments, monitor temperature, hand off to next party',
    homeRoute: '/carrier',
    allowedRoutes: ['/carrier', '/handoff/receive/:id', '/handoff/send/:id', '/carrier/monitor/:id'],
    permissions: [
      Permission.VIEW_SHIPMENT,
      Permission.ACCEPT_HANDOFF,
      Permission.INITIATE_HANDOFF,
      Permission.CONTEST_HANDOFF,
      Permission.VIEW_TEMPERATURE_DATA,
      Permission.VIEW_FRESHNESS_SCORE,
      Permission.VERIFY_DOCUMENT_HASHES,
    ],
  },
  [UserRole.RECEIVER]: {
    role: UserRole.RECEIVER,
    label: 'Receiver / Warehouse',
    icon: '📦',
    color: '#10B981',
    description: 'Receive shipments, verify integrity, final delivery acceptance',
    homeRoute: '/receiver',
    allowedRoutes: ['/receiver', '/handoff/receive/:id', '/receiver/final-delivery/:id'],
    permissions: [
      Permission.VIEW_SHIPMENT,
      Permission.ACCEPT_HANDOFF,
      Permission.CONTEST_HANDOFF,
      Permission.VIEW_FRESHNESS_SCORE,
      Permission.VERIFY_DOCUMENT_HASHES,
    ],
  },
  [UserRole.REGULATOR]: {
    role: UserRole.REGULATOR,
    label: 'Regulator / Customs',
    icon: '⚖️',
    color: '#EF4444',
    description: 'Inspect compliance, perform deep audits, flag violations',
    homeRoute: '/regulator',
    allowedRoutes: ['/regulator', '/regulator/inspect/:id', '/regulator/deep-audit/:id'],
    permissions: [
      Permission.VIEW_ALL_SHIPMENTS,
      Permission.VIEW_SHIPMENT,
      Permission.VIEW_FRESHNESS_SCORE,
      Permission.VERIFY_DOCUMENT_HASHES,
      Permission.DEEP_AUDIT,
      Permission.FLAG_ANOMALY,
      Permission.VIEW_ANALYTICS,
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────

export function getRoleDefinition(role: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_DEFINITIONS[role].permissions.includes(permission);
}

export function isRouteAllowed(role: UserRole, route: string): boolean {
  return ROLE_DEFINITIONS[role].allowedRoutes.some((pattern) => {
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
    return regex.test(route);
  });
}

export const SENDER_ROLES: UserRole[] = [UserRole.MANUFACTURER, UserRole.CARRIER];
export const RECEIVER_ROLES: UserRole[] = [UserRole.CARRIER, UserRole.RECEIVER];
