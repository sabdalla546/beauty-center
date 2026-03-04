import fs from "fs/promises";
import path from "path";
import { Op } from "sequelize";
import { connectDB, sequelize } from "../db";
import { Permission, Role, User } from "../models";
import { hashPassword } from "../utils/password";
import { withTransaction } from "../utils/transaction";

const ROUTES_DIR = path.resolve(__dirname, "..", "routes");
const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sabdalla546@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456789!";
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "System";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Admin";

const stripComments = (input: string) => {
  // Remove block comments and line comments to avoid false matches.
  let output = input.replace(/\/\*[\s\S]*?\*\//g, "");
  output = output.replace(/^\s*\/\/.*$/gm, "");
  return output;
};

const extractPermissions = (source: string) => {
  const cleaned = stripComments(source);
  const regex = /requirePermission\(\s*["'`]{1}([^"'`]+)["'`]{1}\s*\)/g;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  return results;
};

const listRouteFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRouteFiles(full)));
    } else if (entry.isFile() && full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
};

const collectPermissionsFromRoutes = async () => {
  const files = await listRouteFiles(ROUTES_DIR);
  const perms = new Set<string>();

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    for (const name of extractPermissions(content)) {
      perms.add(name.trim());
    }
  }

  return Array.from(perms).filter(Boolean).sort();
};

const seedPermissionsAndAdmin = async () => {
  await connectDB();
  await import("../models/index"); // ensure associations are registered

  const permissionNames = await collectPermissionsFromRoutes();

  await withTransaction(async (t) => {
    if (permissionNames.length > 0) {
      const existing = await Permission.findAll({
        where: { name: { [Op.in]: permissionNames } },
        transaction: t,
      });
      const existingNames = new Set(existing.map((p) => p.name));
      const missing = permissionNames.filter((n) => !existingNames.has(n));

      if (missing.length > 0) {
        await Permission.bulkCreate(
          missing.map((name) => ({ name })),
          { transaction: t },
        );
      }
    }

    const [adminRole] = await Role.findOrCreate({
      where: { name: ADMIN_ROLE_NAME },
      defaults: { description: "System administrator" },
      transaction: t,
    });

    const allPermissions = await Permission.findAll({ transaction: t });
    await (adminRole as any).setPermissions(allPermissions, {
      transaction: t,
    });

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const [adminUser, created] = await User.findOrCreate({
      where: { email: ADMIN_EMAIL },
      defaults: {
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        role: ADMIN_ROLE_NAME,
        isActive: true,
      },
      transaction: t,
    });

    if (!created) {
      const needsRoleUpdate = (adminUser as any).role !== ADMIN_ROLE_NAME;
      if (needsRoleUpdate) {
        (adminUser as any).role = ADMIN_ROLE_NAME;
        await (adminUser as any).save({ transaction: t });
      }
    }

    const currentRoles = await (adminUser as any).getRoles({
      transaction: t,
    });
    const hasAdmin = currentRoles.some((r: any) => r.name === ADMIN_ROLE_NAME);
    if (!hasAdmin) {
      await (adminUser as any).addRole(adminRole, { transaction: t });
    }
  });
};

seedPermissionsAndAdmin()
  .then(async () => {
    console.log("Permissions seeded and admin role updated.");
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    try {
      await sequelize.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
