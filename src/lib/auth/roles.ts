// Plain data, deliberately free of "server-only" so client components (the
// accounts panel's role selector) can import the list and labels.
export const USER_ROLES = ["admin", "advisor"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  advisor: "Conseiller",
};

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/** Minimum length for passwords set through the accounts page. Deliberately
 * modest for the test phase; the demo account's existing password is not
 * retroactively subject to it. */
export const MIN_PASSWORD_LENGTH = 8;
