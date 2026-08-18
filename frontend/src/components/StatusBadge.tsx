import { Badge } from "./ui/Badge";
import { STATUS_COLORS } from "../lib/constants";
import { RunStatus } from "../types";

export function StatusBadge({ status }: { status: RunStatus }) {
  return <Badge className={STATUS_COLORS[status]}>{status.replace(/_/g, " ")}</Badge>;
}
