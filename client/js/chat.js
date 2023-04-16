// const constraints = {
//     video: true,
//     audio: true
// }
//
// // 处理打开摄像头成功
// function handle_success(stream) {
//     const video = document.querySelector("#local-video");
//     video.srcObject = stream;
// }
//
// // 摄像头打开异常处理
// function handle_error(error) {
//     console.log("getUserMedia error" + error);
// }
//
// function on_open_camera(e) {
//     navigator.mediaDevices.getUserMedia(constraints)
//         .then(handle_success)
//         .catch(handle_error)
// }
//
// document.querySelector("#show-video").addEventListener("click", on_open_camera);

function show_message(str, type) {
    let div = document.createElement("div");
    div.innerHTML = str;
    if (type === "enter") {
        div.style.color = "blue";
    }
    else if (type === "leave") {
        div.style.color = "red";
    }
    document.body.appendChild(div);
}

// 新建一个websocket
let websocket = new WebSocket("ws://47.92.208.18:8010");
// 打开websocket连接
websocket.onopen = function () {
    console.log("已经连接上服务器");
    document.getElementById("submit-btn").onclick = function () {
        let txt = document.getElementById("send-msg").value;
        if (txt) {
            // 向服务器发送数据
            websocket.send(txt);
        }
        document.getElementById("send-msg").value = "";
    };
};

// 关闭连接
websocket.onclose = function () {
    console.log("websocket close");
};

// 接收服务器返回的数据
websocket.onmessage = function (e) {
    let msg = JSON.parse(e.data);
    show_message(msg.data, msg.type);
}
