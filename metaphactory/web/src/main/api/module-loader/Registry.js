Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var _ = require("lodash");
var lambda = require("core.lambda");
var immutable_1 = require("immutable");
var React = require("react");
var render = require("dom-serializer");
var he = require("he");
var html_to_react_1 = require("html-to-react");
var js_beautify_1 = require("js-beautify");
var Kefir = require("kefir");
var data_maybe_1 = require("data.maybe");
var ConfigHolder = require("platform/api/services/config-holder");
var SecurityService = require("platform/api/services/security");
var template_1 = require("platform/api/services/template");
var async_1 = require("platform/api/async");
var ComponentsStore_1 = require("./ComponentsStore");
var ReactErrorCatcher_1 = require("./ReactErrorCatcher");
var processNodeDefinitions = new html_to_react_1.ProcessNodeDefinitions(React);
var NativeRegistry = immutable_1.Set().asMutable();
var registerElement = document.registerElement;
document.registerElement = function (name, opts) {
    NativeRegistry.add(name);
    return registerElement.bind(document)(name, opts);
};
function init() { }
exports.init = init;
exports.RAW_STYLE_ATTRIBUTE = '__style';
function parseHtmlToReact(html) {
    var processingInstructions = [
        {
            shouldProcessNode: isCodeExample,
            processNode: processCode(true),
        },
        {
            shouldProcessNode: isCode,
            processNode: processCode(false),
        },
        {
            shouldProcessNode: isCodeChild,
            processNode: skipNode,
        },
        {
            shouldProcessNode: isStyle,
            processNode: processStyle,
        },
        {
            shouldProcessNode: isStyleChild,
            processNode: skipNode,
        },
        {
            shouldProcessNode: template_1.TemplateParser.isTemplate,
            processNode: skipNode,
        },
        {
            shouldProcessNode: isReactComponent,
            processNode: processReactComponent,
        },
        {
            shouldProcessNode: isNativeComponent,
            processNode: processNativeComponent,
        },
        {
            shouldProcessNode: lambda.constant(true),
            processNode: processDefaultNode,
        },
    ];
    var htmlToReactParser = new html_to_react_1.Parser(React);
    return htmlToReactParser.parseWithInstructions("<div key=\"root\">" + html + "</div>", isValidNode, processingInstructions).then(function (components) { return components.props.children; });
}
exports.parseHtmlToReact = parseHtmlToReact;
function renderWebComponent(componentTag, props, children, templateScope) {
    templateScope = templateScope || template_1.TemplateScope.default.clone();
    return isComponentPermited(componentTag).toPromise()
        .then(function (result) {
        if (!result) {
            return null;
        }
        return ComponentsStore_1.loadComponent(componentTag).then(function (component) { return createElementWithTemplateScope(component, props, children, templateScope); });
    });
}
exports.renderWebComponent = renderWebComponent;
function processDefaultNode(node, children) {
    return Promise.resolve(processNodeDefinitions.processDefaultNode(node, children));
}
function isCode(node) {
    return node.name === 'code';
}
function isCodeExample(node) {
    return node.name === 'mp-code-example';
}
function isCodeChild(node) {
    return node.parent && (node.parent.name === 'code' || node.parent.name === 'mp-code-example');
}
function isStyle(node) {
    return node.name === 'style';
}
function isStyleChild(node) {
    return node.parent && node.parent.name === 'style';
}
function isReactComponent(node) {
    return ComponentsStore_1.hasComponent(node.name);
}
function isNativeComponent(node) {
    return !ComponentsStore_1.hasComponent(node.name) && (node.type === 'tag' && node.name.indexOf('-') !== -1);
}
function isValidNode(node) {
    return node.type === 'text' ? _.trim(node.data) !== '' : true;
}
function processNativeComponent(node, children) {
    return Promise.resolve(react_1.DOM.div({
        dangerouslySetInnerHTML: {
            __html: render(node),
        },
    }));
}
function processCode(isCodeExample) {
    return function (node, children) {
        var innerCode = _.trim(he.decode(render(node.children)));
        var attributes = htmlAttributesToReactProps(node.attribs);
        var codeComponent = isCodeExample ? 'mp-code-example' : 'mp-code-highlight';
        var codeToHighlight = isCodeExample ?
            js_beautify_1.html(innerCode, { wrap_attributes: 'force-expand-multiline' }) : innerCode;
        return ComponentsStore_1.loadComponent(codeComponent).then(function (component) {
            return react_1.createElement(component, assign({ codeText: codeToHighlight }, attributes));
        });
    };
}
function skipNode(node, children) {
    return null;
}
function processStyle(node, children) {
    return Promise.resolve(React.DOM.style({ dangerouslySetInnerHTML: { __html: node.children[0].data } }, null));
}
function processReactComponent(node, children) {
    var attributes;
    try {
        attributes = htmlAttributesToReactProps(node.attribs);
    }
    catch (e) {
        var msg = "Error while processing attributes for component \"" + node.name + "\":\n      ' + " + e.message;
        throw new Error(msg);
    }
    var computedKey = (attributes['key'] && !attributes['fixedKey']) ? attributes['key'] :
        (attributes['fixedKey']
            ? attributes['fixedKey']
            : Math.random().toString(36).slice(2));
    var props = assign({ key: computedKey }, attributes);
    if (_.startsWith(node.name, 'semantic')) {
        if (!_.isUndefined(props['config'])) {
            var nestedProps = _.transform(props['config'], function (acc, val, key) {
                acc[attributeName(key)] = val;
                return acc;
            }, {});
            props = assign(props, nestedProps);
        }
    }
    var templateScope = undefined;
    try {
        templateScope = extractTemplateScope(node);
    }
    catch (error) {
        throw new async_1.WrappingError("Invalid template markup at <" + node.name + ">", error);
    }
    return renderWebComponent(node.name, props, children, templateScope);
}
function extractTemplateScope(node) {
    var templates = template_1.TemplateParser.extractTemplates(node);
    if (templates.length === 0) {
        return undefined;
    }
    return templates.reduce(function (scope, _a) {
        var id = _a.id, source = _a.source;
        try {
            scope.registerPartial(id, source);
        }
        catch (error) {
            throw new async_1.WrappingError("Failed to register <template id='" + id + "'>", error);
        }
        return scope;
    }, template_1.TemplateScope.default.clone());
}
exports.extractTemplateScope = extractTemplateScope;
var isAlwaysPermitted = Kefir.constant(true);
function isComponentPermited(componentName) {
    if (ConfigHolder.ConfigHolder.getUIConfig().enableUiComponentBasedSecurity.value) {
        var right = 'ui:component:view:' + componentName.replace(/-/g, ':');
        return SecurityService.Util.isPermitted(right);
    }
    else {
        return isAlwaysPermitted;
    }
}
function createElementWithTemplateScope(component, componentProps, children, templateScope) {
    var props = componentProps;
    if (component.propTypes) {
        var propTypes = component.propTypes;
        if (propTypes.markupTemplateScope) {
            var scopeProps = {
                markupTemplateScope: data_maybe_1.fromNullable(templateScope),
            };
            props = tslib_1.__assign({}, props, scopeProps);
        }
    }
    return ReactErrorCatcher_1.safeReactCreateElement.apply(null, [component, props].concat(children));
}
function htmlAttributesToReactProps(attribs) {
    return _.transform(attribs, function (acc, val, key) {
        acc[attributeName(key)] = (key === 'style')
            ? createStyleJsonFromString(attributeValue(key, val))
            : attributeValue(key, val);
        if (key === 'style') {
            acc[exports.RAW_STYLE_ATTRIBUTE] = attributeValue(key, val);
        }
        return acc;
    }, {});
}
function attributeName(name) {
    if (name === 'class') {
        return 'className';
    }
    if (name === 'data-flex-layout' || name === 'data-flex-self') {
        return name;
    }
    else {
        return attributeNameToPropertyName(name);
    }
}
function attributeNameToPropertyName(attributeName) {
    return attributeName
        .replace(/^(x|data)[-_:]/i, '')
        .replace(/[-_:](.)/g, function (x, chr) { return chr.toUpperCase(); });
}
function attributeValue(name, val) {
    var decoded = he.decode(val);
    if (decoded === 'true' || decoded === 'false') {
        return JSON.parse(decoded);
    }
    else if (!isNaN(+decoded)) {
        return +decoded;
    }
    else {
        return parseAttributeValue(name, decoded);
    }
}
function parseAttributeValue(name, value) {
    if (!value) {
        return null;
    }
    var jsonRegexp = /^{{1}.*}{1}$/, jsonArrayRegexp = /(^\[.*\]$)/;
    var valueWithoutLineBreaks = value.replace(/(\r\n|\n|\r|\t)/gm, '');
    var jsonMatches = valueWithoutLineBreaks.match(jsonRegexp)
        || valueWithoutLineBreaks.match(jsonArrayRegexp);
    var isEnclosedInDoubleCurlyBraces = valueWithoutLineBreaks.startsWith('{{') &&
        valueWithoutLineBreaks.endsWith('}}');
    if (jsonMatches && !isEnclosedInDoubleCurlyBraces) {
        try {
            value = JSON.parse(jsonMatches[0]);
        }
        catch (e) {
            var msg = "Failed to parse value for attribute \"" + name + "\" as JSON.\n                      Details: " + e.message;
            throw new Error(msg);
        }
    }
    return value;
}
function createStyleJsonFromString(styleString) {
    if (!styleString) {
        return {};
    }
    var styles = styleString.split(';');
    var singleStyle, key, value, jsonStyles = {};
    for (var i = 0; i < styles.length; i++) {
        singleStyle = styles[i].split(':');
        key = _.camelCase(singleStyle[0]);
        value = singleStyle[1];
        if (key.length > 0 && value.length > 0) {
            jsonStyles[key] = value;
        }
    }
    return jsonStyles;
}
