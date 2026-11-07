import { Router } from "express";
import { roleController } from "../controller/role.controller";
import { isAuthenticated, requireRole } from "../../../middlewares/auth.middleware";

const router = Router();

// Public / Authenticated user endpoint for client-side sidebar & action authorization
router.get("/roles/menus", (req, res, next) => roleController.getSidebarMenus(req, res, next));
router.get("/roles/me/permissions", isAuthenticated, (req, res, next) =>
  roleController.getMyPermissions(req, res, next)
);

// Super Admin Management Endpoints
router.get("/roles", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.getAllRoles(req, res, next)
);

router.get("/roles/:id", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.getRoleById(req, res, next)
);

router.post("/roles", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.createRole(req, res, next)
);

router.patch("/roles/:id", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.updateRole(req, res, next)
);

router.delete("/roles/:id", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.deleteRole(req, res, next)
);

router.put("/roles/:id/permissions", isAuthenticated, requireRole(["super_admin"]), (req, res, next) =>
  roleController.updatePermissions(req, res, next)
);

export const roleRoutes = router;
export default roleRoutes;
