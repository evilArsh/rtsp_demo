<template>
  <div class="videoContainer">
    <div class="opera">
      <button @click="start">开始</button>
      <button @click="end">结束</button>
      <button @click="pause">{{paused}}</button>
      <button @click="detect">人脸识别</button>
      <button @click="stopDetect">停止识别</button>
      <button @click="setting">设置</button>
    </div>
    <video
      ref="video"
      class="video"
    ></video>
    <canvas
      class="cvs"
      ref="cvs"
    >
    </canvas>
    <canvas
      class="_cvs"
      ref="_cvs"
    ></canvas>
  </div>
</template>

<script>
// var videojs = require("video.js");
// require("videojs-flash");
// require("video.js/dist/video-js.min.css");
import Live from "../../utils/ffmpeg";

import { mapActions, mapState } from "vuex";
var flvjs = require("flv.js");
export default {
  props: ["input"],
  data: () => {
    return {
      _inputUri: null,
      isUse: false,
      _streamUri: "",
      liveObj: null,
      mutex: 1,
      oldStreamUri: "",
      flvPlayer: null,
      isPause: null,
      // 暂停和继续
      paused: "暂停",
      interval: null
    };
  },
  watch: {
    mutex(val) {
      console.log("[mutex]", val);
    },
    isPause(val) {
      if (val == true) {
        this.paused = "继续";
      } else {
        this.paused = "暂停";
      }
    },
    inputUri(news, old) {
      for (var d in news) {
        if (news[d].inputUri == this._inputUri) {
          this.isUse = news[d].isUse;
        }
      }
    },
    streamUri(news, old) {
      for (var d in news) {
        if (news[d].inputUri == this._inputUri) {
          this.oldStreamUri = this._streamUri;
          this._streamUri = news[d].uri;
          //避免 反复启动 导致flv报错
          if (this.oldStreamUri != this._streamUri) {
            this.beginStream();
          }
        }
      }
    },
    onresize(news, old) {
      // 窗口改变
      this.resizeCvs();
    }
  },
  computed: {
    onresize() {
      return this.$store.state.style.resize;
    },
    streamUri() {
      return this.$store.state.ffmpeg.streamUri;
    },
    inputUri() {
      return this.$store.state.ffmpeg.inputUri;
    }
  },
  mounted(e) {
    this.initData();
    this.resizeCvs();
  },
  activated() {
    this.pause();
  },
  deactivated() {
    this.pause();
  },
  name: "cpvideo",
  components: {},
  methods: {
    ...mapActions([
      "notice",
      "setStreamUri",
      "setInputStatus",
      "delStreamUri"
    ]),
    // 初始化数据，从props获取的
    initData: function() {
      this._inputUri = this.input.inputUri;
      this.isUse = this.input.isUse;
    },
    start: function() {
      console.log("[开始按钮 isUse]", this.isUse);
      console.log("[开始按钮 mutex]", this.mutex);
      // 当前设备没在使用
      if (this.isUse == false) {
        //第一次使用
        if (this.mutex <= 0) {
          return;
        }
        this.mutex--;
        this.liveObj = new Live(this._inputUri);
        console.log("[摄像头启动]", this);
      }
    },
    end: function() {
      if (this.mutex <= 0) {
        return;
      }
      if (this.liveObj != null) {
        this.liveObj.command.kill();
        this.liveObj = null;
        this.oldStreamUri = "";
        this._streamUri = "";
      }
      if (this.flvPlayer != null) {
        this.delStreamUri(this._inputUri);
        this.flvPlayer.unload();
        this.flvPlayer.detachMediaElement();
        this.flvPlayer.destroy();
        this.flvPlayer = null;
      }
    },
    pause: function() {
      if (this.flvPlayer != null) {
        if (this.isPause == true) {
          this.isPause = false;
          this.flvPlayer.play();
        } else if (this.isPause == false) {
          this.flvPlayer.pause();
          this.isPause = true;
        }
      }
    },
    screenShoot: function() {},
    setting: function() {},

    screenshot() {
      if (this.isUse != true || this.isPause != false) {
        this.notice("摄像头未打开，不能进行图像采集");
        return null;
      }
      var ctx = this.$refs._cvs.getContext("2d");
      ctx.drawImage(
        this.$refs.video,
        0,
        0,
        this.$refs._cvs.width,
        this.$refs._cvs.height
      );
      var img = this.$refs._cvs.toDataURL("image/jpg");
      return img;
    },
    drawRect(x = 0, y = 20, width = 20, height = 20) {
      var _this = this;
      var ctx = this.$refs.cvs.getContext("2d");
      // this.__clearRect(ctx);
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(255,0,0)";
      ctx.rect(x, y, width, height);
      ctx.stroke();
      ctx.closePath();
    },
    __clearRect(ctx) {
      if (typeof ctx == "undefined") {
        ctx = this.$refs.cvs.getContext("2d");
      }
      ctx.clearRect(0, 0, this.$refs.cvs.width, this.$refs.cvs.height);
    },
    stopDetect() {
      if (this.interval != null) {
        window.clearInterval(this.interval);
        this.__clearRect();
      }
    },
    detect() {
      const _this = this;
      this.stopDetect();
      this.interval = window.setInterval(function() {
        var img = _this.screenshot();
        if (img != null) {
          _this.$face.detect(img).then(function(res) {
            _this.__clearRect();
            if (res.data.success == true) {
              for (var i = 0; i < res.data.package.length; i++) {
                var pkg = res.data.package[i];
                var p = pkg.pos.split(".");
                 console.log(pkg.name);
                _this.drawRect(p[0], p[1], p[2] - p[0], p[3] - p[1]);
              }
            }
          });
        }
      }, 600);
    },

    beginStream: function() {
      const _this = this;
      const uri = this._streamUri;
      if (uri == null || uri.length == 0) {
        console.log("[当前http-flv流为空]");
        return;
      }
      if (flvjs.isSupported()) {
        var videoElement = this.$refs.video;
        var flvPlayer = flvjs.createPlayer({
          type: "flv",
          isLive: true,
          url: uri
        });
        flvPlayer.attachMediaElement(videoElement);
        flvPlayer.load();
        flvPlayer.play();
        this.isPause = false;
        flvPlayer.on("error", function(e) {
          console.log("[摄像头出错]", e);
          _this.runMsg("摄像头出错");
          // 删掉当前已经入栈vuex streamUri的元素
          _this.end();
          _this.mutex++;
          _this.setInputStatus({
            inputUri: _this._inputUri,
            isUse: false
          });
        });
        // flvPlayer.on("recovered_early_eof", function(e) {
        //   console.log("object", e);
        // });
        // flvPlayer.on("media_info", function(e) {
        //   console.log("object", e);
        // });
        flvPlayer.on("loading_complete", function(e) {
          // 判断当前流是否断开
          _this.end();
        });
        flvPlayer.on("metadata_arrived", function(e) {
          if (e.Server.length > 0) {
            _this.mutex++;
          }
          // Server:"NGINX HTTP-FLV (https://github.com/winshining/nginx-http-flv-module)"
          // audiocodecid:0
          // audiodatarate:0
          // displayHeight:1536
          // displayWidth:2560
          // duration:0
          // fps:25
          // framerate:25
          // height:1536
          // level:""
          // profile:""
          // videocodecid:7
          // videodatarate:0
          // width:2560
        });
        // flvPlayer.on("scriptdata_arrived", function(e) {
        //   console.log("object", e);
        // });
        // flvPlayer.on("statistics_info", function(e) {
        //   // console.log("object", e);
        // });

        this.flvPlayer = flvPlayer;
      }
    },
    // 发生重绘时 根据video的改变重绘canvas
    resizeCvs: function() {
      var rect = this.$refs.video.getBoundingClientRect();
      this.$refs.cvs.width = rect.width;
      this.$refs.cvs.height = rect.height;
      this.$refs._cvs.width = rect.width;
      this.$refs._cvs.height = rect.height;
    }
  },
  beforeDestroy: function() {}
};
</script>
<style lang="scss" scoped>
.videoContainer {
  width: 100%;
  height: 100%;
  position: relative;
}
.opera {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 999;
}
.video {
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.cvs {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}
._cvs {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  display: none;
}
</style>
