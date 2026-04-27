import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Injectable, Logger } from "@nestjs/common";
import type { Server, Socket } from "socket.io";

export type StockChangedEvent = {
  productId: string;
  warehouseId: string;
  newOnHand: number;
  movementType: string;
  timestamp: string;
};

export type OrderStatusEvent = {
  orderId: string;
  orderCode: string;
  orderType: "SALES" | "PURCHASE";
  newStatus: string;
  timestamp: string;
};

export type PickListUpdateEvent = {
  pickListId: string;
  itemId: string;
  pickedQty: number;
  percentComplete: number;
};

@Injectable()
@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client sends: { organizationId: string }
   * Joins the org-specific room so they only receive relevant events.
   */
  @SubscribeMessage("join:org")
  handleJoinOrg(client: Socket, payload: { organizationId: string }) {
    const room = `org:${payload.organizationId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: "joined", room };
  }

  @SubscribeMessage("leave:org")
  handleLeaveOrg(client: Socket, payload: { organizationId: string }) {
    const room = `org:${payload.organizationId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { event: "left", room };
  }

  // ---- Broadcast helpers (called from service layer) ----

  broadcastStockChange(organizationId: string, event: StockChangedEvent) {
    this.server.to(`org:${organizationId}`).emit("stock:updated", event);
  }

  broadcastOrderStatus(organizationId: string, event: OrderStatusEvent) {
    this.server.to(`org:${organizationId}`).emit("order:status", event);
  }

  broadcastPickListUpdate(organizationId: string, event: PickListUpdateEvent) {
    this.server.to(`org:${organizationId}`).emit("pick-list:updated", event);
  }

  broadcastInvoiceCreated(organizationId: string, invoiceCode: string) {
    this.server.to(`org:${organizationId}`).emit("invoice:created", {
      code: invoiceCode,
      timestamp: new Date().toISOString(),
    });
  }
}
