import { queryOptions } from "@tanstack/react-query";
import { getMessages, getMessage, getKb, getAvailability, getRecords, getAudit } from "@/lib/reads.functions";

export const messagesQuery = queryOptions({ queryKey: ["messages"], queryFn: () => getMessages() });
export const messageQuery = (id: string) => queryOptions({ queryKey: ["message", id], queryFn: () => getMessage({ data: { id } }) });
export const kbQuery = queryOptions({ queryKey: ["kb"], queryFn: () => getKb() });
export const availabilityQuery = queryOptions({ queryKey: ["availability"], queryFn: () => getAvailability() });
export const recordsQuery = queryOptions({ queryKey: ["records"], queryFn: () => getRecords() });
export const auditQuery = queryOptions({ queryKey: ["audit"], queryFn: () => getAudit() });
