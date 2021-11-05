class Player {
  constructor(videoId, flvFramework, isLive) {
    this.isLive = isLive;
    this.flvjs = flvFramework;
    this.flvPlayer = null;
    this.videoId = videoId;
    this.playUrl = "";
    this.videoElement = null;
    this.attachVideo_();
    // 每10秒检测一次播放情况，预防播放失败的问题
    this.loopTimer = setInterval(this.healtyCheck_.bind(this), 10000);
  }
  play(url) {
    console.log(this.flvPlayer);
    if (this.flvPlayer) {
      this.flvPlayer.play();
      return;
    }
    if (typeof url !== "string") {
      throw new Error("url needed!");
    }
    if (this.flvjs.isSupported()) {
      this.playUrl = url;
      this.fresh(this.playUrl);
    } else {
      console.warn("[[[flvjs not supported!!!!]]]");
    }
  }
  stop() {
    if (this.flvPlayer != null) {
      this.flvPlayer.unload();
      this.flvPlayer.detachMediaElement();
      this.flvPlayer.destroy();
      this.flvPlayer = null;
      this.videoElement = null;
      clearInterval(this.loopTimer);
    }
  }
  pause() {
    this.flvPlayer.pause();
  }
  fresh(url) {
    if (this.flvjs.isSupported()) {
      this.playUrl = url || this.playUrl;
      if (typeof this.playUrl !== "string") {
        throw new Error("url needed!");
      }
      if (!this.playUrl) {
        return;
      }
      this.stop();
      this.attachVideo_();
      this.flvPlayer = this.flvjs.createPlayer({
        type: "flv",
        isLive: this.isLive,
        hasAudio: false,
        config: {
          autoCleanupSourceBuffer: true,
        },
        url: this.playUrl,
      });
      this.flvPlayer.attachMediaElement(this.videoElement);
      this.flvPlayer.load();
      this.flvPlayer.play();
      this.listenEvent_();
    } else {
      console.warn("[[[flvjs not supported!!!!]]]");
    }
  }
  attachVideo_() {
    this.videoElement = document.getElementById(this.videoId);
  }
  // 视频静音状态下最小化浏览器会暂停播放视频；应向前推进
  setStreamForward_() {
    // console.log(this.flvPlayer.buffered.end(0));
    if (this.flvPlayer) {
      try {
        if (this.flvPlayer.buffered.length > 0) {
          const buffered = this.flvPlayer.buffered.end(0) - 0.1;
          if (buffered - this.flvPlayer.currentTime > 1) {
            this.flvPlayer.currentTime = buffered;
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  healtyCheck_() {
    try {
      if (!this.flvPlayer) {
        this.fresh();
        return;
      }
      this.setStreamForward_();
      console.log("[healthy check success]");
    } catch (e) {
      console.log("[healthy check error]", e);
      // 仍然报错，终止播放
      this.stop();
      clearInterval(this.loopTimer);
    }
  }
  listenEvent_() {
    this.flvPlayer.on("error", (e) => {
      console.log("[出错]", e);
      this.fresh();
    });
    this.flvPlayer.on("recovered_early_eof", (e) => {
      console.log("[[recovered_early_eof]]", e);
    });
    this.flvPlayer.on("media_info", (e) => {
      // console.log("[[media_info]]", e);
    });
    this.flvPlayer.on("loading_complete", (e) => {
      this.stop();
    });
    this.flvPlayer.on("metadata_arrived", (e) => {
      // console.log("[[metadata_arrived]]", e);
    });
    this.flvPlayer.on("scriptdata_arrived", (e) => {
      // console.log("[[scriptdata_arrived]]", e);
    });
    this.flvPlayer.on("statistics_info", (e) => {
      // console.log("[[object]]", e);
    });
  }
}
