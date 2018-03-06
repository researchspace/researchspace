Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var ReactDropzone = require("react-dropzone");
var ReactBootstrap = require("react-bootstrap");
var D = React.DOM;
var navigation_1 = require("platform/api/navigation");
var rdf_1 = require("platform/api/rdf");
var alert_1 = require("platform/components/ui/alert");
var maybe = require("data.maybe");
var Kefir = require("kefir");
var file_upload_1 = require("platform/api/services/file-upload");
var Dropzone = React.createFactory(ReactDropzone);
var ProgressBar = React.createFactory(ReactBootstrap.ProgressBar);
var FileUpload = (function (_super) {
    tslib_1.__extends(FileUpload, _super);
    function FileUpload(props) {
        var _this = _super.call(this) || this;
        _this.performPostAction = function (newFileIri) {
            if (!_this.props.postAction || _this.props.postAction === 'reload') {
                navigation_1.refresh();
            }
            else if (_this.props.postAction === 'redirect') {
                navigation_1.navigateToResource(newFileIri).onValue(function (v) { return v; });
            }
            else {
                navigation_1.navigateToResource(rdf_1.Rdf.iri(_this.props.postAction)).onValue(function (v) { return v; });
            }
        };
        _this.state = {
            alertState: maybe.Nothing(),
            progress: maybe.Nothing(),
            progressText: maybe.Nothing(),
            showOptions: false,
        };
        return _this;
    }
    FileUpload.prototype.componentDidMount = function () {
        var _this = this;
        this.messages = Kefir.pool();
        this.messages.onValue(function (v) {
            var message = _this.state.alertState.isJust ? _this.state.alertState.get().message : '';
            _this.setState({
                alertState: maybe.Just({
                    alert: alert_1.AlertType.WARNING,
                    message: message + v,
                }),
            });
        });
    };
    FileUpload.prototype.onDrop = function (files) {
        var _this = this;
        this.setState({
            alertState: maybe.Nothing(),
            progress: maybe.Nothing(),
        });
        var file = files[0];
        var contentType = _.isEmpty(this.props) || _.isEmpty(this.props.contentType)
            ? file_upload_1.FileUploadService.getMimeType(file)
            : this.props.contentType;
        var upload = file_upload_1.FileUploadService.uploadFile({
            createResourceQuery: this.props.createResourceQuery,
            generateIdQuery: this.props.generateIdQuery,
            storage: this.props.storage,
            metadataExtractor: this.props.metadataExtractor,
            contextUri: this.props.contextUri,
            file: file,
            contentType: contentType,
            onProgress: function (percent) { return _this.setState({
                progress: maybe.Just(percent),
                progressText: maybe.Just('Uploading ...'),
            }); },
        });
        upload.onValue(this.performPostAction).onError(function (error) {
            return _this.messages.plug(Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>'));
        });
    };
    FileUpload.prototype.render = function () {
        var _this = this;
        var description = _.isEmpty(this.props) || _.isEmpty(this.props.description)
            ? 'Please drag&drop your image file(s) here.'
            : this.props.description;
        return D.div({ style: { width: '50%' } }, this.state.alertState.map(function (value) { return React.createElement(alert_1.Alert, value); }).getOrElse(null), this.state.progress.map(function (progress) { return ProgressBar({
            active: true, min: 0, max: 100, now: progress,
            label: _this.state.progressText.getOrElse('Uploading Files'),
        }); }).getOrElse(null), Dropzone({ onDrop: this.onDrop.bind(this) }, D.div({ className: 'text-center' }, description)));
    };
    return FileUpload;
}(React.Component));
exports.FileUpload = FileUpload;
exports.default = FileUpload;
