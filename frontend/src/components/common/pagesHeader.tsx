// src/components/ui/pageHeader.tsx
import React from "react";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  totalLabel?: string; // e.g. "total_users"
  totalCount?: number; // number value
}

const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  totalLabel,
  totalCount,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 py-2">
        <div className="flex items-center gap-4 mb-2">
          {/* Icon */}
          <div className=" p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            {icon}
          </div>

          {/* Title + Subtitle + Total */}
          <div className="w-full">
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
            <div className="w-full flex justify-between items-center">
              <p className="text-slate-600 mt-1">{subtitle}</p>
              {totalLabel && totalCount !== undefined && (
                <p>
                  <span className="text-xs ml-2 p-2 rounded-lg font-light bg-gray-800 text-white">
                    {totalLabel} {totalCount}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
