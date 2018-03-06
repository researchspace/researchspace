Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var html_to_react_1 = require("html-to-react");
var render = require("dom-serializer");
function isTemplate(node) {
    return node.type === 'tag' && node.name === 'template';
}
exports.isTemplate = isTemplate;
function extractTemplates(node) {
    var missingID = false;
    var templateNodes = node.children
        .filter(function (child) { return child.name === 'template'; })
        .filter(function (template) {
        var hasId = template.attribs.id !== undefined;
        if (!hasId) {
            missingID = true;
        }
        return hasId;
    });
    if (missingID) {
        throw new Error("Missing an ID attribute for a mini-template in <" + node.name + ">");
    }
    return templateNodes.map(function (templateNode) {
        var id = templateNode.attribs.id;
        var source = extractTemplate(templateNode);
        return { id: id, source: source };
    });
}
exports.extractTemplates = extractTemplates;
function extractTemplate(templateNode) {
    var escapedTemplate = escapeTemplateBody(templateNode);
    return getInnerHtml(escapedTemplate);
}
function escapeRemoteTemplateHtml(html) {
    var parser = new html_to_react_1.Parser(null);
    var renderTemplate = function (node) { return render(escapeChild(node)); };
    return parser.parseWithInstructions("<div>" + html + "</div>", function (node) { return true; }, [{
            shouldProcessNode: function (node) { return true; },
            processNode: function (node) { return node; },
        }]).then(function (root) {
        var node = root;
        return node.children.map(renderTemplate).join('\n');
    });
}
exports.escapeRemoteTemplateHtml = escapeRemoteTemplateHtml;
function escapeTemplateBody(node) {
    var newAttributes = undefined;
    for (var key in node.attribs) {
        if (!Object.prototype.hasOwnProperty.call(node.attribs, key)) {
            continue;
        }
        var value = node.attribs[key];
        var escaped = escapePartialReferences(value);
        if (escaped !== value) {
            if (!newAttributes) {
                newAttributes = {};
            }
            newAttributes[key] = escaped;
        }
    }
    var override = {
        attribs: tslib_1.__assign({}, node.attribs, newAttributes),
        children: node.children ? node.children.map(escapeChild) : node.children,
    };
    return tslib_1.__assign({}, node, override);
}
function escapeChild(child) {
    if (isTemplate(child)) {
        if (!child.children || child.children.every(isEmptyTextNode)) {
            return child;
        }
        var _a = generateEscapeBrackets(), start = _a.start, end = _a.end;
        var children = [
            { type: 'text', data: start, parent: child }
        ].concat(child.children, [
            { type: 'text', data: end, parent: child },
        ]);
        return tslib_1.__assign({}, child, { children: children });
    }
    else {
        return escapeTemplateBody(child);
    }
}
function isEmptyTextNode(node) {
    return node.type === 'text' && !node.data;
}
function escapePartialReferences(content) {
    if (content.indexOf('{{#>') >= 0) {
        throw new Error('Partial blocks ({{#>) are disallowed in the inline templates');
    }
    var _a = generateEscapeBrackets(), start = _a.start, end = _a.end;
    return content.replace(/({{>[^}"']+}})/g, start + "$1" + end);
}
function generateEscapeBrackets() {
    return {
        start: "{{{{capture}}}}",
        end: "{{{{/capture}}}}",
    };
}
function getInnerHtml(node) {
    return node.children ? node.children.map(render).join('') : '';
}
