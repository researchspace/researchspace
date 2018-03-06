Object.defineProperty(exports, "__esModule", { value: true });
var immutable_1 = require("immutable");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
function node(key) {
    var children = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        children[_i - 1] = arguments[_i];
    }
    return { key: key, children: immutable_1.List(children) };
}
exports.node = node;
exports.FOREST = lazy_tree_1.KeyedForest.create(function (node) { return node.key || 'Life'; }, node(undefined, node('Bacteria', node('Cyanobacteria'), node('Proteobacteria'), node('Gram Positives')), node('Archaea', node('T. celer'), node('Methanobacterium')), node('Eucaryota', node('Diplomonads'), node('Fungi'), node('Plants', node('Mosses'), node('Horsetails'), node('Seed plants', node('Flowers'))), node('Animals', node('Invertebrates', node('Arachnids'), node('Insects'), node('Worms')), node('Vertibrates', node('Fish'), node('Reptiles', node('Birds')), node('Birds'), node('Mammals'))))));
function toUnorderedJSON(forest) {
    return nodesToUnorderedJSON(forest.root.children);
}
exports.toUnorderedJSON = toUnorderedJSON;
function nodesToUnorderedJSON(nodes) {
    if (!nodes) {
        return null;
    }
    var result = {};
    nodes.forEach(function (node) {
        result[node.key] = nodesToUnorderedJSON(node.children);
    });
    return result;
}
