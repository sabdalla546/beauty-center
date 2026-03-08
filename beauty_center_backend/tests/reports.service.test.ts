import { Op } from "sequelize";
import { Appointment, Order, OrderItem, Payment } from "../src/models";
import { getOverviewReport, getSalesReport } from "../src/services/reports.service";

describe("reports.service date filters", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("expands a same-day range to the end of that day", async () => {
    const orderFindAllSpy = jest.spyOn(Order, "findAll").mockResolvedValue([] as any);
    const paymentFindAllSpy = jest.spyOn(Payment, "findAll").mockResolvedValue([] as any);
    const appointmentFindAllSpy = jest
      .spyOn(Appointment, "findAll")
      .mockResolvedValue([] as any);

    await getOverviewReport({ from: "2026-03-08", to: "2026-03-08" });

    const orderWhere = (orderFindAllSpy.mock.calls[0][0] as any)?.where?.createdAt as Record<
      symbol,
      Date
    >;
    const paymentWhere = (paymentFindAllSpy.mock.calls[0][0] as any)?.where?.createdAt as Record<
      symbol,
      Date
    >;
    const appointmentWhere = ((appointmentFindAllSpy.mock.calls[0][0] as any)?.where
      ?.startAt) as Record<symbol, Date>;

    const startOfDay = new Date(2026, 2, 8, 0, 0, 0, 0).getTime();
    const endOfDay = new Date(2026, 2, 8, 23, 59, 59, 999).getTime();

    expect(orderWhere[Op.gte].getTime()).toBe(startOfDay);
    expect(orderWhere[Op.lte].getTime()).toBe(endOfDay);
    expect(paymentWhere[Op.gte].getTime()).toBe(startOfDay);
    expect(paymentWhere[Op.lte].getTime()).toBe(endOfDay);
    expect(appointmentWhere[Op.gte].getTime()).toBe(startOfDay);
    expect(appointmentWhere[Op.lte].getTime()).toBe(endOfDay);
  });

  test("keeps explicit datetime boundaries unchanged", async () => {
    const orderFindAllSpy = jest.spyOn(Order, "findAll").mockResolvedValue([] as any);
    jest.spyOn(OrderItem, "findAll").mockResolvedValue([] as any);

    await getSalesReport({
      from: "2026-03-08T10:15:00.000Z",
      to: "2026-03-08T12:30:00.000Z",
      groupBy: "day",
    });

    const createdAt = (orderFindAllSpy.mock.calls[0][0] as any)?.where?.createdAt as Record<
      symbol,
      Date
    >;

    expect(createdAt[Op.gte].toISOString()).toBe("2026-03-08T10:15:00.000Z");
    expect(createdAt[Op.lte].toISOString()).toBe("2026-03-08T12:30:00.000Z");
  });
});
