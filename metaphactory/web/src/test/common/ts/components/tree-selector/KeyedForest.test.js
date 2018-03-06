Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var immutable_1 = require("immutable");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var Forests_1 = require("./Forests");
describe('KeyedForest', function () {
    var bar1 = Forests_1.node('bar', Forests_1.node('baz'), Forests_1.node('bazz'));
    var bar2 = Forests_1.node('bar', Forests_1.node('foo'));
    var roots = immutable_1.List([
        Forests_1.node('first', bar1, Forests_1.node('quax'), Forests_1.node('frob', Forests_1.node('frob.1', Forests_1.node('child1'), Forests_1.node('child2')), Forests_1.node('frob.2'), Forests_1.node('frob.3'))),
        Forests_1.node('second'),
        Forests_1.node('third', bar2),
    ]);
    var forest = lazy_tree_1.KeyedForest.create(function (node) { return node.key; }, { key: 'root', children: roots });
    it('builds key mappings with duplicate keys', function () {
        var bars = forest.nodes.get('bar').toArray();
        chai_1.expect(bars.length).to.be.equal(2);
        chai_1.expect(bars).to.include(bar1);
        chai_1.expect(bars).to.include(bar2);
    });
    it('builds parent mappings', function () {
        var parent = forest.getFirst('frob');
        var child = forest.getFirst('frob.3');
        chai_1.expect(forest.getParent(child)).to.be.equal(parent);
    });
    it('reconcile after node updates', function () {
        var changedSubChild = Forests_1.node('frob.1', forest.getFirst('child2'), forest.getFirst('child1'));
        var updated = forest.updateNode([0, 2], function (item) {
            return Forests_1.node('frob', changedSubChild, forest.getFirst('frob.2'), forest.getFirst('frob.3'));
        });
        it('updates mappings', function () {
            var nodes = updated.nodes.get('frob.1').toArray();
            chai_1.expect(nodes.length).to.be.equal(1);
            chai_1.expect(nodes).to.include(changedSubChild);
        });
    });
});
