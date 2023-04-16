let ws = require("nodejs-websocket");
let port = 8010;
let user = 0;

// 创建一个连接
let server = ws.createServer(function (connection) {
   console.log("创建一个新的连接----");
   user++;
   connection.nickname = "user" + user;
   connection.fd = "user" + user;
   let msg = {};
   msg.type = "enter";
   msg.data = connection.nickname + "进来啦";
   broadcast(JSON.stringify(msg));

   // 向客户端推送消息
    connection.on("text", function (str) {
       console.log("回复" + str);
       msg.type = "message";
       msg.data = connection.nickname + " 说: " + str;
       broadcast(JSON.stringify(msg));
    });

    // 监听关闭连接的操作
   connection.on("close", function (code, reason) {
      console.log("关闭连接");
      msg.type = "leave";
      msg.data = connection.nickname + "离开了";
      broadcast(JSON.stringify(msg));
   });

   // 错误处理
   connection.on("error", function (error) {
      console.log("监听到错误");
      console.log(error);
   });
}).listen(port);

// 广播函数
function broadcast(str) {
   server.connections.forEach(function (connection) {
      connection.sendText(str);
   })
}