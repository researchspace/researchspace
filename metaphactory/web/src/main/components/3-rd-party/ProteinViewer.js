Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var pv = require("bio-pv");
var request = require("superagent");
var Kefir = require("kefir");
var maybe = require("data.maybe");
var ReactBootstrap = require("react-bootstrap");
var _ = require("lodash");
var assign = require("object-assign");
var spinner_1 = require("platform/components/ui/spinner");
var Button = react_1.createFactory(ReactBootstrap.Button);
var REF = 'mp-protein-viewer';
var MODE;
(function (MODE) {
    MODE[MODE["PRESET"] = 0] = "PRESET";
    MODE[MODE["CARTOON"] = 1] = "CARTOON";
    MODE[MODE["TUBE"] = 2] = "TUBE";
    MODE[MODE["LINE"] = 3] = "LINE";
    MODE[MODE["LINETRACE"] = 4] = "LINETRACE";
    MODE[MODE["SMOOTHLINETRACE"] = 5] = "SMOOTHLINETRACE";
    MODE[MODE["TRACE"] = 6] = "TRACE";
})(MODE || (MODE = {}));
var modes = {
    'Preset': MODE.PRESET,
    'Cartoon': MODE.CARTOON,
    'Tube': MODE.TUBE,
    'Lines': MODE.LINE,
    'Line Trace': MODE.LINETRACE,
    'Smooth Line Trace': MODE.SMOOTHLINETRACE,
    'Trace': MODE.TRACE,
};
var ProteinViewerComponent = (function (_super) {
    tslib_1.__extends(ProteinViewerComponent, _super);
    function ProteinViewerComponent() {
        var _this = _super.call(this) || this;
        _this.renderProtein = function (responseText) {
            var structure = pv.io.pdb(responseText);
            _this.preset(structure);
            _this.viewer.centerOn(structure);
            _this.setState({ structure: maybe.Just(structure) });
        };
        _this.preset = function (structure) {
            _this.viewer.clear();
            var ligand = structure.select({ rnames: ['RVP', 'SAH'] });
            _this.viewer.ballsAndSticks('ligand', ligand);
            _this.viewer.cartoon('protein', structure);
        };
        _this.getMenue = function () {
            if (_this.state.structure.isNothing) {
                return react_1.createElement(spinner_1.Spinner, {}, 'Loading pdb data.');
            }
            var items = _.map(modes, function (mode, label) {
                return Button({ onClick: function () { return _this.changeMode(mode); }, className: 'btn btn-link btn-xs' }, label);
            });
            return react_1.DOM.div({ style: { position: 'absolute', bottom: -20 } }, items);
        };
        _this.changeMode = function (mode) {
            if (_this.state.structure.isNothing) {
                return;
            }
            var structure = _this.state.structure.get();
            _this.viewer.clear();
            switch (mode) {
                case MODE.PRESET:
                    _this.preset(structure);
                    break;
                case MODE.CARTOON:
                    _this.viewer.cartoon('structure', structure, { color: pv.color.ssSuccession() });
                    break;
                case MODE.TUBE:
                    _this.viewer.tube('structure', structure);
                    break;
                case MODE.LINE:
                    _this.viewer.lines('structure', structure);
                    break;
                case MODE.LINETRACE:
                    _this.viewer.lineTrace('structure', structure);
                    break;
                case MODE.SMOOTHLINETRACE:
                    _this.viewer.sline('structure', structure);
                    break;
                case MODE.TRACE:
                    _this.viewer.trace('structure', structure);
                    break;
                default:
                    _this.preset(structure);
            }
        };
        _this.state = {
            structure: maybe.Nothing(),
            error: maybe.Nothing(),
        };
        return _this;
    }
    ProteinViewerComponent.prototype.componentDidMount = function () {
        var _this = this;
        this.viewer = pv.Viewer(react_dom_1.findDOMNode(this.refs[REF]), { quality: 'medium',
            width: 'auto',
            height: 'auto',
            antialias: true, outline: true });
        var req = request
            .get(this.props.url)
            .type('application/x-pdb');
        Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err, res ? res.text : null);
        }); })
            .onValue(function (x) { return _this.renderProtein(x); })
            .onError(function (e) { return _this.setState({
            error: maybe.Just('Failed to retrieve pdb data for pdb id:' + _this.props.url),
        }); });
        window.onresize = function (event) {
            _this.viewer.fitParent();
        };
    };
    ProteinViewerComponent.prototype.componentDidUpdate = function (prev, props) {
        if (this.viewer) {
            this.viewer.fitParent();
        }
    };
    ProteinViewerComponent.prototype.render = function () {
        var props = assign({}, { style: { 'position': 'relative', 'height': '500px', 'width': '500px' } }, this.props, { ref: REF });
        return this.state.error.isJust
            ? react_1.DOM.span({}, this.state.error.get())
            : react_1.DOM.div(props, this.getMenue());
    };
    return ProteinViewerComponent;
}(react_1.Component));
exports.ProteinViewerComponent = ProteinViewerComponent;
exports.default = ProteinViewerComponent;
