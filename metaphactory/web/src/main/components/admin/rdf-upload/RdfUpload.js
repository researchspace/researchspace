Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var ReactBootstrap = require("react-bootstrap");
var maybe = require("data.maybe");
var moment = require("moment");
var Kefir = require("kefir");
var ReactDropzone = require("react-dropzone");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var rdf_graph_store_1 = require("platform/api/services/rdf-graph-store");
var alert_1 = require("platform/components/ui/alert");
var Dropzone = react_1.createFactory(ReactDropzone);
var ProgressBar = react_1.createFactory(ReactBootstrap.ProgressBar);
var Input = react_1.createFactory(ReactBootstrap.FormControl);
var Panel = react_1.createFactory(ReactBootstrap.Panel);
var Checkbox = react_1.createFactory(ReactBootstrap.Checkbox);
var RdfUpload = (function (_super) {
    tslib_1.__extends(RdfUpload, _super);
    function RdfUpload() {
        var _this = _super.call(this) || this;
        _this.onChangeTargetGraph = function (e) {
            e.stopPropagation();
            e.preventDefault();
            var val = e.target.value.trim();
            if (!_.isEmpty(val)) {
                _this.setState({ targetGraph: maybe.Just(val) });
            }
        };
        _this.onChangeKeepSourceGraphs = function (e) {
            _this.setState({ keepSourceGraphs: e.target.checked });
        };
        _this.state = {
            alertState: maybe.Nothing(),
            progress: maybe.Nothing(),
            progressText: maybe.Nothing(),
            targetGraph: maybe.Nothing(),
            keepSourceGraphs: false,
            showOptions: false,
        };
        return _this;
    }
    RdfUpload.prototype.componentDidMount = function () {
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
    RdfUpload.prototype.onDrop = function (files) {
        var _this = this;
        this.setState({
            alertState: maybe.Nothing(),
            progress: maybe.Nothing(),
        });
        var fileNumber = 0;
        var uploads = files.map(function (file) {
            fileNumber++;
            var contentType = _.isEmpty(_this.props.config) || _.isEmpty(_this.props.config.contentType)
                ? sparql_1.SparqlUtil.getMimeType(sparql_1.SparqlUtil.getFileEnding(file))
                : _this.props.config.contentType;
            var targetGraph = _this.state.targetGraph.isJust
                ? _this.state.targetGraph.get()
                : 'file://' + file.name + '-' + moment().format('DD-MM-YYYY-hh-mm-ss');
            var upload = rdf_graph_store_1.RDFGraphStoreService.createGraphFromFile(rdf_1.Rdf.iri(targetGraph), _this.state.keepSourceGraphs, file, contentType, function (percent) { return _this.setState({
                progress: maybe.Just(((fileNumber / files.length) + (percent / 100)) * 100),
                progressText: maybe.Just(fileNumber + '/' + files.length + ' Files'),
            }); });
            upload.onValue(function () {
                return _this.messages.plug(Kefir.constant('File: ' + file.name + ' uploaded.<br/>'));
            }).onError(function (error) {
                return _this.messages.plug(Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>'));
            });
            return upload;
        });
        Kefir.combine(uploads).onValue(function () { return window.location.reload(); });
    };
    RdfUpload.prototype.render = function () {
        var _this = this;
        var description = _.isEmpty(this.props.config) || _.isEmpty(this.props.config.description)
            ? 'Please drag&drop your RDF file(s) here.'
            : this.props.config.description;
        return react_1.DOM.div({ style: { width: '50%' } }, react_1.DOM.a({ onClick: function () { return _this.setState({ showOptions: !_this.state.showOptions }); } }, 'Advanced Options'), Panel({ className: '', collapsible: true, expanded: this.state.showOptions }, Input({
            type: 'text',
            label: 'Target NamedGraph',
            placeholder: 'URI of the target NamedGraph. Will be generated automatically if empty.',
            onChange: this.onChangeTargetGraph,
        }), Checkbox({
            label: 'Keep source NamedGraphs',
            onChange: this.onChangeKeepSourceGraphs,
        }, 'Keep source NamedGraphs')), this.state.alertState.map(function (value) { return react_1.createElement(alert_1.Alert, value); }).getOrElse(null), this.state.progress.map(function (progress) { return ProgressBar({
            active: true, min: 0, max: 100,
            now: progress, label: _this.state.progressText.getOrElse('Uploading Files'),
        }); }).getOrElse(null), Dropzone({ onDrop: this.onDrop.bind(this) }, react_1.DOM.div({ className: 'text-center' }, description)));
    };
    return RdfUpload;
}(react_1.Component));
exports.RdfUpload = RdfUpload;
exports.default = RdfUpload;
