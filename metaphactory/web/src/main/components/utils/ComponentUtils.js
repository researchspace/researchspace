Object.defineProperty(exports, "__esModule", { value: true });
function isValidChild(child) {
    return typeof child === 'object' && child !== null;
}
exports.isValidChild = isValidChild;
function componentDisplayName(child) {
    if (typeof child === 'string' || typeof child === 'number') {
        return child.toString();
    }
    else if (typeof child.type === 'string') {
        return child.type;
    }
    else {
        return child.type.displayName || child.type['name'];
    }
}
exports.componentDisplayName = componentDisplayName;
function hasBaseDerivedRelationship(baseConstructor, derivedConstructor) {
    return derivedConstructor === baseConstructor || (derivedConstructor.prototype &&
        derivedConstructor.prototype instanceof baseConstructor);
}
exports.hasBaseDerivedRelationship = hasBaseDerivedRelationship;
function universalChildren(children) {
    return (Array.isArray(children) && children.length === 1)
        ? children[0]
        : children;
}
exports.universalChildren = universalChildren;
