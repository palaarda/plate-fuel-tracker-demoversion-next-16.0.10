export const USER_ROLES = ["super_admin", "admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];
const ADMIN_ROLES: readonly UserRole[] = ["super_admin", "admin"];
export const isUserRole = (value: unknown): value is UserRole => typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
export const isAdminRole = (role: unknown): boolean => isUserRole(role) && ADMIN_ROLES.includes(role);
