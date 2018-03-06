Object.defineProperty(exports, "__esModule", { value: true });
var components = require('custom-components');
function loadComponent(tagName) {
    if (hasComponent(tagName)) {
        return components(tagName).then(function (component) {
            var comp = component.default ? component.default : component;
            return comp;
        });
    }
    else {
        console.warn('component not found for tag ' + tagName);
    }
}
exports.loadComponent = loadComponent;
function hasComponent(tagName) {
    var loader = components(tagName);
    if (loader) {
        return true;
    }
    else {
        return false;
    }
}
exports.hasComponent = hasComponent;
