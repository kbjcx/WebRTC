const MESSAGE_TYPE_OFFER = 0x01;
const MESSAGE_TYPE_ANSWER = 0x02;
const MESSAGE_TYPE_CANDIDATE = 0x03;
const MESSAGE_TYPE_HANGUP = 0x04;
// join 主动加入房间
// leave 主动离开房间
// new-peer 有人加入房间, 通知其他用户
// peer-leave 有人离开房间, 通知其他用户
// offer 发送offer给对端peer
// answer 发送offer给对端peer
// candidate 发送candidate给对端peer

const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join"; // 告知对方加入者是谁
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

let RTCMap = function () {
   this._entrys = [];

   this.put = function (key, value) {
      if (key == null || key == undefined) {
         return;
      }
      let index = this._get_index(key);
      if (index === -1) {
         let entry = {};
         entry.key = key;
         entry.value = value;
         this._entrys[this._entrys.length] = entry;
      }
      else {
         this._entrys[index].value = value;
      }
   };

   this.get = function (key) {
      let index = this._get_index(key);
      return (index !== -1) ? this._entrys[index].value : null;
   };

   this.remove = function (key) {
      let index = this._get_index(key);
      if (index !== -1) {
         this._entrys.splice(index, 1);
      }
   };

   this.clear = function () {
      this._entrys.length = 0;
   };

   this.contains = function (key) {
      let index = this._get_index(key);
      return index !== -1;
   };

   this.size = function () {
      return this._entrys.length;
   };

   this.get_entrys = function () {
      return this._entrys;
   };

   this._get_index = function (key) {
      if (key == null || key == undefined) {
         return -1;
      }
      let _length = this._entrys.length;
      for (let i = 0; i < _length; ++i) {
         let entry = this._entrys[i];
         if (entry == null || entry == undefined) {
            continue;
         }
         if (entry.key === key) {
            return i;
         }
      }
      return -1;
   };
}

let Client = function (uid, connection, room_id) {
   this.uid = uid;
   this.connection = connection;
   this.room_id = room_id;
}

let room_table_map = new RTCMap();

let ws = require("nodejs-websocket");
let port = 8010;

function handle_join(connection, message) {
   let room_id = message.room_id;
   let uid = message.uid;
   console.info("uid: " + uid + "join room: " + room_id);

   let room_map = null;

   if (!room_table_map.contains(room_id)) {
      room_map = new RTCMap();
      room_table_map.put(room_id, room_map);
   }
   else if (room_table_map.size() >= 2) {
      console.error("房间" + room_id + "已满");
      // TODO 报告客户端房间已满
      return;
   }
   else {
      room_map = room_table_map.get(room_id);
   }

   let client = new Client(uid, connection, room_id);
   room_map.put(uid, client);

   if (room_map.size() > 1) {
      // 房间里已经有人了, 需要通知对方
      let clients = room_map.get_entrys();
      for (let i in clients) {
         let remote_uid = clients[i].key;
         if (remote_uid !== uid) {
            let json_msg = {
               "cmd": SIGNAL_TYPE_NEW_PEER,
               "remote_uid": uid
            };
            let msg = JSON.stringify(json_msg);
            let remote_client = room_map.get(remote_uid);
            console.log("new-peer: " + msg);
            remote_client.connection.sendText(msg);

            json_msg = {
               "cmd": SIGNAL_TYPE_RESP_JOIN,
               "remote_uid": remote_uid
            };
            msg = JSON.stringify(json_msg);
            console.log("resp-join: " + msg);
            connection.sendText(msg);
         }
      }
   }
}

function handle_leave(message) {
   let room_id = message.room_id;
   let uid = message.uid;

   console.info("uid: " + uid + "leave room " + room_id);
   if (!room_table_map.contains(room_id)) {
      console.error("无法找到房间");
      return;
   }
   let room_map = room_table_map.get(room_id);
   room_map.remove(uid); // 删除发送者
   // 将消息发送给其他人
   if (room_map.size() > 0) {
      let clients = room_map.get_entrys();
      for (let i in clients) {
         let json_msg = {
            "cmd": SIGNAL_TYPE_PEER_LEAVE,
            "remote_uid": uid
         };
         let msg = JSON.stringify(json_msg);
         let remote_uid = clients[i].key;
         let remote_client = room_map.get(remote_uid);
         console.info("notify peer " + remote_uid + ", uid: " + uid + "leave");
         remote_client.connection.sendText(msg);
      }
   }
}

function handle_offer(message) {
   let room_id = message.room_id;
   let uid = message.uid;
   let remote_uid = message.remote_uid;

   if (!room_table_map.contains(room_id)) {
      console.error("handle offer can't find room " + room_id);
      return;
   }
   let room_map = room_table_map.get(room_id);
   if (!room_map.contains(uid)) {
      console.error("handle offer can't find uid " + uid);
      return;
   }

}

// 创建一个连接
let server = ws.createServer(function (connection) {
   console.log("创建一个新的连接----");
   // 向客户端推送消息
    connection.on("text", function (str) {
       console.info("receive msg: " + str);
       let json_msg = JSON.parse(str);

       switch (json_msg.cmd) {
          case SIGNAL_TYPE_JOIN:
             handle_join(connection, json_msg);
             break;
          case SIGNAL_TYPE_LEAVE:
             handle_leave(json_msg);
             break;
          case SIGNAL_TYPE_OFFER:
             handle_offer(json_msg);
             break;
          case SIGNAL_TYPE_ANSWER:
             handle_answer(json_msg);
             break;
          case SIGNAL_TYPE_CANDIDATE:
             handle_candidate(json_msg);
             break;
       }
    });

    // 监听关闭连接的操作
   connection.on("close", function (code, reason) {
      console.info("连接关闭 code: " +code + ", reason" +reason);
   });

   // 错误处理
   connection.on("error", function (error) {
      console.log("监听到错误");
      console.log(error);
   });
}).listen(port);
