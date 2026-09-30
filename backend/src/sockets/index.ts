import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { railwayDataProvider } from '../providers/index.js';
import { getETAPredictionService } from '../services/etaPrediction.service.js';

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Subscribe client to specific train status room
    socket.on('train:subscribe', async (data: { trainNumber: string } | string) => {
      const trainNumber = typeof data === 'string' ? data : data?.trainNumber;
      if (!trainNumber) return;

      const cleanNum = trainNumber.trim();
      const roomName = `train:${cleanNum}`;
      socket.join(roomName);
      logger.info(`Socket ${socket.id} subscribed to room ${roomName}`);

      // Send immediate live status snapshot if available
      const liveStatus = await railwayDataProvider.getTrainLiveStatus(cleanNum);
      if (liveStatus) {
        socket.emit('train:status:update', liveStatus);
      }

      // Send immediate AI ETA prediction if available
      const etaPrediction = await getETAPredictionService(cleanNum);
      if (etaPrediction) {
        socket.emit('train:eta:update', etaPrediction);
      }
    });

    // Unsubscribe client from specific train status room
    socket.on('train:unsubscribe', (data: { trainNumber: string } | string) => {
      const trainNumber = typeof data === 'string' ? data : data?.trainNumber;
      if (!trainNumber) return;

      const roomName = `train:${trainNumber.trim()}`;
      socket.leave(roomName);
      logger.info(`Socket ${socket.id} unsubscribed from room ${roomName}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Attach data provider update listener to broadcast live status to socket rooms
  railwayDataProvider.onUpdate((status) => {
    const roomName = `train:${status.trainNumber}`;
    io.to(roomName).emit('train:status:update', status);
    io.emit('train:status:update:all', status);
  });

  // Periodic ETA prediction broadcasting loop (e.g. every 30 seconds)
  const etaIntervalMs = config.etaPredictionIntervalMs || 30000;
  setInterval(async () => {
    try {
      const adapter = io.sockets.adapter;
      for (const [roomName, roomSet] of adapter.rooms.entries()) {
        if (roomName.startsWith('train:') && roomSet.size > 0) {
          const trainNumber = roomName.replace('train:', '').trim();
          if (trainNumber) {
            const etaResult = await getETAPredictionService(trainNumber);
            if (etaResult) {
              io.to(roomName).emit('train:eta:update', etaResult);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`Error during periodic ETA prediction loop: ${(err as Error).message}`);
    }
  }, etaIntervalMs);

  logger.info(`Socket.IO server foundation initialized with room & AI ETA updates (${etaIntervalMs}ms interval)`);
  return io;
};


