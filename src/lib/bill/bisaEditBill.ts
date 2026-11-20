import type { Bill } from "@/types";

export function bisaEditBill(bill: Bill | null | undefined): boolean {
  return !!bill && typeof bill === "object" && bill.status === "draft";
}
