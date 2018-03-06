Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var maybe = require("data.maybe");
var request = require("superagent");
var rdf_1 = require("platform/api/rdf");
var events_1 = require("platform/api/events");
var ldp_1 = require("../ldp");
var security_1 = require("../security");
var SetManagementEvents_1 = require("./SetManagementEvents");
var rdf = rdf_1.vocabularies.rdf, rdfs = rdf_1.vocabularies.rdfs, VocabPlatform = rdf_1.vocabularies.VocabPlatform, ldp = rdf_1.vocabularies.ldp, xsd = rdf_1.vocabularies.xsd;
var SetService = (function (_super) {
    tslib_1.__extends(SetService, _super);
    function SetService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SetService.prototype.createSet = function (name, slug) {
        if (slug === void 0) { slug = maybe.Nothing(); }
        var generatedIri = rdf_1.Rdf.iri('');
        var set = rdf_1.Rdf.graph(rdf_1.Rdf.triple(generatedIri, rdfs.label, rdf_1.Rdf.literal(name)), rdf_1.Rdf.triple(generatedIri, rdf.type, ldp.Container), rdf_1.Rdf.triple(generatedIri, rdf.type, VocabPlatform.Set));
        return this.addResource(set, slug);
    };
    SetService.prototype.addToExistingSet = function (setIri, itemIris) {
        var existingSet = new ldp_1.LdpService(setIri.value, this.context);
        return addSetItem(existingSet, itemIris);
    };
    SetService.prototype.createSetAndAddItems = function (name, listOfItemIris) {
        var _this = this;
        return this.createSet(name).flatMap(function (setLocation) {
            var newSet = new ldp_1.LdpService(setLocation.value, _this.context);
            return Kefir.zip(listOfItemIris.map(function (iri, index) { return addSetItem(newSet, iri, index); }).toJS());
        }).toProperty();
    };
    SetService.prototype.reorderItems = function (setIri, holders) {
        var set = new ldp_1.LdpService(setIri.value, this.context);
        return Kefir.zip(holders.map(function (_a, index) {
            var holder = _a.holder, item = _a.item;
            return set.update(holder, createItemHolderGraph(holder, item, index));
        }).toArray()).map(function () { }).toProperty();
    };
    return SetService;
}(ldp_1.LdpService));
exports.SetService = SetService;
function addSetItem(set, item, index) {
    var graph = createItemHolderGraph(rdf_1.Rdf.iri(''), item, index);
    return set.addResource(graph).map(function (holder) { return ({ holder: holder, item: item }); });
}
function createItemHolderGraph(holderIri, itemIri, index) {
    var triples = [
        rdf_1.Rdf.triple(holderIri, VocabPlatform.setItem, itemIri),
    ];
    if (typeof index === 'number') {
        triples.push(rdf_1.Rdf.triple(holderIri, VocabPlatform.setItemIndex, rdf_1.Rdf.literal(index.toString(), xsd.integer)));
    }
    return rdf_1.Rdf.graph(triples);
}
function addToDefaultSet(resource, sourceId) {
    return Kefir.combine([
        getSetServiceForUser(),
        Kefir.fromPromise(getUserDefaultSetIri()),
    ]).flatMap(function (_a) {
        var service = _a[0], defaultSetIri = _a[1];
        return service.addToExistingSet(defaultSetIri, resource).map(function () {
            events_1.trigger({ eventType: SetManagementEvents_1.SetManagementEvents.ItemAdded, source: sourceId });
            return resource;
        });
    }).toProperty();
}
exports.addToDefaultSet = addToDefaultSet;
function getUserSetRootContainerIri(username) {
    return new Promise(function (resolve, reject) {
        request.get('/rest/sets/getUserSetRootContainerIri')
            .query({ username: username })
            .type('application/json')
            .accept('text/plain')
            .end(function (err, res) {
            if (err) {
                reject(err);
            }
            var iri = res.text;
            if (typeof iri !== 'string') {
                throw new Error("Invalid user set root container IRI: " + iri);
            }
            resolve(rdf_1.Rdf.iri(iri));
        });
    });
}
exports.getUserSetRootContainerIri = getUserSetRootContainerIri;
function getUserDefaultSetIri(username) {
    return new Promise(function (resolve, reject) {
        request.get('/rest/sets/getUserDefaultSetIri')
            .query({ username: username })
            .type('application/json')
            .accept('text/plain')
            .end(function (err, res) {
            if (err) {
                reject(err);
            }
            var iri = res.text;
            if (typeof iri !== 'string') {
                throw new Error("Invalid user default set IRI: " + iri);
            }
            resolve(rdf_1.Rdf.iri(iri));
        });
    });
}
exports.getUserDefaultSetIri = getUserDefaultSetIri;
var ContainerOfUserSetContainers = (function (_super) {
    tslib_1.__extends(ContainerOfUserSetContainers, _super);
    function ContainerOfUserSetContainers(context) {
        return _super.call(this, VocabPlatform.UserSetContainer.value, context) || this;
    }
    ContainerOfUserSetContainers.prototype.getOrCreateSetContainer = function (setContainerIri) {
        var _this = this;
        var setService = new SetService(setContainerIri.value, this.context);
        return this.get(setContainerIri)
            .map(function (graph) { return setService; })
            .flatMapErrors(function () {
            return Kefir.combine([
                Kefir.fromPromise(security_1.Util.getUser()),
                Kefir.fromPromise(getUserDefaultSetIri()),
            ]).flatMap(function (_a) {
                var user = _a[0], defaultSetIri = _a[1];
                return _this.createSetContainerForUser(user, setContainerIri).flatMap(function () { return setService
                    .createSet('Uncategorized', maybe.Just(defaultSetIri.value)).flatMapErrors(function () { return Kefir.constant({}); }); });
            });
        }).map(function () { return setService; }).toProperty();
    };
    ContainerOfUserSetContainers.prototype.createSetContainerForUser = function (user, setContainerIri) {
        var generatedIri = rdf_1.Rdf.iri('');
        var containerName = "Set container of user '" + user.principal + "'";
        return this.addResource(rdf_1.Rdf.graph(rdf_1.Rdf.triple(generatedIri, rdfs.label, rdf_1.Rdf.literal(containerName)), rdf_1.Rdf.triple(generatedIri, rdf.type, ldp.Container), rdf_1.Rdf.triple(generatedIri, rdf.type, VocabPlatform.SetContainer)), maybe.Just(setContainerIri.value))
            .map(function () { });
    };
    return ContainerOfUserSetContainers;
}(ldp_1.LdpService));
var setContainerOfCurrentUser = undefined;
function getSetServiceForUser(context) {
    if (setContainerOfCurrentUser) {
        return setContainerOfCurrentUser;
    }
    var container = new ContainerOfUserSetContainers(context);
    setContainerOfCurrentUser = Kefir.fromPromise(getUserSetRootContainerIri())
        .flatMap(function (setContainerIri) { return container.getOrCreateSetContainer(setContainerIri); })
        .toProperty();
    return setContainerOfCurrentUser;
}
exports.getSetServiceForUser = getSetServiceForUser;
