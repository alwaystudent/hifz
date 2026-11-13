import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomPassage {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  riwayah: 'hafs' | 'warsh' | 'qalun';
}

interface RoomPeer {
  peerId: string;
  name: string;
  isMuted: boolean;
  joinedAt: number;
  ws: WebSocket;
}

interface RoomState {
  roomId: string;
  passage: RoomPassage;
  reciterPeerId: string | null;
  focusedWordId: string | null;
  focusedAyahNumber: number | null;
  peers: Map<string, RoomPeer>;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomState>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getOrCreateRoom(
  roomId: string,
  initialPassage?: Partial<RoomPassage>
): RoomState {
  const normalizedId = roomId.trim().toUpperCase();
  let room = rooms.get(normalizedId);
  if (!room) {
    room = {
      roomId: normalizedId,
      passage: {
        surahNumber: initialPassage?.surahNumber || 1,
        fromAyah: initialPassage?.fromAyah || 1,
        toAyah: initialPassage?.toAyah || 7,
        riwayah: initialPassage?.riwayah || 'hafs',
      },
      reciterPeerId: null,
      focusedWordId: null,
      focusedAyahNumber: null,
      peers: new Map(),
      cleanupTimer: null,
    };
    rooms.set(normalizedId, room);
  }
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
  return room;
}

function serializePeers(room: RoomState) {
  return Array.from(room.peers.values()).map((p) => ({
    peerId: p.peerId,
    name: p.name,
    isMuted: p.isMuted,
    joinedAt: p.joinedAt,
  }));
}

function broadcastToRoom(
  room: RoomState,
  payload: Record<string, unknown>,
  excludePeerId?: string
) {
  const data = JSON.stringify(payload);
  for (const peer of room.peers.values()) {
    if (excludePeerId && peer.peerId === excludePeerId) continue;
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(data);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ratel-tasmee', activeRooms: rooms.size });
  });

  // Create a new 2-person Tasmee room
  app.post('/api/rooms', (req, res) => {
    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }
    const { surahNumber, fromAyah, toAyah, riwayah } = req.body || {};
    const room = getOrCreateRoom(roomId, {
      surahNumber: typeof surahNumber === 'number' ? surahNumber : 1,
      fromAyah: typeof fromAyah === 'number' ? fromAyah : 1,
      toAyah: typeof toAyah === 'number' ? toAyah : 7,
      riwayah:
        riwayah === 'warsh' || riwayah === 'qalun' ? riwayah : 'hafs',
    });

    res.json({
      roomId: room.roomId,
      passage: room.passage,
    });
  });

  // Check room availability
  app.get('/api/rooms/:roomId', (req, res) => {
    const id = req.params.roomId.trim().toUpperCase();
    const room = rooms.get(id);
    if (!room) {
      res.json({ exists: false, peerCount: 0 });
      return;
    }
    res.json({
      exists: true,
      roomId: room.roomId,
      peerCount: room.peers.size,
      passage: room.passage,
    });
  });

  const server = http.createServer(app);

  // WebSocket Server for WebRTC Voice Signaling + Shared Mushaf Sync
  const wss = new WebSocketServer({ server, path: '/ws/tasmee' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentPeerId: string | null = null;

    ws.on('message', (rawMessage) => {
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(rawMessage.toString());
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      if (msg.type === 'room:join') {
        const roomId = String(msg.roomId || '').trim().toUpperCase();
        const peerId = String(msg.peerId || '').trim();
        const name = String(msg.name || 'مشارك').trim().slice(0, 40);

        if (!roomId || !peerId) return;

        const room = getOrCreateRoom(roomId, msg.initialPassage);

        // Enforce 2-person call capacity (allow same peerId to reconnect)
        if (!room.peers.has(peerId) && room.peers.size >= 2) {
          ws.send(
            JSON.stringify({
              type: 'room:full',
              roomId: room.roomId,
            })
          );
          return;
        }

        // Replace previous socket if reconnecting with same peerId
        const existingPeer = room.peers.get(peerId);
        if (existingPeer && existingPeer.ws !== ws) {
          try {
            existingPeer.ws.close();
          } catch {
            // ignore
          }
        }

        currentRoomId = room.roomId;
        currentPeerId = peerId;

        const newPeer: RoomPeer = {
          peerId,
          name,
          isMuted: Boolean(msg.isMuted),
          joinedAt: Date.now(),
          ws,
        };
        room.peers.set(peerId, newPeer);

        // Default first participant as reciter if none assigned
        if (!room.reciterPeerId || !room.peers.has(room.reciterPeerId)) {
          room.reciterPeerId = peerId;
        }

        // Send authoritative room state to the joining peer
        ws.send(
          JSON.stringify({
            type: 'room:state',
            roomId: room.roomId,
            passage: room.passage,
            reciterPeerId: room.reciterPeerId,
            focusedWordId: room.focusedWordId,
            focusedAyahNumber: room.focusedAyahNumber,
            peers: serializePeers(room),
          })
        );

        // Notify the other peer that someone joined (other peer creates WebRTC offer)
        broadcastToRoom(
          room,
          {
            type: 'peer:joined',
            peer: {
              peerId: newPeer.peerId,
              name: newPeer.name,
              isMuted: newPeer.isMuted,
              joinedAt: newPeer.joinedAt,
            },
            peers: serializePeers(room),
            reciterPeerId: room.reciterPeerId,
          },
          peerId
        );
        return;
      }

      if (!currentRoomId || !currentPeerId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      if (msg.type === 'room:update-passage') {
        const p = msg.passage || {};
        room.passage = {
          surahNumber: Number(p.surahNumber) || room.passage.surahNumber,
          fromAyah: Number(p.fromAyah) || 1,
          toAyah: Number(p.toAyah) || 7,
          riwayah:
            p.riwayah === 'warsh' || p.riwayah === 'qalun'
              ? p.riwayah
              : 'hafs',
        };
        room.focusedWordId = null;
        room.focusedAyahNumber = null;

        broadcastToRoom(room, {
          type: 'room:passage-updated',
          passage: room.passage,
          byPeerId: currentPeerId,
        });
        return;
      }

      if (msg.type === 'room:focus-word') {
        room.focusedWordId = msg.wordId ? String(msg.wordId) : null;
        room.focusedAyahNumber =
          typeof msg.ayahNumber === 'number' ? msg.ayahNumber : null;

        broadcastToRoom(room, {
          type: 'room:word-focused',
          wordId: room.focusedWordId,
          ayahNumber: room.focusedAyahNumber,
          byPeerId: currentPeerId,
        });
        return;
      }

      if (msg.type === 'room:swap-roles') {
        const targetReciter = msg.reciterPeerId
          ? String(msg.reciterPeerId)
          : currentPeerId;
        room.reciterPeerId = targetReciter;

        broadcastToRoom(room, {
          type: 'room:roles-updated',
          reciterPeerId: room.reciterPeerId,
        });
        return;
      }

      if (msg.type === 'peer:mute-state') {
        const peer = room.peers.get(currentPeerId);
        if (peer) {
          peer.isMuted = Boolean(msg.isMuted);
          broadcastToRoom(
            room,
            {
              type: 'peer:mute-updated',
              peerId: currentPeerId,
              isMuted: peer.isMuted,
            },
            currentPeerId
          );
        }
        return;
      }

      // WebRTC signaling relay to the other peer
      if (
        msg.type === 'webrtc:offer' ||
        msg.type === 'webrtc:answer' ||
        msg.type === 'webrtc:ice-candidate'
      ) {
        broadcastToRoom(
          room,
          {
            type: msg.type,
            fromPeerId: currentPeerId,
            sdp: msg.sdp,
            candidate: msg.candidate,
          },
          currentPeerId
        );
      }
    });

    ws.on('close', () => {
      if (!currentRoomId || !currentPeerId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      const peer = room.peers.get(currentPeerId);
      if (peer && peer.ws === ws) {
        room.peers.delete(currentPeerId);

        if (room.reciterPeerId === currentPeerId) {
          const remaining = Array.from(room.peers.values())[0];
          room.reciterPeerId = remaining ? remaining.peerId : null;
        }

        broadcastToRoom(room, {
          type: 'peer:left',
          peerId: currentPeerId,
          peers: serializePeers(room),
          reciterPeerId: room.reciterPeerId,
        });

        // Cleanup empty rooms after 10 minutes
        if (room.peers.size === 0) {
          room.cleanupTimer = setTimeout(() => {
            const latest = rooms.get(room.roomId);
            if (latest && latest.peers.size === 0) {
              rooms.delete(room.roomId);
            }
          }, 10 * 60 * 1000);
        }
      }
    });
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
