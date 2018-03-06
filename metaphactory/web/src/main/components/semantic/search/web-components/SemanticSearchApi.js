Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
exports.InitialQueryContextTypes = {
    domain: react_1.PropTypes.any.isRequired,
    baseConfig: react_1.PropTypes.any.isRequired,
    extendedSearch: react_1.PropTypes.any.isRequired,
    baseQueryStructure: react_1.PropTypes.any.isRequired,
    setDomain: react_1.PropTypes.func.isRequired,
    setBaseQuery: react_1.PropTypes.func.isRequired,
    setBaseQueryStructure: react_1.PropTypes.func.isRequired,
    searchProfileStore: react_1.PropTypes.any.isRequired,
};
exports.FacetContextTypes = {
    domain: react_1.PropTypes.any.isRequired,
    baseConfig: react_1.PropTypes.any.isRequired,
    baseQuery: react_1.PropTypes.any.isRequired,
    baseQueryStructure: react_1.PropTypes.any.isRequired,
    resultsStatus: react_1.PropTypes.object.isRequired,
    facetStructure: react_1.PropTypes.any.isRequired,
    setFacetStructure: react_1.PropTypes.func.isRequired,
    setFacetedQuery: react_1.PropTypes.func.isRequired,
    searchProfileStore: react_1.PropTypes.any.isRequired,
};
exports.ResultContextTypes = {
    domain: react_1.PropTypes.any.isRequired,
    baseConfig: react_1.PropTypes.any.isRequired,
    resultQuery: react_1.PropTypes.any.isRequired,
    baseQueryStructure: react_1.PropTypes.any.isRequired,
    facetStructure: react_1.PropTypes.any.isRequired,
    searchProfileStore: react_1.PropTypes.any.isRequired,
    useInExtendedFcFrSearch: react_1.PropTypes.any.isRequired,
    bindings: react_1.PropTypes.any.isRequired,
    notifyResultLoading: react_1.PropTypes.func.isRequired,
    resultState: react_1.PropTypes.object.isRequired,
    updateResultState: react_1.PropTypes.func.isRequired,
};
