const onlineUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // Allow user to join their own personal room for targeted notifications
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      
      // Broadcast online users to everyone
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    });

    socket.on('request_online_users', () => {
      socket.emit('get_online_users', Array.from(onlineUsers.keys()));
    });

    // Chat functionality
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on('send_message', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('receive_message', data);
    });

    socket.on('typing', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', data);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('get_online_users', Array.from(onlineUsers.keys()));
      }
    });
  });
};
