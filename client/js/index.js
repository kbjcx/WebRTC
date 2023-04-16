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

const constraints = {
    video: true,
    audio: true
}

// 处理打开摄像头成功
function handle_success(stream) {
    const video = document.querySelector("#local-video");
    video.srcObject = stream;
}

// 摄像头打开异常处理
function handle_error(error) {
    console.log("getUserMedia error" + error);
}

// function on_open_camera(e) {
//     navigator.mediaDevices.getUserMedia(constraints)
//         .then(handle_success)
//         .catch(handle_error)
// }

window.onload = function () {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handle_success)
        .catch(handle_error);
};

document.querySelector("#turnoff-video").addEventListener("click", function () {
    document.querySelector('#local-video').srcObject = null;
});

document.querySelector("#show-video").addEventListener("click", function () {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(handle_success)
            .catch(handle_error)
});