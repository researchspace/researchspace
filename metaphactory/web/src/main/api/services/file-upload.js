Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
exports.FILEUPLOAD_SERVICEURL = '/file-upload';
var FileUpload = (function () {
    function FileUpload() {
    }
    FileUpload.prototype.uploadFile = function (options) {
        var req = request.post(exports.FILEUPLOAD_SERVICEURL)
            .field('createResourceQuery', options.createResourceQuery)
            .field('generateIdQuery', options.generateIdQuery)
            .field('storage', options.storage)
            .field('metadataExtractor', options.metadataExtractor || '')
            .field('contextUri', options.contextUri)
            .attach('image', options.file)
            .on('progress', function (e) { return options.onProgress(e.percent); });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? new rdf_1.Rdf.Iri(res.header['location']) : null);
        }); }).toProperty();
    };
    FileUpload.prototype.getMimeType = function (file) {
        var fileEnding = file.name.split('.').pop().toLowerCase().trim();
        switch (fileEnding) {
            case 'jpg':
                return 'image/jpeg';
            default:
                return 'application/octet-stream';
        }
    };
    return FileUpload;
}());
exports.FileUploadService = new FileUpload();
