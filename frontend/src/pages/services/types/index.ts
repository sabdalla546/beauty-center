export interface RoomType {
  id: number;
  name: string;
  requiresPrivate?: boolean;
}

export interface Service {
  id: number;
  code?: string | null;
  name: string;
  durationMinutes: number;
  image?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  priceKwd?: number | null;
  priceFils?: number | null;
  priceCents?: number | null;
  requiredRoomTypeId?: number | null;
  requiredRoomType?: RoomType | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServicesResponse {
  data: Service[];
}
