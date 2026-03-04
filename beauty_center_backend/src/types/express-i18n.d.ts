// src/types/express-i18n.d.ts
import type { TFunction } from "i18next";

declare global {
  namespace Express {
    interface Request {
      t: TFunction; // translator function
      language?: string; // detected language
    }
  }
}
