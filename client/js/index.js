"use strict"

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

let local_user_id = Math.random().toString(36).substring(2); // 本地用户ID
let remote_user_id = -1; // 远端用户ID
let room_id = 0;

let local_video = document.querySelector("#local-video");
let remote_video = document.querySelector("#remote-video");

let local_stream = null;
let remote_stream = null;
let pc = null; // RTCPeerConnection

let rtc_engine;

function handle_ice_candidate(event) {
    console.info("handle_ice_candidate");
    if (event.candidate) {
        let json_msg = {
            "cmd": SIGNAL_TYPE_CANDIDATE,
            "room_id": room_id,
            "uid": local_user_id,
            "remote_uid": remote_user_id,
            "msg": JSON.stringify(event.candidate)
        };
        let msg = JSON.stringify(json_msg);
        rtc_engine.send_message(msg);
        console.info("handle ice candidate message: " + msg);
    }
    else {
        console.warn("End of candidates");
    }
}

function handle_remote_stream_add(event) {
    console.info("handle_remote_stream_add");
    remote_stream = event.streams[0];
    remote_video.srcObject = remote_stream;
}
function create_peer_connection() {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handle_ice_candidate;
    pc.ontrack = handle_remote_stream_add;
    local_stream.getTracks().forEach(track => pc.addTrack(track, local_stream));
}

function on_create_offer(session) {
    pc.setLocalDescription(session)
        .then(function () {
            let json_msg = {
                "cmd": SIGNAL_TYPE_OFFER,
                "room_id": room_id,
                "uid": local_user_id,
                "remote_uid": remote_user_id,
                "msg": JSON.stringify(session)
            }
            let msg = JSON.stringify(json_msg);
            rtc_engine.send_message(msg);
            console.info("send offer message: " + msg);
        })
        .catch(function (error) {
            console.error("offer setLocalDescription error: " + error);
        });
}

function on_create_answer(session) {
    pc.setLocalDescription(session)
        .then(function () {
            let json_msg = {
                "cmd": SIGNAL_TYPE_ANSWER,
                "room_id": room_id,
                "uid": local_user_id,
                "remote_uid": remote_user_id,
                "msg": JSON.stringify(session)
            }
            let msg = JSON.stringify(json_msg);
            rtc_engine.send_message(msg);
            console.info("send answer message: " + msg);
        })
        .catch(function (error) {
            console.error("offer setLocalDescription error: " + error);
        });
}

function handle_create_offer_error(error) {
    console.error("handle create offer error: " + error);
}

function handle_create_answer_error(error) {
    console.error("handle create answer error: " + error);
}

let RTCEngine = function (wsurl) {
    this.init(wsurl);
    rtc_engine = this;
    return this;
};

RTCEngine.prototype.init = function (wsurl) {
    // 设置websocket url
    this.wsurl = wsurl;
    // 存储websocket对象
    this.signal = null;
};

RTCEngine.prototype.create_websocket = function () {
    rtc_engine = this;
    rtc_engine.signal = new WebSocket(this.wsurl);

    rtc_engine.signal.onopen = function () {
        rtc_engine.on_open();
    };
    rtc_engine.signal.onmessage = function (ev) {
        rtc_engine.on_message(ev);
    };
    rtc_engine.signal.onerror = function (ev) {
        rtc_engine.on_error(ev);
    };
    rtc_engine.signal.onclose = function (ev) {
        rtc_engine.on_close(ev);
    }

};

RTCEngine.prototype.on_open = function () {
    console.log("websocket open");
};

RTCEngine.prototype.on_message = function (event) {
    console.log("on_message: " + event.data);

    let json_msg = JSON.parse(event.data);
    switch (json_msg.cmd) {
        case SIGNAL_TYPE_NEW_PEER:
            handle_remote_new_peer(json_msg);
            break;
        case SIGNAL_TYPE_RESP_JOIN:
            handle_remote_response_join(json_msg);
            break;
        case SIGNAL_TYPE_PEER_LEAVE:
            handle_remote_peer_leave(json_msg);
            break;
        case SIGNAL_TYPE_OFFER:
            handle_remote_offer(json_msg);
            break;
        case SIGNAL_TYPE_ANSWER:
            handle_remote_answer(json_msg);
            break;
        case SIGNAL_TYPE_CANDIDATE:
            handle_remote_candidate(json_msg);
            break;
    }
};

RTCEngine.prototype.on_error = function (event) {
    console.log("on_error: " + event.data);
};

RTCEngine.prototype.on_close = function (event) {
    console.log("on_close -> code: " + event.code + ", reason: " + EventTarget.reason);
}

RTCEngine.prototype.send_message = function (message) {
    this.signal.send(message);
};

function handle_remote_new_peer(message) {
    console.info("handle remote new peer uid: " + message.remote_uid);
    remote_user_id = message.remote_uid;
    do_offer();
}

function handle_remote_response_join(message) {
    console.info("handle remote new peer uid: " + message.remote_uid);
    remote_user_id = message.remote_uid;
}

function handle_remote_peer_leave(message) {
    remote_video.srcObject = null;
    alert("对方退出了房间");
}

function handle_remote_offer(message) {
    console.info("handle remote offer");
    if (pc == null) {
        create_peer_connection();
    }
    let description = JSON.parse(message.msg)
    pc.setRemoteDescription(description).then().catch();
    do_answer();
}

function handle_remote_answer(message) {
    console.info("handle remote answer");
    let description = JSON.parse(message.msg);
    pc.setRemoteDescription(description).then().catch();
}

function handle_remote_candidate(message) {
    console.info("handle remote candidate");
    let candidate = JSON.parse(message.msg);
    pc.addIceCandidate(candidate).then().catch(e => {
        console.error("add ice candidate error" + e.name);
    });
}

function do_offer() {
    // 创建RTCPeerConnection
    if (pc == null) {
        create_peer_connection();
    }
    pc.createOffer().then(on_create_offer).catch(handle_create_offer_error);
}

function do_answer() {
    pc.createAnswer().then(on_create_answer).catch(handle_create_answer_error);
}

function do_join(room_id) {
    let json_msg = {
        "cmd": SIGNAL_TYPE_JOIN,
        "room_id": room_id,
        "uid": local_user_id
    };
    let msg = JSON.stringify(json_msg);
    rtc_engine.send_message(msg);
    console.info("do join message: " + msg);
}

function do_leave(room_id) {
    let json_msg = {
        "cmd": SIGNAL_TYPE_LEAVE,
        "room_id": room_id,
        "uid": local_user_id
    };
    let msg = JSON.stringify(json_msg);
    rtc_engine.send_message(msg);
    console.info("do leave message: " + msg);
}

function open_local_stream(stream) {
    console.log("open local stream");
    do_join(room_id);
    local_stream = stream;
    local_video.srcObject = stream;
}
function init_local_stream() {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(open_local_stream).catch(function (e) {
       alert("本地视频获取失败");
       console.log("error" + e.name);
    });
}

rtc_engine = new RTCEngine("ws://47.92.208.18:8010");
rtc_engine.create_websocket();

document.getElementById("join-btn").onclick = function () {
    room_id = document.getElementById("room-id").value;
    if (room_id === "" || room_id === "请输入房间ID") {
        alert("请输入房间ID");
        return;
    }
    console.log("加入房间" + room_id);
    // 初始化本地码流
    init_local_stream();
};

document.getElementById("leave-btn").onclick = function () {
    console.log("离开房间");
    do_leave(room_id);
}