import { z } from "zod";
import { SIDEBAR_MENUS } from "./role.constants";

export const roleCreateSchema = z.object({
  name: z.string().trim().min(1).max(100), description: z.string().nullable().optional(),
});
export const roleUpdateSchema = roleCreateSchema.partial();

export const rolePermissionsSchema = z.array(z.strictObject({
  menuKey: z.string().refine(key => SIDEBAR_MENUS.some(menu => menu.key === key), "Unknown menu"),
  canView: z.boolean(), canAdd: z.boolean(), canEdit: z.boolean(), canDelete: z.boolean(),
})).max(SIDEBAR_MENUS.length).refine(
  rows => new Set(rows.map(row => row.menuKey)).size === rows.length,
  "Duplicate menu",
);
