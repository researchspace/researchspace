Object.defineProperty(exports, "__esModule", { value: true });
var Ordering = (function () {
    function Ordering(positions) {
        this.positions = positions;
    }
    Object.defineProperty(Ordering.prototype, "size", {
        get: function () { return this.positions.length; },
        enumerable: true,
        configurable: true
    });
    Ordering.prototype.setSize = function (size) {
        if (this.positions.length === size) {
            return this;
        }
        else if (size < this.positions.length) {
            return new Ordering(this.positions.slice(0, size));
        }
        else {
            var result = this.positions.slice();
            for (var i = result.length; i < size; i++) {
                result.push(i);
            }
            return new Ordering(result);
        }
    };
    Ordering.prototype.getPosition = function (index) {
        return this.positions[index];
    };
    Ordering.prototype.getPositionToIndex = function () {
        return invert(this.positions);
    };
    Ordering.prototype.apply = function (items) {
        return this.getPositionToIndex().map(function (index) { return items[index]; });
    };
    Ordering.prototype.moveItemFromTo = function (fromPosition, toPosition) {
        if (fromPosition === toPosition) {
            return this;
        }
        var positionToIndex = this.getPositionToIndex();
        var index = positionToIndex.splice(fromPosition, 1)[0];
        positionToIndex.splice(toPosition, 0, index);
        return new Ordering(invert(positionToIndex));
    };
    return Ordering;
}());
Ordering.empty = new Ordering([]);
exports.Ordering = Ordering;
function invert(transpositions) {
    var result = new Array(transpositions.length);
    for (var i = 0; i < transpositions.length; i++) {
        result[transpositions[i]] = i;
    }
    return result;
}
