const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const app = express();
const httpserver = http.createServer(app);
const io = new Server(httpserver);
const publicRooms = new Set(["india", "pakistan", "china"]);
const users = new Map();
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "client.html")));
function updateCount(room) { io.to(room).emit("room-count", io.sockets.adapter.rooms.get(room)?.size || 0); }
io.on("connection", socket => {
  users.set(socket.id, { name: `Guest-${socket.id.slice(0, 5)}`, room: null });
  socket.on("join-room", room => {
    if (!publicRooms.has(room)) return;
    const user = users.get(socket.id);
    if (user.room) { const old = user.room; socket.leave(old); updateCount(old); }
    user.room = room; socket.join(room); updateCount(room);
  });
  socket.on("msg", message => {
    const user = users.get(socket.id);
    if (!user?.room || !publicRooms.has(user.room) || typeof message?.text !== "string") return;
    const text = message.text.trim().slice(0, 500); if (!text) return;
    socket.to(user.room).emit("message", { text, name: String(message.name || user.name).slice(0, 24), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
  });
  socket.on("typing", () => { const room = users.get(socket.id)?.room; if (room) socket.to(room).emit("typing"); });
  socket.on("disconnect", () => { const room = users.get(socket.id)?.room; users.delete(socket.id); if (room) updateCount(room); });
});
httpserver.listen(8080, () => console.log("Gather is running at http://localhost:8080"));
