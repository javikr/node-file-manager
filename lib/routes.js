var fs = require('co-fs');
var path = require('path');
var views = require('co-views');
var origFs = require('fs');
var koaRouter = require('koa-router');
var bodyParser = require('koa-bodyparser');
var formParser = require('co-busboy');
const spawn = require('child_process').spawn;
const outSpoty = origFs.openSync('./spotify_ripper.log', 'a');
const errSpoty = origFs.openSync('./spotify_ripper_error.log', 'a');
var userid = require('userid');

var Tools = require('./tools');
var FilePath = require('./fileMap').filePath;
var FileManager = require('./fileManager');

var router = new koaRouter();
var render = views(path.join(__dirname, './views'), {map: {html: 'ejs'}});

router.get('/', function *() {
  this.redirect('files');
});

router.post('/addSpotifyDownload', function *() {
  var uri = this.query.uri;
  var command = 'nohup spotify-ripper -l ' + uri + ' &';
  var commandIsolated = 'nohup';
  var params = ['spotify-ripper', '-l', uri, '&'];
  console.log( 'command -> ' + command );
  console.log('uid -> ' + userid.uid('server'));
  console.log('gid -> ' + userid.gid('server'));

  var opts = {
    detached: true,
    uid: userid.uid('server'),
    gid: userid.gid('server'),
    stdio: [ 'ignore', outSpoty, errSpoty ]
  };

  const exec = spawn( commandIsolated , params, opts);

  exec.unref();
  /*
  exec.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

  exec.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});
*/

  this.status = 200;
  this.body = "Downloading " + uri + '...';
});

router.get('/files', function *() {
  this.body = yield render('files');
});

router.get('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, function *() {
  var p = this.request.fPath;
  var stats = yield fs.stat(p);
  if (stats.isDirectory()) {
    this.body = yield * FileManager.list(p);
  }
  else {
    //this.body = yield fs.createReadStream(p);
    this.body = origFs.createReadStream(p);
  }
});

router.del('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, function *() {
  var p = this.request.fPath;
  yield * FileManager.remove(p);
  this.body = 'Delete Succeed!';
});

router.put('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, bodyParser(), function* () {
  var type = this.query.type;
  var p = this.request.fPath;
  if (!type) {
    this.status = 400;
    this.body = 'Lack Arg Type'
  }
  else if (type === 'MOVE') {
    var src = this.request.body.src;
    if (!src || ! (src instanceof Array)) return this.status = 400;
    var src = src.map(function (relPath) {
      return FilePath(relPath);
    });
    yield * FileManager.move(src, p);
    this.body = 'Move Succeed!';
  }
  else if (type === 'RENAME') {
    var target = this.request.body.target;
    if (!target) return this.status = 400;
    yield * FileManager.rename(p, FilePath(target));
    this.body = 'Rename Succeed!';
  }
  else {
    this.status = 400;
    this.body = 'Arg Type Error!';
  }
});

router.post('/api/(.*)', Tools.loadRealPath, Tools.checkPathNotExists, function *() {
  var type = this.query.type;
  var p = this.request.fPath;
  if (!type) {
    this.status = 400;
    this.body = 'Lack Arg Type!';
  }
  else if (type === 'CREATE_FOLDER') {
    yield * FileManager.mkdirs(p);
    this.body = 'Create Folder Succeed!';
  }
  else if (type === 'UPLOAD_FILE') {
    var formData = yield formParser(this.req);
    if (formData.fieldname === 'upload'){
      var writeStream = origFs.createWriteStream(p);
      formData.pipe(writeStream);
      this.body = 'Upload File Succeed!';
    }
    else {
      this.status = 400;
      this.body = 'Lack Upload File!';
    }
  }
  else {
    this.status = 400;
    this.body = 'Arg Type Error!';
  }
});

module.exports = router.middleware();