import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line @typescript-eslint/no-unused-vars
const wsReadyStateClosed = 3; // eslint-disable-line @typescript-eslint/no-unused-vars

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      origin: any,
    ) => {
      const changedClients = added.concat(updated, removed);
      if (origin !== 'local') {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            this.awareness,
            changedClients,
          ),
        );
        const buff = encoding.toUint8Array(encoder);
        this.conns.forEach((_, c) => {
          send(c, buff, this);
        });
      }
    };
    this.awareness.on('update', awarenessChangeHandler);

    this.on('update', (update: Uint8Array, origin: any, doc: Y.Doc) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(c, buff, this);
      });
    });
  }
}

const getYDoc = (docname: string, gc = true): WSSharedDoc => {
  let doc = docs.get(docname);
  if (doc === undefined) {
    doc = new WSSharedDoc(docname);
    doc.gc = gc;
    docs.set(docname, doc);
  }
  return doc;
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null,
      );
    }
    if (doc.conns.size === 0) {
      // persist if needed
    }
  }
};

export const disconnectWsUser = (documentId: string, userId: string) => {
  const doc = docs.get(documentId);
  if (!doc) return;
  for (const [conn] of doc.conns) {
    if ((conn as any).user?.userId === userId) {
      conn.close(4403, 'Access revoked');
      closeConn(doc, conn);
    }
  }
};

const send = (conn: WebSocket, message: Uint8Array, doc: WSSharedDoc) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(message, (err) => {
      if (err) {
        // console.error(err)
      }
    });
  } catch (e) {
    // console.error(e)
  }
};

/**
 * YjsGateway — a raw ws.Server that hooks into the NestJS HTTP server's
 * `upgrade` event.  This bypasses NestJS WsAdapter's strict path-matching
 * which silently kills y-websocket connections that include a dynamic
 * document ID in the URL path.
 */
@Injectable()
export class YjsGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger(YjsGateway.name);
  private readonly jwtSecret: string;
  private wss!: WebSocket.Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET')!;
  }

  onApplicationBootstrap() {
    // Create a raw ws.Server with noServer so we control the upgrade
    this.wss = new WebSocket.Server({ noServer: true });

    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    this.logger.log('[YJS] Attaching upgrade handler to HTTP server...');

    httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      this.logger.debug(`[YJS] Received upgrade request: ${request.url}`);
      // Accept ALL WebSocket upgrade requests — the document ID is in the path
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.handleConnection(ws, request);
      });
    });

    this.logger.log('[YJS] WebSocket server initialized on HTTP upgrade path');
  }

  private async handleConnection(client: WebSocket, request: IncomingMessage) {
    this.logger.log(`[YJS] New WebSocket connection attempt`);

    // Safely extract URL — fallback if request is undefined
    let docName = 'default';
    let token: string | null = null;

    try {
      const reqUrl = request?.url || '';
      this.logger.log(`[YJS] Request URL: ${reqUrl}`);
      const url = new URL(reqUrl, 'http://localhost');
      const pathParts = url.pathname.split('/').filter((p) => p && p !== 'yjs');
      docName = pathParts[0] || url.searchParams.get('doc') || 'default';
      token = url.searchParams.get('token');
    } catch (err) {
      this.logger.error(`[YJS] Error parsing request URL: ${err}`);
      client.close(4400, 'Bad request');
      return;
    }

    // ── JWT Validation (STRICT) ────────────────────────────────────
    let userPayload: any = null;
    if (!token) {
      this.logger.warn(
        `[YJS] No token provided for room ${docName} — rejecting connection`,
      );
      client.close(4401, 'Authentication required');
      return;
    }

    try {
      userPayload = jwt.verify(token, this.jwtSecret) as any;
      this.logger.log(
        `[YJS] Authenticated user ${userPayload.displayName || userPayload.sub} connecting to room: ${docName}`,
      );
    } catch (err) {
      this.logger.warn(
        `[YJS] Invalid JWT token for room ${docName}: ${(err as Error).message}`,
      );
      client.close(4401, 'Invalid token');
      return;
    }

    // ── Collaborator Check ─────────────────────────────────────────
    let collaboratorAccessMode = 'VIEW';
    try {
      const collaborator = await this.prisma.documentCollaborator.findUnique({
        where: {
          documentId_userId: { documentId: docName, userId: userPayload.sub },
        },
      });

      if (!collaborator) {
        this.logger.warn(
          `[YJS] User ${userPayload.sub} is NOT a collaborator on document ${docName}`,
        );
        client.close(4403, 'Not a collaborator');
        return;
      }

      // OWNER role always gets full EDIT access regardless of accessMode in DB
      collaboratorAccessMode = collaborator.role === 'OWNER' ? 'EDIT' : collaborator.accessMode;
      this.logger.log(
        `[YJS] User ${userPayload.displayName} has role ${collaborator.role}, mode ${collaboratorAccessMode} on document ${docName}`,
      );
    } catch (err) {
      this.logger.error(
        `[YJS] Collaborator check failed: ${(err as Error).message}`,
      );
      client.close(4500, 'Server error');
      return;
    }

    // ── Attach user identity to the client ─────────────────────────
    (client as any).user = {
      userId: userPayload.sub,
      email: userPayload.email,
      role: userPayload.role,
      displayName: userPayload.displayName,
      accessMode: collaboratorAccessMode,
    };

    const doc = getYDoc(docName);
    doc.conns.set(client, new Set());

    client.on('message', async (message: any) => {
      const messageUint8 = new Uint8Array(message);
      if (messageUint8.byteLength > 1_000_000) {
        this.logger.warn(
          `[YJS] Oversized message (${messageUint8.byteLength} bytes) from room ${docName}`,
        );
        return;
      }

      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(messageUint8);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          // ── Access Mode Check: VIEW and COMMENT cannot send sync updates ──
          const clientAccessMode = (client as any).user?.accessMode || 'VIEW';

          // SUGGEST and EDIT modes MUST be allowed to send sync updates
          if (clientAccessMode === 'VIEW' || clientAccessMode === 'COMMENT') {
            // Still allow reading sync step 1 (initial doc state), but reject writes
            const syncMessageType = decoding.readVarUint(decoder);
            if (syncMessageType === 2) {
              // syncStep2 = update
              this.logger.warn(
                `[YJS] Rejected sync update from ${clientAccessMode} user in room ${docName}`,
              );
              return;
            }
            // Re-create decoder for step1/response processing
            const fullDecoder = decoding.createDecoder(messageUint8);
            decoding.readVarUint(fullDecoder); // skip messageType
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.readSyncMessage(fullDecoder, encoder, doc, null);
            if (encoding.length(encoder) > 1) {
              send(client, encoding.toUint8Array(encoder), doc);
            }
            break;
          }

          const docRecord = await this.prisma.document.findUnique({
            where: { id: docName },
            select: { status: true },
          });
          if (docRecord?.status === 'FINALIZED') {
            this.logger.warn(
              `[YJS] Rejected update on finalized document ${docName}`,
            );
            return;
          }

          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, null);
          if (encoding.length(encoder) > 1) {
            send(client, encoding.toUint8Array(encoder), doc);
          }
          break;
        }
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            client,
          );
          break;
        }
      }
    });

    // Handle disconnect
    client.on('close', () => {
      docs.forEach((d) => {
        if (d.conns.has(client)) {
          closeConn(d, client);
        }
      });
    });

    // Initial sync
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(client, encoding.toUint8Array(encoder), doc);

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys()),
        ),
      );
      send(client, encoding.toUint8Array(encoder), doc);
    }
  }
}
