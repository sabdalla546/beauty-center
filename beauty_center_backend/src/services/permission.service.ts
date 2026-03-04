// src/services/permissionService.ts
import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import { User } from "../models/user.model";

/**
 * Lightweight in-memory cache for user permissions/roles
 * Use only for single-instance dev or as a short-lived local cache.
 * In production prefer Redis (shared across processes).
 */
type CacheEntry = { value: string[]; expireAt: number };
const CACHE_TTL_MS = Number(
  process.env.PERMISSION_CACHE_TTL_MS || 1000 * 60 * 1,
); // 1 minute default
const userPermissionsCache = new Map<number, CacheEntry>();
const userRolesCache = new Map<number, CacheEntry>();

function now() {
  return Date.now();
}

function isExpired(e?: CacheEntry) {
  return !e || e.expireAt <= now();
}

/**
 * Return array of role names for a user.
 */
export async function getUserRoles(userId: number): Promise<string[]> {
  const cached = userRolesCache.get(userId);
  if (cached && !isExpired(cached)) return cached.value;

  // Query roles through association (User -> Roles)
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
  });

  // user?.roles may be undefined or an array of Role instances
  const roleNames: string[] =
    ((user as any)?.roles as Array<{ name?: string }>)?.map(
      (r) => r.name || "",
    ) || [];

  userRolesCache.set(userId, {
    value: roleNames,
    expireAt: now() + CACHE_TTL_MS,
  });
  return roleNames;
}

/**
 * Return array of permission names for a user (deduplicated).
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const cached = userPermissionsCache.get(userId);
  if (cached && !isExpired(cached)) return cached.value;

  // Query permissions by joining roles -> permissions
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: "roles",
        include: [
          { model: Permission, as: "permissions", attributes: ["name"] },
        ],
        attributes: ["id", "name"],
      },
    ],
  });

  const permsSet = new Set<string>();
  const roles = ((user as any)?.roles as Array<any>) || [];
  for (const r of roles) {
    const perms = (r.permissions as Array<{ name?: string }>) || [];
    for (const p of perms) {
      if (p && p.name) permsSet.add(p.name);
    }
  }
  const perms = Array.from(permsSet);

  userPermissionsCache.set(userId, {
    value: perms,
    expireAt: now() + CACHE_TTL_MS,
  });
  return perms;
}

/** Utility to check if a user has at least one role from an array */
export async function userHasAnyRole(userId: number, allowedRoles: string[]) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const roles = await getUserRoles(userId);
  return roles.some((r: string) => allowedRoles.includes(r));
}

/** Utility to check if user has a named permission */
export async function userHasPermission(
  userId: number,
  permissionName: string,
) {
  if (!permissionName) return true;
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionName);
}

/** Invalidate caches for a user when roles/permissions change */
export function invalidateUserCache(userId: number) {
  userPermissionsCache.delete(userId);
  userRolesCache.delete(userId);
}

/** Invalidate all caches (e.g., when roles/permissions globally change) */
export function invalidateAllCaches() {
  userPermissionsCache.clear();
  userRolesCache.clear();
}
