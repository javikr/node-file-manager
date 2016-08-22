var fs = require('co-fs');
var co = require('co');
var fse = require('co-fs-extra');
var path = require('path');
const spawn = require('child_process').spawn;


var FileManager = {};

FileManager.getStats = function *(p) {
  var stats = yield fs.stat(p);
  return {
    folder: stats.isDirectory(),
    size: stats.size,
    mtime: stats.mtime.getTime()
  }
};

FileManager.list = function *(dirPath) {
  var files = yield fs.readdir(dirPath);
  var stats = [];
  for (var i=0; i<files.length; ++i) {
    var fPath = path.join(dirPath, files[i]);
    var stat = yield FileManager.getStats(fPath);
    stat.name = files[i];
    stats.push(stat);
  }
  return stats;
};

FileManager.remove = function *(p) {
  yield fse.remove(p);
};

FileManager.mkdirs = function *(dirPath) {
  yield fse.mkdirs(dirPath);
};

FileManager.move = function *(srcs, dest) {
  for (var i=0; i<srcs.length; ++i) {
    var basename = path.basename(srcs[i]);
    yield fse.move(srcs[i], path.join(dest, basename));
  }
};

FileManager.rename = function *(src, dest) {
  yield fse.move(src, dest);
};

FileManager.zip = function *(folder, zipname) {
  console.log("file manager zip")

  var zipCommand = spawn( 'zip' , ['-r', C.data.root +'/'+ zipname + '.zip', C.data.root + folder.relPath]);
  zipCommand.stdout.on('data', (data) => {
    console.log('ZIPPED OK!');
  });

  zipCommand.stderr.on('data', (data) => {
    console.log('ZIPPED ERROR!');
  });
};

module.exports = FileManager;
