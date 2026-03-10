// tests/jwt.tokens.test.ts
import * as jwtUtils from "../src/utils/jwt";
import { hashRefreshToken } from "../src/utils/tokenHash";
import { RefreshToken as RefreshTokenModel } from "../src/models/refreshToken.model";

// jest will hoist mocks; we'll manually spy / mock methods
jest.mock("../src/models/refreshToken.model");

describe("refresh-token limit & pruning logic", () => {
  afterEach(() => {
    jest.clearAllMocks();
    process.env.MAX_REFRESH_TOKENS = undefined;
  });

  test("enforceRefreshTokenLimit revokes oldest tokens when limit exceeded", async () => {
    // Arrange: create mock tokens (simulate 7 active tokens, max=5)
    const userId = 1;
    const now = new Date();
    // create fake model instances with save() spy
    const makeFakeRow = (id: number, createdAt: Date) => {
      return {
        id,
        userId,
        tokenHash: `h${id}`,
        revoked: false,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
        createdAt,
        save: jest.fn().mockResolvedValue(true),
      };
    };

    const activeTokens = [
      makeFakeRow(1, new Date(now.getTime() - 7000)),
      makeFakeRow(2, new Date(now.getTime() - 6000)),
      makeFakeRow(3, new Date(now.getTime() - 5000)),
      makeFakeRow(4, new Date(now.getTime() - 4000)),
      makeFakeRow(5, new Date(now.getTime() - 3000)),
      makeFakeRow(6, new Date(now.getTime() - 2000)),
      makeFakeRow(7, new Date(now.getTime() - 1000)),
    ];

    // mock RefreshToken.findAll to return our active tokens list
    const findAllSpy = jest
      .spyOn(RefreshTokenModel as any, "findAll")
      .mockResolvedValue(activeTokens);

    // Act: enforce limit 5
    await jwtUtils.enforceRefreshTokenLimit(userId, 5);

    // Assert: the two oldest tokens (ids 1 and 2) should have been revoked and saved
    expect(findAllSpy).toHaveBeenCalled();
    expect((activeTokens[0].save as jest.Mock).mock.calls.length).toBe(1); // revoked id 1
    expect((activeTokens[1].save as jest.Mock).mock.calls.length).toBe(1); // revoked id 2
    // later tokens should not be revoked
    for (let i = 2; i < activeTokens.length; i++) {
      // only first two should have been saved with revoked; rest unchanged
      if (i < 2) continue;
      // ensure save wasn't called for tokens beyond revoked ones (for our test)
      // tokens 3..7 should have save not called
      if ((activeTokens[i].save as jest.Mock).mock.calls.length > 0) {
        // throw for debugging
        throw new Error("Unexpected revoke of token index " + i);
      }
    }
  });

  test("pruneExpiredRefreshTokens revokes expired tokens", async () => {
    const now = new Date();
    const expiredRow = {
      id: 10,
      revoked: false,
      expiresAt: new Date(now.getTime() - 1000),
      save: jest.fn().mockResolvedValue(true),
    };

    const goodRow = {
      id: 11,
      revoked: false,
      expiresAt: new Date(now.getTime() + 100000),
      save: jest.fn().mockResolvedValue(true),
    };

    const findAllSpy = jest
      .spyOn(RefreshTokenModel as any, "findAll")
      .mockResolvedValue([expiredRow]);

    const pruned = await jwtUtils.pruneExpiredRefreshTokens();

    expect(findAllSpy).toHaveBeenCalled();
    expect(pruned).toBe(1);
    expect((expiredRow.save as jest.Mock).mock.calls.length).toBe(1);
  });
});
