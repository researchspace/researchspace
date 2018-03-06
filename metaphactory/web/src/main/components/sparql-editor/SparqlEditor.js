Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var YASQE = require("yasgui-yasqe");
var lodash_1 = require("lodash");
var namespace_1 = require("platform/api/services/namespace");
require("yasgui-yasqe/dist/yasqe.css");
var SparqlEditor = (function (_super) {
    tslib_1.__extends(SparqlEditor, _super);
    function SparqlEditor(props) {
        var _this = _super.call(this, props) || this;
        _this.__componentWillRecieveProps = lodash_1.debounce(function (nextProps) {
            if (normalizeLineEndings(nextProps.query) !== normalizeLineEndings(this.getQuery().value)) {
                this.setBackdrop(nextProps.backdrop);
                this.setValue(nextProps.query);
            }
        });
        _this.setValue = function (query) {
            if (typeof query === 'string') {
                _this.yasqe.setValue(query);
            }
        };
        _this.onChange = function (doc, change) {
            if (_this.props.onChange && change.origin !== 'setValue') {
                _this.props.onChange(_this.getQuery());
            }
        };
        _this.setBackdrop = function (show) {
            _this.yasqe.setBackdrop(lodash_1.isUndefined(show) ? false : show);
        };
        _this.id = Math.random().toString(36).slice(2);
        return _this;
    }
    SparqlEditor.prototype.componentDidMount = function () {
        if (this.props.autocompleters) {
            YASQE['defaults']['autocompleters'] = this.props.autocompleters;
            if (this.props.autocompleters.indexOf('prefixes') > -1) {
                YASQE['Autocompleters']['prefixes']['fetchFrom'] = namespace_1.GET_REGISTERED_PREFIXES;
                YASQE['Autocompleters']['prefixes']['persistent'] = null;
            }
        }
        else {
            YASQE['defaults']['autocompleters'] = ['variables'];
        }
        this.yasqe = YASQE(react_dom_1.findDOMNode(this), {
            backdrop: 0,
            value: this.props.query,
            persistent: this.props.persistent ? this.props.persistent : null,
        });
        if (this.props.syntaxErrorCheck === false) {
            this.yasqe.setOption('syntaxErrorCheck', false);
            this.yasqe.clearGutter('gutterErrorBar');
        }
        if (this.props.onChange) {
            this.yasqe.on('change', this.onChange);
        }
        if (this.props.size) {
            this.yasqe.setSize(this.props.size.w, this.props.size.h);
        }
        else {
            this.yasqe.setSize(null, 400);
        }
        this.setBackdrop(this.props.backdrop);
    };
    SparqlEditor.prototype.componentWillReceiveProps = function (nextProps) {
        this.__componentWillRecieveProps(nextProps);
    };
    SparqlEditor.prototype.render = function () {
        return react_1.DOM.div({ id: this.id });
    };
    SparqlEditor.prototype.getQuery = function () {
        return {
            value: this.yasqe.getValue(),
            queryType: this.yasqe.getQueryType(),
            queryMode: this.yasqe.getQueryMode(),
        };
    };
    return SparqlEditor;
}(react_1.Component));
exports.SparqlEditor = SparqlEditor;
function normalizeLineEndings(str) {
    if (!str) {
        return str;
    }
    return str.replace(/\r\n|\r/g, '\n');
}
