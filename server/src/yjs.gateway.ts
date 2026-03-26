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
import * as crypto from 'crypto';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line @typescript-eslint/no-unused-vars
const wsReadyStateClosed = 3; // eslint-disable-line @typescript-eslint/no-unused-vars

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

// ── Debounce timer tracking for persisting Yjs state ──────────────────────
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DEBOUNCE_MS = 2000; // 2 seconds

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
  isLoaded: boolean; // tracks whether DB state has been applied

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.isLoaded = false;
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

/**
 * Get or create a Yjs doc. If the doc doesn't exist in memory, it will be
 * created. The caller MUST call loadDocFromDB() before sending sync messages
 * to ensure the doc has the persisted state.
 */
const getYDoc = (docname: string, gc = true): WSSharedDoc => {
  let doc = docs.get(docname);
  if (doc === undefined) {
    doc = new WSSharedDoc(docname);
    doc.gc = gc;
    docs.set(docname, doc);
  }
  return doc;
};

/**
 * Persist the current Yjs state to the database (debounced).
 * Called on every Yjs update — the debounce ensures we don't
 * write to DB on every keystroke.
 */
const debouncedSave = (
  docName: string,
  doc: WSSharedDoc,
  prisma: PrismaService,
  logger: Logger,
) => {
  // Clear any pending save timer
  const existing = saveTimers.get(docName);
  if (existing) clearTimeout(existing);

  saveTimers.set(
    docName,
    setTimeout(async () => {
      saveTimers.delete(docName);
      await persistDoc(docName, doc, prisma, logger);
    }, SAVE_DEBOUNCE_MS),
  );
};

/**
 * Immediately persist the current Yjs state to the database.
 */
const persistDoc = async (
  docName: string,
  doc: WSSharedDoc,
  prisma: PrismaService,
  logger: Logger,
) => {
  try {
    const state = Y.encodeStateAsUpdate(doc);
    const hash = crypto.createHash('sha256').update(state).digest('hex');

    await prisma.document.update({
      where: { id: docName },
      data: {
        yjsState: Buffer.from(state),
        contentHash: hash,
      },
    });

    logger.debug(
      `[YJS] Persisted Yjs state for ${docName} (${state.byteLength} bytes, hash=${hash.substring(0, 12)}...)`,
    );
  } catch (err) {
    logger.error(
      `[YJS] Failed to persist Yjs state for ${docName}: ${(err as Error).message}`,
    );
  }
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
    // NOTE: actual cleanup + save happens in YjsGateway.handleDisconnect()
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
 *
 * PERSISTENCE: On first connection to a document, the gateway loads
 * `Document.yjsState` from PostgreSQL and applies it to the Y.Doc.
 * On every subsequent update, the state is persisted back (debounced).
 * When the last client disconnects, the state is flushed immediately
 * and the in-memory doc is cleaned up.
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

    httpServer.on(
      'upgrade',
      (request: IncomingMessage, socket: any, head: Buffer) => {
        this.logger.debug(`[YJS] Received upgrade request: ${request.url}`);
        // Accept ALL WebSocket upgrade requests — the document ID is in the path
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.handleConnection(ws, request);
        });
      },
    );

    this.logger.log('[YJS] WebSocket server initialized on HTTP upgrade path');
  }

  /**
   * Load the persisted Yjs state from the database and apply it to
   * the in-memory Y.Doc. This is called once per document when the
   * first client connects (doc.isLoaded guards against double-loading).
   */
  private async loadDocFromDB(doc: WSSharedDoc, docName: string) {
    if (doc.isLoaded) return;
    doc.isLoaded = true;

    try {
      const record = await this.prisma.document.findUnique({
        where: { id: docName },
        select: { yjsState: true },
      });

      if (record?.yjsState) {
        const stored = new Uint8Array(record.yjsState);
        Y.applyUpdate(doc, stored);
        this.logger.log(
          `[YJS] Loaded persisted Yjs state for ${docName} (${stored.byteLength} bytes)`,
        );
      } else {
        this.logger.log(
          `[YJS] No persisted state for ${docName} — starting fresh`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[YJS] Failed to load Yjs state for ${docName}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Handle cleanup when a client disconnects. If there are no more
   * connected clients, immediately flush the Yjs state to DB and
   * clean up the in-memory doc to free memory.
   */
  private async handleDisconnect(doc: WSSharedDoc, client: WebSocket) {
    closeConn(doc, client);

    if (doc.conns.size === 0) {
      // Last client disconnected — flush immediately
      const docName = doc.name;
      this.logger.log(`[YJS] Last client left ${docName} — flushing to DB`);

      // Cancel any pending debounced save
      const timer = saveTimers.get(docName);
      if (timer) {
        clearTimeout(timer);
        saveTimers.delete(docName);
      }

      // Persist final state
      await persistDoc(docName, doc, this.prisma, this.logger);

      // Clean up in-memory doc to free memory
      doc.destroy();
      docs.delete(docName);
      this.logger.log(`[YJS] Cleaned up in-memory doc for ${docName}`);
    }
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

    // ── Collaborator + Document Check (single DB round-trip) ──────
    let collaboratorAccessMode = 'VIEW';
    let isFinalized = false;
    try {
      const [collaborator, docRecord] = await Promise.all([
        this.prisma.documentCollaborator.findUnique({
          where: {
            documentId_userId: { documentId: docName, userId: userPayload.sub },
          },
        }),
        this.prisma.document.findUnique({
          where: { id: docName },
          select: { status: true },
        }),
      ]);

      if (!collaborator) {
        this.logger.warn(
          `[YJS] User ${userPayload.sub} is NOT a collaborator on document ${docName}`,
        );
        client.close(4403, 'Not a collaborator');
        return;
      }

      isFinalized = docRecord?.status === 'FINALIZED';

      // OWNER role always gets full EDIT access regardless of accessMode in DB
      collaboratorAccessMode =
        collaborator.role === 'OWNER' ? 'EDIT' : collaborator.accessMode;
      this.logger.log(
        `[YJS] User ${userPayload.displayName} has role ${collaborator.role}, mode ${collaboratorAccessMode}, finalized=${isFinalized} on document ${docName}`,
      );
    } catch (err) {
      this.logger.error(
        `[YJS] Collaborator check failed: ${(err as Error).message}`,
      );
      client.close(4500, 'Server error');
      return;
    }

    // ── Attach user identity + cached doc status to the client ─────
    (client as any).user = {
      userId: userPayload.sub,
      email: userPayload.email,
      role: userPayload.role,
      displayName: userPayload.displayName,
      accessMode: collaboratorAccessMode,
      isFinalized,
    };

    const doc = getYDoc(docName);
    doc.conns.set(client, new Set());

    // ── Load persisted state from DB (only on first connection) ────
    await this.loadDocFromDB(doc, docName);

    // ── Register debounced persistence on Yjs updates ─────────────
    // We listen for updates AFTER loading to avoid saving the initial
    // load update back to DB unnecessarily. The listener is on the doc,
    // so it's shared across all clients and registered per-connection
    // but the debounce ensures a single save.
    const updateHandler = () => {
      debouncedSave(docName, doc, this.prisma, this.logger);
    };
    doc.on('update', updateHandler);

    // ── Message handler — NO async DB queries for fast processing ──
    client.on('message', (message: any) => {
      try {
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
            const clientAccessMode = (client as any).user?.accessMode || 'VIEW';
            const clientIsFinalized =
              (client as any).user?.isFinalized || false;

            // VIEW and COMMENT: allow sync step 1 (read), reject step 2 (write)
            if (clientAccessMode === 'VIEW' || clientAccessMode === 'COMMENT') {
              const syncMessageType = decoding.readVarUint(decoder);
              if (syncMessageType === 2) {
                return; // reject write updates
              }
              const fullDecoder = decoding.createDecoder(messageUint8);
              decoding.readVarUint(fullDecoder);
              encoding.writeVarUint(encoder, messageSync);
              syncProtocol.readSyncMessage(fullDecoder, encoder, doc, null);
              if (encoding.length(encoder) > 1) {
                send(client, encoding.toUint8Array(encoder), doc);
              }
              break;
            }

            // Finalization check — uses cached value from connection time
            if (clientIsFinalized) {
              this.logger.warn(
                `[YJS] Rejected update on finalized document ${docName}`,
              );
              return;
            }

            // EDIT and SUGGEST: process sync message normally
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
      } catch (err) {
        this.logger.error(
          `[YJS] Error processing message in room ${docName}: ${(err as Error).message}`,
        );
      }
    });

    // Handle disconnect
    client.on('close', () => {
      // Remove the update listener for this connection's handler
      doc.off('update', updateHandler);
      this.handleDisconnect(doc, client);
    });

    // Initial sync — send the full doc state to the new client
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
