Object.defineProperty(exports, "__esModule", { value: true });
function hasControlledProps(componentClass) {
    return Boolean(typeof componentClass === 'function' &&
        componentClass.propTypes &&
        componentClass.propTypes.onControlledPropChange);
}
exports.hasControlledProps = hasControlledProps;
