Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var maybe = require("data.maybe");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var resource_label_1 = require("platform/api/services/resource-label");
var async_1 = require("platform/api/async");
var components_1 = require("platform/api/components");
var repository_1 = require("platform/api/services/repository");
var sparql_1 = require("platform/api/sparql");
var ResourceLink_1 = require("./ResourceLink");
var NavigationUtils_1 = require("../NavigationUtils");
var ResourceLinkComponent = (function (_super) {
    tslib_1.__extends(ResourceLinkComponent, _super);
    function ResourceLinkComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.renderLink = function (label) {
            var props = _.clone(_this.props);
            props.title = label;
            return react_1.createElement(ResourceLink_1.ResourceLink, _.assign({
                resource: rdf_1.Rdf.iri(_this.props.uri),
                params: NavigationUtils_1.extractParams(_this.props),
                className: _this.props.className,
                style: _this.props.style,
                title: _this.props.title,
                repository: _this.state.repository.getOrElse(undefined),
            }, props), _this.getChildren(_this.props.children, _this.state.label, _this.props.uri));
        };
        _this.getChildren = function (children, label, iri) {
            if ((_.isEmpty(children) || children === iri) && label.isJust) {
                children = label.get();
            }
            else if (_.isEmpty(children)) {
                children = '';
            }
            return children;
        };
        _this.fetchLabel = function (resource, children, repository) {
            if (_this.props.getlabel !== false && (_.isEmpty(children) || children === resource.value)) {
                return _this.cancellation.map(resource_label_1.getLabel(resource, { semanticContext: { repository: repository } }));
            }
            else {
                return Kefir.constant(resource.value);
            }
        };
        _this.getRepository = function () {
            if (_this.props.guessRepository) {
                return ResourceLinkComponent.repositories.map(function (repositories) {
                    return repositories.filter(function (running) { return running; }).map(function (_, repository) { return _this.executeGuessQuery(repository); });
                }).flatMap(function (responses) { return Kefir.combine(responses.toKeyedSeq().toObject()); }).map(function (responses) { return _.findKey(responses); }).toProperty();
            }
            else {
                return Kefir.constant(_this.context.semanticContext ? _this.context.semanticContext.repository : undefined);
            }
        };
        _this.executeGuessQuery = function (repository) {
            return sparql_1.SparqlClient.ask(sparql_1.SparqlClient.setBindings(ResourceLinkComponent.GUESS_QUERY, { subject: rdf_1.Rdf.iri(_this.props.uri) }), { context: { repository: repository } });
        };
        _this.state = {
            label: maybe.Nothing(),
            repository: maybe.Nothing(),
        };
        return _this;
    }
    ResourceLinkComponent.prototype.componentDidMount = function () {
        var _this = this;
        this.getRepository().onValue(function (repository) {
            _this.fetchLabel(rdf_1.Rdf.iri(_this.props.uri), _this.props.children, repository).onValue(function (label) { return _this.setState({
                label: maybe.Just(label),
                repository: maybe.Just(repository),
            }); });
        });
    };
    ResourceLinkComponent.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    ResourceLinkComponent.prototype.render = function () {
        return this.state.label.map(this.renderLink).getOrElse(null);
    };
    return ResourceLinkComponent;
}(components_1.Component));
ResourceLinkComponent.repositories = repository_1.getRepositoryStatus();
ResourceLinkComponent.GUESS_QUERY = (_a = ["ASK { ?subject a ?type }"], _a.raw = ["ASK { ?subject a ?type }"], sparql_1.SparqlUtil.Sparql(_a));
exports.ResourceLinkComponent = ResourceLinkComponent;
exports.default = ResourceLinkComponent;
var _a;
