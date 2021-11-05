const childProcess = require("child_process");

function genffmpegArgs(src, dist) {
  const ffmpegArgs = `ffmpeg -i ${src} -vcodec copy -f flv ${dist}`;
}
childProcess.spawn("");
