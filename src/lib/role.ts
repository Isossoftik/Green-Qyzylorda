import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { roles } from "./workflow";
export async function demoRole(): Promise<Role> {
  const value = (await cookies()).get("demo-role")?.value;
  return value && Object.hasOwn(roles, value) ? (value as Role) : "RESIDENT";
}
