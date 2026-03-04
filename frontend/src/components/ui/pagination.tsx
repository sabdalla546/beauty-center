import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,

  onPageChange,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-sm text-muted-foreground">
        {t("page")} {currentPage} {t("of")} {totalPages}
      </div>
      <div
        className="flex gap-1 flex-wrap"
        dir={i18n.language === "ar" ? "rtl" : "ltr"}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {i18n.language === "ar" ? "السابق" : t("previous")}{" "}
        </Button>
        {Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1).map(
          (page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[2.5rem]"
            >
              {page}
            </Button>
          )
        )}
        {totalPages > 10 && (
          <span className="flex items-center px-2 text-muted-foreground">
            ...
          </span>
        )}
        {totalPages > 10 &&
          [totalPages - 1, totalPages].map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[2.5rem]"
            >
              {page}
            </Button>
          ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {i18n.language === "ar" ? "التالي" : t("next")}{" "}
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
