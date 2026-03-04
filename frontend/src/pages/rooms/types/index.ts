export interface RoomType {
  id: number;
  name: string;
  requiresPrivate?: boolean;
}

export interface RoomTypesResponse {
  data: RoomType[];
}

export interface Room {
  id: number;
  name: string;
  roomTypeId?: number | null;
  capacity?: number | null;
  status?: string | null;
  roomType?: RoomType | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomsResponse {
  data: Room[];
}
