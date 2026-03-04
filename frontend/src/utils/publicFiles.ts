const uploadsBase = (import.meta.env.VITE_UPLOADS_BASE_URL || "").trim();

const cleanBase = uploadsBase.replace(/\/+$/, "");

export const resolvePublicImageUrl = (args: {
  imageUrl?: string | null;
  imagePath?: string | null;
  filename?: string | null; // DB filename only
  folder: "products" | "services";
}) => {
  const { imageUrl, imagePath, filename, folder } = args;

  // 1) direct url from backend
  if (imageUrl) return imageUrl;

  // 2) if imagePath is already absolute url
  if (imagePath && imagePath.startsWith("http")) return imagePath;

  // 3) If we have imagePath relative like "uploads/products/x.webp" or "/uploads/..."
  if (imagePath) {
    const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    if (cleanBase) {
      // cleanBase already ends with /uploads
      // so if imagePath includes /uploads/... we should avoid double
      if (path.startsWith("/uploads/"))
        return `${cleanBase.replace(/\/uploads$/i, "")}${path}`;
      return `${cleanBase}${path}`;
    }
    return path;
  }

  // 4) filename-only stored in DB
  if (filename) {
    if (!cleanBase) return `/uploads/${folder}/${filename}`;
    return `${cleanBase}/${folder}/${filename}`;
  }

  return null;
};
