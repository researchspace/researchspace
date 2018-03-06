Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var CopyToClipboard = require("react-copy-to-clipboard");
var assign = require("object-assign");
var uri = require("urijs");
var rdf_1 = require("platform/api/rdf");
var URLMinifierService = require("platform/api/services/url-minifier");
var FormControl = react_1.createFactory(ReactBootstrap.FormControl);
var InputGroup = react_1.createFactory(ReactBootstrap.InputGroup);
var OverlayTrigger = react_1.createFactory(ReactBootstrap.OverlayTrigger);
var Popover = react_1.createFactory(ReactBootstrap.Popover);
var Button = react_1.createFactory(ReactBootstrap.Button);
var URLMinifier = (function (_super) {
    tslib_1.__extends(URLMinifier, _super);
    function URLMinifier(props) {
        var _this = _super.call(this, props) || this;
        _this.onClick = function () {
            if (_this.state.showLink) {
                _this.setState({ showLink: false });
            }
            else {
                _this.generateTargetURL().onValue(function (url) {
                    _this.setState({
                        isLoading: false,
                        showLink: true,
                        gotLink: url,
                    });
                }).onError(function () {
                    _this.setState({
                        isLoading: false,
                        showLink: false,
                        gotLink: undefined,
                    });
                });
            }
        };
        _this.state = {
            isLoading: false,
            showLink: false,
            gotLink: undefined,
        };
        return _this;
    }
    URLMinifier.prototype.generateTargetURL = function () {
        if (typeof this.props.iri === 'string') {
            return URLMinifierService.getShortURLForResource(rdf_1.Rdf.iri(this.props.iri));
        }
        else {
            return URLMinifierService.makeShortURL(uri().toString());
        }
    };
    URLMinifier.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (!this.state.showLink && nextState.showLink) {
            this.refs['trigger'].show();
        }
        else if (this.state.showLink && !nextState.showLink) {
            this.refs['trigger'].hide();
        }
        return true;
    };
    URLMinifier.prototype.render = function () {
        var _this = this;
        var child = react_1.Children.only(this.props.children);
        return OverlayTrigger({
            ref: 'trigger',
            trigger: [],
            placement: 'bottom',
            rootClose: true,
            onExit: function () {
                _this.setState({ showLink: false });
            },
            overlay: Popover({ id: 'url-minifier' }, InputGroup({}, FormControl({ type: 'text', className: 'input-sm', value: this.state.gotLink, readOnly: true }), react_1.DOM.span({ className: 'input-group-btn' }, react_1.createElement(CopyToClipboard, { text: this.state.showLink ? this.state.gotLink : '' }, Button({ bsSize: 'small' }, react_1.DOM.i({ className: 'fa fa-copy' })))))),
        }, react_1.cloneElement(child, assign({}, child.props, {
            disabled: this.state.isLoading,
            onClick: this.onClick,
        })));
    };
    return URLMinifier;
}(react_1.Component));
exports.component = URLMinifier;
exports.factory = react_1.createFactory(URLMinifier);
exports.default = exports.component;
