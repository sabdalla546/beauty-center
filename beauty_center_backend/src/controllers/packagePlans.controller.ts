import { Request, Response } from "express";
import { Op } from "sequelize";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { PackagePlan } from "../models";
import { kwdToFils } from "../utils/money";

// Optional helper (لو عندك filsToKwd استخدمه بدل ده)
const filsToKwdNumber = (fils: number) =>
  Number((Number(fils || 0) / 1000).toFixed(3));

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const toInt = (v: any) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
};

// =========================
// GET /api/v1/packages/plans
// =========================
export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  const isActive =
    req.query.isActive !== undefined ? String(req.query.isActive) : null;

  const where: any = {};

  if (isActive !== null) {
    where.isActive = isActive === "true" || isActive === "1";
  }

  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
    ];
  }

  const rows = await PackagePlan.findAll({
    where,
    order: [
      ["isActive", "DESC"],
      ["id", "DESC"],
    ],
  });

  const data = rows.map((r: any) => {
    const json = r.toJSON?.() ?? r;
    const priceFils = Number(json.priceCents || 0); // ✅ stored in DB
    return {
      ...json,
      priceFils,
      priceKwd: filsToKwdNumber(priceFils), // helpful for UI
    };
  });

  res.json({ data });
});

// =========================
// POST /api/v1/packages/plans
// body: { name, description?, priceKwd, sessionsCount, validDays, serviceId? }
// =========================
export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? "").trim();
  const description =
    req.body?.description === undefined || req.body?.description === null
      ? null
      : String(req.body.description).trim();

  const sessionsCount = toInt(req.body?.sessionsCount);
  const validDays = toInt(req.body?.validDays);

  const serviceIdRaw = req.body?.serviceId;
  const serviceId =
    serviceIdRaw === undefined || serviceIdRaw === null || serviceIdRaw === ""
      ? null
      : toInt(serviceIdRaw);

  // ✅ IMPORTANT: price input must be KWD (from UI)
  const priceKwd = req.body?.priceKwd;

  if (!name)
    throw new AppError("Name is required", 400, "packages.name_required");
  if (sessionsCount <= 0)
    throw new AppError(
      "sessionsCount must be > 0",
      400,
      "packages.sessions_invalid",
    );
  if (validDays <= 0)
    throw new AppError(
      "validDays must be > 0",
      400,
      "packages.valid_days_invalid",
    );

  const priceFils = kwdToFils(toNum(priceKwd));
  if (priceFils <= 0)
    throw new AppError("priceKwd must be > 0", 400, "packages.price_invalid");

  const created = await PackagePlan.create({
    name,
    description,
    // ✅ store as FILS in priceCents column (temporary naming)
    priceCents: priceFils,
    sessionsCount,
    validDays,
    serviceId,
    isActive: true,
  } as any);

  const json: any = created.toJSON?.() ?? created;
  res.status(201).json({
    data: {
      ...json,
      priceFils: Number(json.priceCents || 0),
      priceKwd: filsToKwdNumber(Number(json.priceCents || 0)),
    },
  });
});

// =========================
// PUT /api/v1/packages/plans/:id
// body: partial update, supports priceKwd
// =========================
export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) throw new AppError("Invalid id", 400, "common.invalid_id");

  const plan = await PackagePlan.findByPk(id);
  if (!plan)
    throw new AppError("Plan not found", 404, "packages.plan_not_found");

  const patch: any = {};

  if (req.body?.name !== undefined) {
    const name = String(req.body.name ?? "").trim();
    if (!name)
      throw new AppError("Name is required", 400, "packages.name_required");
    patch.name = name;
  }

  if (req.body?.description !== undefined) {
    const description =
      req.body.description === null
        ? null
        : String(req.body.description ?? "").trim();
    patch.description = description;
  }

  if (req.body?.sessionsCount !== undefined) {
    const sessionsCount = toInt(req.body.sessionsCount);
    if (sessionsCount <= 0)
      throw new AppError(
        "sessionsCount must be > 0",
        400,
        "packages.sessions_invalid",
      );
    patch.sessionsCount = sessionsCount;
  }

  if (req.body?.validDays !== undefined) {
    const validDays = toInt(req.body.validDays);
    if (validDays <= 0)
      throw new AppError(
        "validDays must be > 0",
        400,
        "packages.valid_days_invalid",
      );
    patch.validDays = validDays;
  }

  if (req.body?.serviceId !== undefined) {
    const v = req.body.serviceId;
    if (v === null || v === "" || v === 0 || v === "0") patch.serviceId = null;
    else {
      const sid = toInt(v);
      if (sid <= 0)
        throw new AppError("Invalid serviceId", 400, "common.invalid_id");
      patch.serviceId = sid;
    }
  }

  // ✅ IMPORTANT: price update from UI must be priceKwd
  if (req.body?.priceKwd !== undefined) {
    const priceFils = kwdToFils(toNum(req.body.priceKwd));
    if (priceFils <= 0)
      throw new AppError("priceKwd must be > 0", 400, "packages.price_invalid");
    patch.priceCents = priceFils; // stored as FILS
  }

  await plan.update(patch as any);

  const json: any = plan.toJSON?.() ?? plan;
  res.json({
    data: {
      ...json,
      priceFils: Number(json.priceCents || 0),
      priceKwd: filsToKwdNumber(Number(json.priceCents || 0)),
    },
  });
});

// =========================
// PATCH /api/v1/packages/plans/:id/toggle
// =========================
export const togglePlanActive = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!id) throw new AppError("Invalid id", 400, "common.invalid_id");

    const plan = await PackagePlan.findByPk(id);
    if (!plan)
      throw new AppError("Plan not found", 404, "packages.plan_not_found");

    const next = !Boolean((plan as any).isActive);
    await plan.update({ isActive: next } as any);

    const json: any = plan.toJSON?.() ?? plan;
    res.json({
      data: {
        ...json,
        priceFils: Number(json.priceCents || 0),
        priceKwd: filsToKwdNumber(Number(json.priceCents || 0)),
      },
    });
  },
);
