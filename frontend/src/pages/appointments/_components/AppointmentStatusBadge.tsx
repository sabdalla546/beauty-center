import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  getAppointmentStatusClassName,
  getAppointmentStatusLabel,
} from "@/pages/appointments/appointmentWorkflow";

interface AppointmentStatusBadgeProps {
  status?: string | null;
  className?: string;
}

const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const { t } = useTranslation("common");

  return (
    <Badge
      className={`${getAppointmentStatusClassName(status)} ${className}`.trim()}
    >
      {getAppointmentStatusLabel(t, status)}
    </Badge>
  );
};

export default AppointmentStatusBadge;
