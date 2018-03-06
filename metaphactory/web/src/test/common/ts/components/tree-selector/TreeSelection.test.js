Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var Forests_1 = require("./Forests");
describe('TreeSelection', function () {
    var empty = lazy_tree_1.TreeSelection.empty(Forests_1.FOREST.keyOf);
    it('selects and unselects one item', function () {
        var flowers = Forests_1.FOREST.getFirst('Flowers');
        var selection = lazy_tree_1.TreeSelection.selectTerminal(empty, Forests_1.FOREST.getNodePath(flowers));
        chai_1.expect(Forests_1.toUnorderedJSON(selection)).to.deep.equal({
            'Eucaryota': {
                'Plants': {
                    'Seed plants': {
                        'Flowers': null,
                    },
                },
            },
        });
        var clearedSelection = lazy_tree_1.TreeSelection.unselect(selection, flowers.key);
        chai_1.expect(Forests_1.toUnorderedJSON(clearedSelection)).to.deep.equal({});
    });
    var getInsectsWormsAndFish = function () {
        var worms = lazy_tree_1.TreeSelection.selectTerminal(empty, Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Worms')));
        var insectsAndWorms = lazy_tree_1.TreeSelection.selectTerminal(worms, Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Insects')));
        var insectsWormsAndFish = lazy_tree_1.TreeSelection.selectTerminal(insectsAndWorms, Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Fish')));
        return insectsWormsAndFish;
    };
    it('selects multiple items', function () {
        chai_1.expect(Forests_1.toUnorderedJSON(getInsectsWormsAndFish())).to.deep.equal({
            'Eucaryota': {
                'Animals': {
                    'Invertebrates': {
                        'Insects': null,
                        'Worms': null,
                    },
                    'Vertibrates': {
                        'Fish': null,
                    },
                },
            },
        });
    });
    it('selects partially selected parent', function () {
        var insectsWormsAndVertibrates = lazy_tree_1.TreeSelection.selectTerminal(getInsectsWormsAndFish(), Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Vertibrates')));
        chai_1.expect(Forests_1.toUnorderedJSON(insectsWormsAndVertibrates)).to.deep.equal({
            'Eucaryota': {
                'Animals': {
                    'Invertebrates': {
                        'Insects': null,
                        'Worms': null,
                    },
                    'Vertibrates': null,
                },
            },
        });
    });
    it('unselects parent with multiple leafs', function () {
        var vertibrates = lazy_tree_1.TreeSelection.unselect(getInsectsWormsAndFish(), 'Invertebrates');
        chai_1.expect(Forests_1.toUnorderedJSON(vertibrates)).to.deep.equal({
            'Eucaryota': {
                'Animals': {
                    'Vertibrates': {
                        'Fish': null,
                    },
                },
            },
        });
    });
    it('keep selection if trying to select child of a leaf', function () {
        var animals = lazy_tree_1.TreeSelection.selectTerminal(empty, Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Animals')));
        var mammals = lazy_tree_1.TreeSelection.selectTerminal(animals, Forests_1.FOREST.getNodePath(Forests_1.FOREST.getFirst('Mammals')));
        chai_1.expect(Forests_1.toUnorderedJSON(animals)).to.deep.equal(Forests_1.toUnorderedJSON(mammals));
    });
    it('unselects all nodes with same key', function () {
        var birds = Forests_1.FOREST.nodes.get('Birds').reduce(function (selection, node) { return lazy_tree_1.TreeSelection.selectTerminal(selection, Forests_1.FOREST.getNodePath(node)); }, empty);
        chai_1.expect(Forests_1.toUnorderedJSON(birds)).to.deep.equal({
            'Eucaryota': {
                'Animals': {
                    'Vertibrates': {
                        'Reptiles': {
                            'Birds': null,
                        },
                        'Birds': null,
                    },
                },
            },
        });
        var cleared = lazy_tree_1.TreeSelection.unselect(birds, 'Birds');
        chai_1.expect(Forests_1.toUnorderedJSON(cleared)).to.deep.equal({});
    });
});
