Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
exports.ConjunctKinds = {
    Relation: 'Relation',
    Text: 'Text',
};
exports.EntityDisjunctKinds = {
    Resource: 'Resource',
    Set: 'Set',
    SavedSearch: 'SavedSearch',
    Search: 'Search',
};
exports.TextDisjunctKind = 'Text';
exports.TemporalDisjunctKinds = {
    Date: 'Date',
    DateRange: 'DateRange',
    DateDeviation: 'DateDeviation',
    Year: 'Year',
    YearRange: 'YearRange',
    YearDeviation: 'YearDeviation',
};
exports.SpatialDisjunctKinds = {
    Distance: 'Distance',
    BoundingBox: 'BoundingBox',
};
exports.LiteralDisjunctKind = 'Literal';
exports.NumericRangeDisjunctKind = 'NumericRange';
function matchConjunct(matcher) {
    return function (conjunct) {
        switch (conjunct.kind) {
            case exports.ConjunctKinds.Relation: return matcher[exports.ConjunctKinds.Relation](conjunct);
            case exports.ConjunctKinds.Text: return matcher[exports.ConjunctKinds.Text](conjunct);
        }
    };
}
exports.matchConjunct = matchConjunct;
function isEntityDisjunct(disjunct) {
    return _.includes(_.keys(exports.EntityDisjunctKinds), disjunct.kind);
}
exports.isEntityDisjunct = isEntityDisjunct;
function isTemporalDisjunct(disjunct) {
    return _.includes(_.keys(exports.TemporalDisjunctKinds), disjunct.kind);
}
exports.isTemporalDisjunct = isTemporalDisjunct;
function isSpatialDisjunct(disjunct) {
    return _.includes(_.keys(exports.SpatialDisjunctKinds), disjunct.kind);
}
exports.isSpatialDisjunct = isSpatialDisjunct;
function isLiteralDisjunct(disjunct) {
    return disjunct.kind === exports.LiteralDisjunctKind;
}
exports.isLiteralDisjunct = isLiteralDisjunct;
function isNumericRangeDisjunct(disjunct) {
    return disjunct.kind === exports.NumericRangeDisjunctKind;
}
exports.isNumericRangeDisjunct = isNumericRangeDisjunct;
function isTextDisjunct(disjunct) {
    return disjunct.kind === exports.TextDisjunctKind;
}
exports.isTextDisjunct = isTextDisjunct;
function isSetDisjunct(disjunct) {
    return disjunct.kind === exports.EntityDisjunctKinds.Set;
}
exports.isSetDisjunct = isSetDisjunct;
function matchDisjunct(matcher) {
    return function (disjunct) {
        if (isTextDisjunct(disjunct)) {
            return matcher[exports.TextDisjunctKind](disjunct);
        }
        else if (isEntityDisjunct(disjunct)) {
            return matchEntityDisjunct(matcher)(disjunct);
        }
        else if (isTemporalDisjunct(disjunct)) {
            return matchTemporalDisjunct(matcher)(disjunct);
        }
        else if (isSpatialDisjunct(disjunct)) {
            return matchSpatialDisjunct(matcher)(disjunct);
        }
        else if (isLiteralDisjunct(disjunct)) {
            return matcher[exports.LiteralDisjunctKind](disjunct);
        }
        else if (isNumericRangeDisjunct(disjunct)) {
            return matcher[exports.NumericRangeDisjunctKind](disjunct);
        }
    };
}
exports.matchDisjunct = matchDisjunct;
function matchEntityDisjunct(matcher) {
    return function (disjunct) {
        switch (disjunct.kind) {
            case exports.EntityDisjunctKinds.Resource:
                return matcher[exports.EntityDisjunctKinds.Resource](disjunct);
            case exports.EntityDisjunctKinds.Set:
                return matcher[exports.EntityDisjunctKinds.Set](disjunct);
            case exports.EntityDisjunctKinds.Search:
                return matcher[exports.EntityDisjunctKinds.Search](disjunct);
            case exports.EntityDisjunctKinds.SavedSearch:
                return matcher[exports.EntityDisjunctKinds.SavedSearch](disjunct);
        }
    };
}
exports.matchEntityDisjunct = matchEntityDisjunct;
function matchTemporalDisjunct(matcher) {
    return function (disjunct) {
        switch (disjunct.kind) {
            case exports.TemporalDisjunctKinds.Date:
                return matcher[exports.TemporalDisjunctKinds.Date](disjunct);
            case exports.TemporalDisjunctKinds.DateRange:
                return matcher[exports.TemporalDisjunctKinds.DateRange](disjunct);
            case exports.TemporalDisjunctKinds.DateDeviation:
                return matcher[exports.TemporalDisjunctKinds.DateDeviation](disjunct);
            case exports.TemporalDisjunctKinds.Year:
                return matcher[exports.TemporalDisjunctKinds.Year](disjunct);
            case exports.TemporalDisjunctKinds.YearRange:
                return matcher[exports.TemporalDisjunctKinds.YearRange](disjunct);
            case exports.TemporalDisjunctKinds.YearDeviation:
                return matcher[exports.TemporalDisjunctKinds.YearDeviation](disjunct);
        }
    };
}
exports.matchTemporalDisjunct = matchTemporalDisjunct;
function matchSpatialDisjunct(matcher) {
    return function (disjunct) {
        switch (disjunct.kind) {
            case exports.SpatialDisjunctKinds.Distance:
                return matcher[exports.SpatialDisjunctKinds.Distance](disjunct);
            case exports.SpatialDisjunctKinds.BoundingBox:
                return matcher[exports.SpatialDisjunctKinds.BoundingBox](disjunct);
        }
    };
}
exports.matchSpatialDisjunct = matchSpatialDisjunct;
