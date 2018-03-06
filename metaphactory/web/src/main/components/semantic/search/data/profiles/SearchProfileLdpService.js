Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var maybe = require("data.maybe");
var assign = require("object-assign");
var immutable_1 = require("immutable");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var Vocabulary_1 = require("../Vocabulary");
var xsd = rdf_1.vocabularies.xsd, rdfs = rdf_1.vocabularies.rdfs, rdf = rdf_1.vocabularies.rdf, ldp = rdf_1.vocabularies.ldp;
var SearchProfileProfileLdpServiceClass = (function (_super) {
    tslib_1.__extends(SearchProfileProfileLdpServiceClass, _super);
    function SearchProfileProfileLdpServiceClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SearchProfileProfileLdpServiceClass.prototype.getAvailableProfiles = function () {
        var _this = this;
        return this.getContainer().map(function (graph) {
            var profilesIris = graph.triples.filter(function (triple) { return triple.p.equals(ldp.contains); }).map(function (triple) { return triple.o; }).toSet();
            return profilesIris.map(function (iri) {
                return {
                    iri: iri,
                    label: _this.getProfileMetadata(iri, graph).label,
                    tuple: {},
                };
            }).toSet();
        });
    };
    SearchProfileProfileLdpServiceClass.prototype.getProfile = function (iri) {
        var _this = this;
        return this.get(iri).map(function (graph) { return _this.parseGraphToProfile(iri, graph); });
    };
    SearchProfileProfileLdpServiceClass.prototype.createProfile = function (name, description) {
        return this.addResource(this.createProfileGraph(name, description), maybe.Just(name));
    };
    SearchProfileProfileLdpServiceClass.prototype.updateProfile = function (iri, profile) {
        return this.update(iri, this.profileToGraph(iri, profile));
    };
    SearchProfileProfileLdpServiceClass.prototype.createProfileGraph = function (name, description) {
        var iri = rdf_1.Rdf.iri('');
        return rdf_1.Rdf.graph(rdf_1.Rdf.triple(iri, rdf.type, Vocabulary_1.default.Profile), rdf_1.Rdf.triple(iri, rdfs.label, rdf_1.Rdf.literal(name)), rdf_1.Rdf.triple(iri, rdfs.comment, rdf_1.Rdf.literal(description)));
    };
    SearchProfileProfileLdpServiceClass.prototype.profileToGraph = function (iri, profile) {
        var base = rdf_1.Rdf.graph(rdf_1.Rdf.triple(iri, rdf.type, Vocabulary_1.default.Profile), rdf_1.Rdf.triple(iri, rdfs.label, rdf_1.Rdf.literal(profile.label)), rdf_1.Rdf.triple(iri, rdfs.comment, rdf_1.Rdf.literal(profile.description))).triples;
        var categories = this.categoriesToGraph(iri, profile.categories);
        var relations = this.relationsToGraph(iri, profile.relations);
        return rdf_1.Rdf.graph(base.union(categories).union(relations));
    };
    SearchProfileProfileLdpServiceClass.prototype.categoriesToGraph = function (iri, categories) {
        return this.collectionToGraph(iri, categories, Vocabulary_1.default.hasCategory, Vocabulary_1.default.category);
    };
    SearchProfileProfileLdpServiceClass.prototype.relationsToGraph = function (iri, relations) {
        return this.collectionToGraph(iri, relations, Vocabulary_1.default.hasRelation, Vocabulary_1.default.relation);
    };
    SearchProfileProfileLdpServiceClass.prototype.collectionToGraph = function (iri, collection, hasIri, relationIri) {
        return collection.toIndexedSeq().map(function (category, i) {
            var holder = rdf_1.Rdf.bnode();
            return immutable_1.Set.of(rdf_1.Rdf.triple(iri, hasIri, holder), rdf_1.Rdf.triple(holder, relationIri, category.iri), rdf_1.Rdf.triple(holder, Vocabulary_1.default.order, rdf_1.Rdf.literal((i).toString(), xsd.integer)));
        }).flatten().toSet();
    };
    SearchProfileProfileLdpServiceClass.prototype.parseGraphToProfile = function (profileIri, graph) {
        return assign({
            categories: this.getCategories(graph),
            relations: this.getRelations(graph),
        }, this.getProfileMetadata(profileIri, graph));
    };
    SearchProfileProfileLdpServiceClass.prototype.getProfileMetadata = function (profileIri, graph) {
        return {
            label: graph.triples.find(function (t) { return t.s.equals(profileIri) && t.p.equals(rdfs.label); }).o.value,
            description: graph.triples.find(function (t) { return t.s.equals(profileIri) && t.p.equals(rdfs.comment); }).o.value,
        };
    };
    SearchProfileProfileLdpServiceClass.prototype.getCategories = function (graph) {
        var categoryHolders = graph.triples.filter(function (t) { return t.p.equals(Vocabulary_1.default.hasCategory); }).map(function (t) { return t.o; });
        return immutable_1.OrderedSet(categoryHolders.map(function (categoryNode) {
            var category = graph.triples.find(function (t) { return t.s.equals(categoryNode) && t.p.equals(Vocabulary_1.default.category); }).o;
            var order = graph.triples.find(function (t) { return t.s.equals(categoryNode) && t.p.equals(Vocabulary_1.default.order); }).o;
            return {
                order: order,
                value: category,
            };
        }).sort(function (c1, c2) {
            if (c1.order.value < c2.order.value) {
                return -1;
            }
            if (c1.order.value > c2.order.value) {
                return 1;
            }
            return 0;
        }).map(function (c) { return c.value; }));
    };
    SearchProfileProfileLdpServiceClass.prototype.getRelations = function (graph) {
        var categoryHolder = graph.triples.filter(function (t) { return t.p.equals(Vocabulary_1.default.hasRelation); }).map(function (t) { return t.o; });
        return immutable_1.OrderedSet(categoryHolder.map(function (categoryNode) {
            var category = graph.triples.find(function (t) { return t.s.equals(categoryNode) && t.p.equals(Vocabulary_1.default.relation); }).o;
            var order = graph.triples.find(function (t) { return t.s.equals(categoryNode) && t.p.equals(Vocabulary_1.default.order); }).o;
            return {
                order: order,
                value: category,
            };
        }).sort(function (c1, c2) {
            if (c1.order.value < c2.order.value) {
                return -1;
            }
            if (c1.order.value > c2.order.value) {
                return 1;
            }
            return 0;
        }).map(function (c) { return c.value; }));
    };
    return SearchProfileProfileLdpServiceClass;
}(ldp_1.LdpService));
exports.SearchProfileProfileLdpServiceClass = SearchProfileProfileLdpServiceClass;
exports.SearchProfileLdpService = new SearchProfileProfileLdpServiceClass(Vocabulary_1.default.ProfileContainer.value);
exports.default = exports.SearchProfileLdpService;
