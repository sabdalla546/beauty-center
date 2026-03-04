// src/utils/money.ts
export const kwdToFils = (v: string | number): number => {
  const s = String(v).trim();
  if (!s.length) return 0;

  // support "5", "5.5", "5.050", "5.000"
  const [intPart, decPartRaw = ""] = s.split(".");
  const decPart = (decPartRaw + "000").slice(0, 3); // pad/right-trim to 3
  const fils = Number(intPart) * 1000 + Number(decPart);
  return Number.isFinite(fils) ? fils : 0;
};

export const filsToKwd = (fils: number): string => {
  const n = Number(fils || 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const dinars = Math.floor(abs / 1000);
  const rem = abs % 1000;
  return `${sign}${dinars}.${String(rem).padStart(3, "0")}`;
};
