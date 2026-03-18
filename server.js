const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// A simple in-memory storage for rooms
// rooms = { [roomId]: { players: [socketId1, socketId2], spectators: [] } }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create_room', (data, callback) => {
    // Generate a simple 4 letter room code
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.join(roomId);
    
    rooms[roomId] = { players: [{ id: socket.id, color: 'w' }] };
    console.log(`Room ${roomId} created by ${socket.id}`);
    
    // Send back the room ID and color
    if (typeof callback === 'function') {
      callback({ roomId, color: 'w' });
    }
  });

  socket.on('join_room', (roomId, callback) => {
    roomId = roomId.toUpperCase();
    const room = rooms[roomId];
    
    if (room) {
      if (room.players.length === 1) {
        socket.join(roomId);
        room.players.push({ id: socket.id, color: 'b' });
        console.log(`User ${socket.id} joined room ${roomId}`);
        
        socket.to(roomId).emit('opponent_joined', { message: 'Opponent connected!' });
        
        if (typeof callback === 'function') {
          callback({ success: true, color: 'b' });
        }
      } else {
        // Room full, join as spectator (optional feature, maybe ignore for now)
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Room is full' });
        }
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Room not found' });
      }
    }
  });

  socket.on('move', (data) => {
    // Broadcast the move to everyone else in the room
    const { roomId, move } = data;
    socket.to(roomId).emit('move', move);
  });

  socket.on('chat_message', (data) => {
    const { roomId, message, role } = data;
    socket.to(roomId).emit('chat_message', { message, role });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Clean up rooms on disconnect
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.to(roomId).emit('opponent_disconnected');
        
        // Remove room if empty
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted`);
        }
        break;
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
