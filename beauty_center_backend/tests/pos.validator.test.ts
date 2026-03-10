import { createPosOrderSchema } from "../src/validators/pos";

describe("createPosOrderSchema invariants", () => {
  test("rejects package item without customerId", () => {
    const result = createPosOrderSchema.safeParse({
      items: [
        {
          lineType: "package",
          referenceId: 1,
          quantity: 1,
          unitPriceKwd: 10,
          totalPriceKwd: 10,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("rejects non-service item with staffId", () => {
    const result = createPosOrderSchema.safeParse({
      customerId: 1,
      items: [
        {
          lineType: "product",
          referenceId: 2,
          quantity: 1,
          unitPriceKwd: 1,
          totalPriceKwd: 1,
          staffId: 4,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("accepts valid service line with staff and room", () => {
    const result = createPosOrderSchema.safeParse({
      customerId: 1,
      items: [
        {
          lineType: "service",
          referenceId: 3,
          quantity: 1,
          unitPriceKwd: 5,
          totalPriceKwd: 5,
          staffId: 10,
          roomId: 2,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
