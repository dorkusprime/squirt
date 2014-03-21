var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs');
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

var port = 1337;

http.createServer(function(req, res) {
  var uri = url.parse(req.url).pathname;
  var filename = path.join(process.cwd(), uri);
  fs.exists(filename, function(exists) {
    if(exists) {
      console.log('Serving file: ' + filename);
      var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
      res.writeHead(200, mimeType);
      var fileStream = fs.createReadStream(filename);
      fileStream.pipe(res);
    } else {
      console.log('NOT_FOUND for file: ' + filename);
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('404 Not Found\n');
      res.end();
    }
  }); //end fs.exists
}).listen(port, function() {
  console.log('Server listening on port ' + port);
});
