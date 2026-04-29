import { useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  UserRole,
  Permission,
  hasPermission,
  isRouteAllowed,
  getRoleDefinition,
  SENDER_ROLES,
  RECEIVER_ROLES,
} from './roles';

export function useRoleAccess() {
  const { userRole } = useAuth();

  const roleDefinition = useMemo(() =>
    userRole ? getRoleDefinition(userRole) : null,
  [userRole]);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!userRole) return false;
      return hasPermission(userRole, permission);
    },
    [userRole],
  );

  const canAccessRoute = useCallback(
    (route: string): boolean => {
      if (!userRole) return false;
      return isRouteAllowed(userRole, route);
    },
    [userRole],
  );

  const isSender        = useMemo(() => !!userRole && SENDER_ROLES.includes(userRole),   [userRole]);
  const isReceiver      = useMemo(() => !!userRole && RECEIVER_ROLES.includes(userRole), [userRole]);
  const isFinalReceiver = useMemo(() => userRole === UserRole.RECEIVER,                  [userRole]);
  const isMidChain      = useMemo(() => userRole === UserRole.CARRIER,                   [userRole]);
  const canCreateShipment = useMemo(() => userRole === UserRole.MANUFACTURER,            [userRole]);

  return {
    userRole,
    roleDefinition,
    canCreateShipment,
    can,
    canAccessRoute,
    isSender,
    isReceiver,
    isFinalReceiver,
    isMidChain,
    canViewAllShipments: can(Permission.VIEW_ALL_SHIPMENTS),
    canDeepAudit:        can(Permission.DEEP_AUDIT),
    canUploadDocuments:  can(Permission.UPLOAD_DOCUMENTS),
    canVerifyDocuments:  can(Permission.VERIFY_DOCUMENT_HASHES),
    canViewTemperature:  can(Permission.VIEW_TEMPERATURE_DATA),
    canContest:          can(Permission.CONTEST_HANDOFF),
    canFlagAnomaly:      can(Permission.FLAG_ANOMALY),
  };
}
