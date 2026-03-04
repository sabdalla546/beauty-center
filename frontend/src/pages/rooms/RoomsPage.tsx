import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { DoorOpen } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useRooms } from "@/hooks/rooms/useRooms";
import { useRoomsColumns } from "@/pages/rooms/_components/roomsColumns";
import { toTableRooms } from "@/pages/rooms/adapters";

const RoomsPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "rooms.read";
  const createPermission = "rooms.create";
  const editPermission = "rooms.update";

  const { data: raw, isLoading } = useRooms({ searchQuery });

  const adapted = toTableRooms(raw as any, currentPage, itemsPerPage, searchQuery);
  const rooms = adapted.data.rooms;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const columns = useRoomsColumns({ editPermission });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<DoorOpen className="w-5 h-5 text-primary" />}
          title={t("rooms.rooms") || "Rooms"}
          totalText={
            <>
              {totalItems} {t("rooms.total_rooms") || "total rooms"}
            </>
          }
          search={{
            placeholder: t("rooms.search_rooms") || "Search rooms...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/rooms/types")}
              >
                {t("rooms.room_types") || "Room types"}
              </Button>
              <ProtectedComponent permission={createPermission}>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                  onClick={() => navigate("/rooms/create")}
                >
                  {t("rooms.create_room") || "Create room"}
                </Button>
              </ProtectedComponent>
            </div>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("rooms.rooms_list") || "Rooms list"}
              totalItems={totalItems}
              currentCount={rooms.length}
              entityName={t("rooms.rooms") || "rooms"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("rooms.loading") || "Loading rooms..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={rooms}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="rooms"
                />
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border bg-muted/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default RoomsPage;
