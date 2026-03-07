import { QueryTypes } from "sequelize";
import { connectDB, sequelize } from "../db/db";

type StatRow = {
  INDEX_NAME: string;
  NON_UNIQUE: number;
  INDEX_TYPE: string;
  SEQ_IN_INDEX: number;
  COLUMN_NAME: string | null;
};

type IndexDef = {
  name: string;
  nonUnique: boolean;
  indexType: string;
  columns: string[];
};

const TABLE_NAME = "users";

const preferredNames = new Set([
  "users_email_unique",
  "users_created_by",
  "users_updated_by",
  "users_deleted_by",
]);

const hasNumericSuffix = (name: string) => /_\d+$/.test(name);

const pickKeepIndex = (candidates: IndexDef[]) => {
  return [...candidates].sort((a, b) => {
    const aPreferred = preferredNames.has(a.name) ? 0 : 1;
    const bPreferred = preferredNames.has(b.name) ? 0 : 1;
    if (aPreferred !== bPreferred) return aPreferred - bPreferred;

    const aUnique = a.nonUnique ? 1 : 0;
    const bUnique = b.nonUnique ? 1 : 0;
    if (aUnique !== bUnique) return aUnique - bUnique;

    const aNumeric = hasNumericSuffix(a.name) ? 1 : 0;
    const bNumeric = hasNumericSuffix(b.name) ? 1 : 0;
    if (aNumeric !== bNumeric) return aNumeric - bNumeric;

    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name.localeCompare(b.name);
  })[0];
};

const loadIndexes = async (): Promise<IndexDef[]> => {
  const rows = await sequelize.query<StatRow>(
    `
      SELECT INDEX_NAME, NON_UNIQUE, INDEX_TYPE, SEQ_IN_INDEX, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `,
    {
      replacements: { tableName: TABLE_NAME },
      type: QueryTypes.SELECT,
    },
  );

  const grouped = new Map<string, IndexDef>();
  for (const row of rows) {
    if (!grouped.has(row.INDEX_NAME)) {
      grouped.set(row.INDEX_NAME, {
        name: row.INDEX_NAME,
        nonUnique: Number(row.NON_UNIQUE) === 1,
        indexType: String(row.INDEX_TYPE || "BTREE"),
        columns: [],
      });
    }
    const def = grouped.get(row.INDEX_NAME)!;
    if (row.COLUMN_NAME) def.columns.push(row.COLUMN_NAME);
  }

  return [...grouped.values()].filter((idx) => idx.name !== "PRIMARY");
};

const dropIndex = async (indexName: string) => {
  const escaped = indexName.replace(/`/g, "``");
  await sequelize.query(
    `ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${escaped}\``,
    { type: QueryTypes.RAW },
  );
};

const countIndexes = async () => {
  const rows = await sequelize.query<{ total: number }>(
    `
      SELECT COUNT(DISTINCT INDEX_NAME) AS total
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
    `,
    {
      replacements: { tableName: TABLE_NAME },
      type: QueryTypes.SELECT,
    },
  );
  return Number(rows[0]?.total ?? 0);
};

const cleanupUsersIndexes = async () => {
  await connectDB();

  const before = await countIndexes();
  const indexes = await loadIndexes();
  console.log(`[users-index-cleanup] before: ${before} indexes`);

  const groups = new Map<string, IndexDef[]>();
  for (const idx of indexes) {
    const key = `${idx.indexType}|${idx.columns.join(",")}`;
    const list = groups.get(key) ?? [];
    list.push(idx);
    groups.set(key, list);
  }

  const toDrop = new Set<string>();
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const keep = pickKeepIndex(group);
    for (const idx of group) {
      if (idx.name !== keep.name) toDrop.add(idx.name);
    }
  }

  if (toDrop.size === 0) {
    console.log("[users-index-cleanup] no duplicate/redundant indexes found.");
  } else {
    const names = [...toDrop];
    for (const name of names) {
      await dropIndex(name);
      console.log(`[users-index-cleanup] dropped: ${name}`);
    }
    console.log(`[users-index-cleanup] dropped ${names.length} indexes.`);
  }

  const after = await countIndexes();
  console.log(`[users-index-cleanup] after: ${after} indexes`);
};

cleanupUsersIndexes()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[users-index-cleanup] failed:", err);
    try {
      await sequelize.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
