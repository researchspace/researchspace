Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var classNames = require("classnames");
var components_1 = require("platform/api/components");
var template_1 = require("platform/api/services/template");
var module_loader_1 = require("platform/api/module-loader");
var notification_1 = require("platform/components/ui/notification");
var TemplateItem = (function (_super) {
    tslib_1.__extends(TemplateItem, _super);
    function TemplateItem(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            parsedTemplate: null,
        };
        return _this;
    }
    TemplateItem.prototype.getChildContext = function () {
        var baseContext = _super.prototype.getChildContext.call(this);
        var parentContext = this.context.templateDataContext;
        var dataContextOverride = {
            templateDataContext: this.state.capturedContext || parentContext,
        };
        return tslib_1.__assign({}, baseContext, dataContextOverride);
    };
    TemplateItem.prototype.componentDidMount = function () {
        this.compileTemplate(this.props);
    };
    TemplateItem.prototype.componentWillReceiveProps = function (props) {
        if (!templateEqual(props.template, this.props.template)) {
            this.compileTemplate(props);
        }
    };
    TemplateItem.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return !(templateEqual(this.props.template, nextProps.template) &&
            shallowEqual(this.props.componentProps, nextProps.componentProps) &&
            shallowEqual(this.state, nextState));
    };
    TemplateItem.prototype.render = function () {
        if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        var parsedTemplate = this.state.parsedTemplate;
        var root = this.getSingleRoot(parsedTemplate);
        return typeof root === 'string' ? react_1.DOM.span({}, root) :
            (root ? react_1.cloneElement(root, tslib_1.__assign({}, this.props.componentProps, { className: classNames(lodash_1.has(this.props.componentProps, 'className') ? this.props.componentProps.className : '', root.props.className), children: root.props.children })) : null);
    };
    TemplateItem.prototype.getSingleRoot = function (parsed) {
        if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
                return null;
            }
            else if (parsed.length > 1) {
                throw new Error('Expected only a single root element in the template:\n' +
                    this.props.template.source);
            }
            else {
                return parsed[0];
            }
        }
        else {
            return parsed;
        }
    };
    TemplateItem.prototype.compileTemplate = function (props) {
        var _this = this;
        var _a = this.context.templateDataContext, templateDataContext = _a === void 0 ? new template_1.CapturedContext() : _a;
        var capturer = templateDataContext.capture();
        this.appliedTemplateScope.compile(props.template.source)
            .then(function (template) {
            var renderedHtml = template(props.template.options, { capturer: capturer, parentContext: templateDataContext });
            return module_loader_1.ModuleRegistry.parseHtmlToReact(renderedHtml);
        })
            .then(function (parsedTemplate) {
            _this.setState({ parsedTemplate: parsedTemplate, capturedContext: capturer.getResult() });
        }).catch(function (error) {
            console.error(error);
            _this.setState({ error: error });
        });
    };
    return TemplateItem;
}(components_1.Component));
TemplateItem.defaultProps = {
    id: Math.random(),
    template: undefined,
};
exports.TemplateItem = TemplateItem;
function templateEqual(a, b) {
    return a === b || (a.source === b.source && lodash_1.isEqual(a.options, b.options));
}
function shallowEqual(a, b) {
    if (Object.is(a, b)) {
        return true;
    }
    if (typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }
    for (var key in a) {
        if (!a.hasOwnProperty(key)) {
            continue;
        }
        if (!b.hasOwnProperty(key) || !Object.is(a[key], b[key])) {
            return false;
        }
    }
    for (var key in b) {
        if (!b.hasOwnProperty(key)) {
            continue;
        }
        if (!a.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}
exports.default = TemplateItem;
