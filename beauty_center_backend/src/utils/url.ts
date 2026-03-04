import { Request } from "express";

export const getBaseUrl = (req: Request) => {
  // لو شغال ورا Proxy (Cloudways/Nginx) هتحتاج trust proxy في app.ts
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
};

export const makePublicUrl = (req: Request, publicPath: string) => {
  const base = getBaseUrl(req);
  const clean = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  return `${base}${clean}`;
};
