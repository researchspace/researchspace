Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var Panel = react_1.createFactory(ReactBootstrap.Panel);
var ErrorNotification = (function (_super) {
    tslib_1.__extends(ErrorNotification, _super);
    function ErrorNotification(props) {
        return _super.call(this, props) || this;
    }
    ErrorNotification.prototype.componentDidMount = function () {
        var error = this.props.errorMessage;
        if (error && typeof error === 'object') {
            console.error(error);
        }
    };
    ErrorNotification.prototype.render = function () {
        var title = this.props.title || 'Error occurred! Click to see more details.';
        var errorHeader = react_1.DOM.p({}, react_1.DOM.i({
            className: 'fa fa-exclamation-triangle',
            style: { marginRight: '10px', color: 'red' },
        }), react_1.DOM.span({}, title));
        return Panel({
            collapsible: true,
            header: errorHeader,
            className: this.props.className,
        }, this.props.errorMessage
            ? this.wrapError(this.props.errorMessage)
            : this.props.children);
    };
    ErrorNotification.prototype.wrapError = function (error) {
        var _this = this;
        if (typeof error === 'object' && 'responseText' in error) {
            var responseText = error.responseText;
            return react_1.DOM.iframe({ srcDoc: responseText, width: '100%', height: 400 });
        }
        else if (typeof error === 'object' && 'message' in error) {
            var message = error.message;
            return convertLineBreaks(message);
        }
        else if (Array.isArray(error) && error.length > 0) {
            if (error.length === 1) {
                return this.wrapError(error[0]);
            }
            else {
                return react_1.DOM.div.apply(react_1.DOM, [{},
                    'Multiple errors occured:'].concat(error.map(function (e) { return _this.wrapError(e); })));
            }
        }
        else {
            if (typeof error !== 'string') {
                error = JSON.stringify(error, undefined, 4);
            }
            return convertLineBreaks(error);
        }
    };
    return ErrorNotification;
}(react_1.Component));
exports.ErrorNotification = ErrorNotification;
function convertLineBreaks(message) {
    var parts = message.split('\n');
    if (parts.length === 0) {
        return react_1.DOM.span();
    }
    var lines = [parts[0]];
    for (var i = 1; i < parts.length; i++) {
        lines.push(react_1.DOM.br());
        lines.push(parts[i]);
    }
    return react_1.DOM.span.apply(react_1.DOM, [undefined].concat(lines));
}
exports.default = ErrorNotification;
