Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var enzyme_1 = require("enzyme");
var lodash_1 = require("lodash");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var Forests_1 = require("./Forests");
var Input = lazy_tree_1.LazyTreeSelector;
describe('LazyTreeSelector', function () {
    var baseProps = {
        selectionMode: lazy_tree_1.SingleFullSubtree(),
        forest: Forests_1.FOREST,
        isLeaf: function (node) { return node.children === undefined; },
        childrenOf: function (node) { return ({ children: node.children }); },
        requestMore: function () { },
        renderItem: function (node) { return react_1.DOM.div({ className: 'tree-node' }, node.key); },
    };
    it('renders tree', function () {
        var treeInput = enzyme_1.shallow(react_1.createElement(Input, baseProps));
        var bacteria = treeInput.findWhere(function (child) { return child.key() === 'Bacteria'; });
        chai_1.expect(bacteria).to.has.lengthOf(1);
        chai_1.expect(bacteria.text().indexOf('Bacteria') >= 0);
    });
    it('requests children on node expand', function () {
        var bacteriaNode = Forests_1.FOREST.getFirst('Bacteria');
        var forestWithoutBacteriaChildren = Forests_1.FOREST.updateNode(Forests_1.FOREST.getOffsetPath(bacteriaNode), function (node) { return ({ key: node.key, children: undefined, hasMoreChildren: true }); });
        var onRequestCallback = sinon.spy();
        var props = lodash_1.assign({}, baseProps, {
            forest: forestWithoutBacteriaChildren,
            requestMore: onRequestCallback,
        });
        var treeInput = enzyme_1.shallow(react_1.createElement(Input, props));
        treeInput.findWhere(function (child) {
            return child.props().className === 'LazyTreeSelector--expandToggle' &&
                child.parents().someWhere(function (parent) { return parent.key() === 'Bacteria'; });
        }).simulate('click');
        chai_1.expect(onRequestCallback.called).to.be.true;
    });
});
