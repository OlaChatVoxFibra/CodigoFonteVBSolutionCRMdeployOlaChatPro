/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const handleHeartbeat = socket => {
  const userId = socket.user.id;
  const companyId = socket.user.companyId;

  User.update(
    {
      online: true,
      lastSeen: new Date()
    },
    { where: { id: userId } }
  );

  socket.broadcast.to(`company-${companyId}`).emit("user:online", {
    userId,
    lastSeen: new Date()
  });

  clearTimeout(socket.heartbeatTimeout);
  socket.heartbeatTimeout = setTimeout(() => {
    User.update(
      {
        online: false,
        lastSeen: new Date()
      },
      { where: { id: userId } }
    );
    socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
      userId,
      lastSeen: new Date()
    });
  }, 30000);
};

socket.on("connect", async () => {
  const userId = socket.user.id;
  const companyId = socket.user.companyId;

  socket.join(`company-${companyId}`);

  socket.broadcast.to(`company-${companyId}`).emit("user:new", {
    userId,
    user: socket.user
  });

  const onlineUsers = await User.findAll({
    where: {
      companyId,
      online: true
    },
    attributes: ["id", "name", "profileImage", "lastSeen"]
  });

  socket.emit("users:online", onlineUsers);
});

socket.on("heartbeat", () => handleHeartbeat(socket));

socket.on("disconnect", () => {
  const userId = socket.user.id;
  const companyId = socket.user.companyId;

  User.update(
    {
      online: false,
      lastSeen: new Date()
    },
    { where: { id: userId } }
  );

  socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
    userId,
    lastSeen: new Date()
  });
});
