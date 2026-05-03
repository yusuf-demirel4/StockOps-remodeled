import { HepsiburadaClient } from "./client";
import type { HepsiburadaTicket } from "./types";

export type PendingTicket = {
  id: string;
  ticketId: string;
  organizationId: string;
};

export type TicketPollResult = {
  ticketId: string;
  previousStatus: string;
  newStatus: "PENDING" | "SUCCESS" | "FAILED";
  message?: string;
};

/**
 * Poll Hepsiburada for the status of pending inventory upload tickets.
 *
 * This function should be called by a cron job (every 15 minutes).
 * It checks each pending ticket's status and returns the resolved results.
 *
 * Usage in worker:
 * 1. Query DB for HepsiburadaSyncTicket records with status = PENDING
 * 2. For each, call this function
 * 3. Update the DB record based on the result
 */
export async function pollTicketStatus(
  client: HepsiburadaClient,
  ticket: PendingTicket,
): Promise<TicketPollResult> {
  let hbTicket: HepsiburadaTicket;

  try {
    hbTicket = await client.getTicketStatus(ticket.ticketId);
  } catch (error) {
    return {
      ticketId: ticket.ticketId,
      previousStatus: "PENDING",
      newStatus: "PENDING",
      message: `Ticket durumu sorgulanamadı: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  switch (hbTicket.status) {
    case "DONE":
      return {
        ticketId: ticket.ticketId,
        previousStatus: "PENDING",
        newStatus: "SUCCESS",
        message: "Stok güncellemesi başarıyla tamamlandı.",
      };

    case "FAILED":
      return {
        ticketId: ticket.ticketId,
        previousStatus: "PENDING",
        newStatus: "FAILED",
        message: hbTicket.message ?? "Hepsiburada stok güncellemesi başarısız.",
      };

    case "PENDING":
    case "PROCESSING":
      return {
        ticketId: ticket.ticketId,
        previousStatus: "PENDING",
        newStatus: "PENDING",
        message: `Ticket hâlâ işleniyor: ${hbTicket.status}`,
      };

    default:
      return {
        ticketId: ticket.ticketId,
        previousStatus: "PENDING",
        newStatus: "PENDING",
        message: `Bilinmeyen ticket durumu: ${hbTicket.status}`,
      };
  }
}

/**
 * Poll all pending tickets for an organization.
 */
export async function pollAllPendingTickets(
  client: HepsiburadaClient,
  pendingTickets: PendingTicket[],
): Promise<TicketPollResult[]> {
  const results: TicketPollResult[] = [];

  for (const ticket of pendingTickets) {
    const result = await pollTicketStatus(client, ticket);
    results.push(result);
  }

  return results;
}
