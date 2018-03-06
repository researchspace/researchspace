Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
exports.SetKind = rdf_1.Rdf.iri('http://www.metaphacts.com/ontologies/platform#Set');
var DefaultSetItemActions = "\n  <div class='set-management__item-actions'>\n    <bs-dropdown-button pull-right=true bs-style='link' title=''\n                        id='set-actions-{{iri.value}}'>\n      <mp-set-management-action-remove-set-item>\n        <bs-menu-item event-key='remove'>Remove</bs-menu-item>\n      </mp-set-management-action-remove-set-item>\n    </bs-dropdown-button>\n  </div>\n";
var DefaultItemLabel = "\n  <span style='display: flex;'>\n    <mp-label iri='{{iri.value}}' highlight='{{highlight}}'\n              highlight-props='{\"style\": {\"color\": \"#dc8a4b\"}}'\n              style='white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'\n    ></mp-label>\n  </span>\n";
exports.GridTemplate = "\n  <mp-resource-card iri='{{iri.value}}'>" + DefaultSetItemActions + "</mp-resource-card>\n";
exports.SetListTemplate = "\n  <div style='display: flex; align-items: center; justify-content: space-between;'>\n    <div style='overflow: hidden;'>\n      " + DefaultItemLabel + "\n    </div>\n    <div class='set-management__item-actions' style='margin-left: auto;'>\n      <bs-dropdown-button pull-right=true bs-style='link' title=''\n                          id='set-actions-{{iri.value}}'>\n        <mp-set-management-action-manage-set>\n          <bs-menu-item event-key='manage'>Manage set</bs-menu-item>\n        </mp-set-management-action-manage-set>\n        <mp-set-management-action-rename-set>\n          <bs-menu-item event-key='rename'>Rename set</bs-menu-item>\n        </mp-set-management-action-rename-set>\n        <mp-set-management-action-remove-set>\n          <bs-menu-item event-key='remove'>Remove set</bs-menu-item>\n        </mp-set-management-action-remove-set>\n      </bs-dropdown-button>\n    </div>\n  </div>\n";
exports.ItemListTemplate = "\n  <div style='display: flex; align-items: center; justify-content: space-between;'>\n    <div style='overflow: hidden;'>\n      <mp-resource-link-container uri=\"{{iri.value}}\" draggable=false>\n        " + DefaultItemLabel + "\n      </mp-resource-link-container>\n    </div>\n    " + DefaultSetItemActions + "\n  </div>\n";
exports.KeywordSearch = {
    placeholder: 'Search all...',
    placeholderInSet: 'Search in the set...',
    queryPattern: "\n    ?item ?__preferredLabel__ ?itemLabel .\n    FILTER REGEX(STR(?itemLabel), \"(.*?)?__token__\", \"i\")",
};
exports.MinSearchTermLength = 3;
exports.SetItemsQuery = "\nPREFIX ldp: <http://www.w3.org/ns/ldp#>\nPREFIX prov: <http://www.w3.org/ns/prov#>\nPREFIX platform: <http://www.metaphacts.com/ontologies/platform#>\nPREFIX bds: <http://www.bigdata.com/rdf/search#>\nSELECT ?item ?itemHolder ?parent ?kind WHERE {\n  {\n    FILTER(!(?__isSearch__)) .\n    ?__rootSet__ ldp:contains ?itemHolder .\n    BIND(?__rootSet__ as ?parent) .\n    OPTIONAL { ?itemHolder platform:setItem ?setItem }\n    BIND(COALESCE(?setItem, ?itemHolder) AS ?item) .\n  } UNION {\n    FILTER(?__isSearch__) .\n    ?__rootSet__ ldp:contains ?__setToSearch__ .\n    ?__setToSearch__ ldp:contains ?itemHolder.\n    BIND(?__setToSearch__ as ?parent) .\n    ?itemHolder platform:setItem ?item .\n    FILTER(?__filterPatterns__)\n  }\n\n  OPTIONAL {\n    ?itemHolder platform:setItemIndex ?i .\n  }\n  OPTIONAL {\n    ?itemHolder prov:generatedAtTime ?modificationDate .\n  }\n  BIND(COALESCE(?i, 0) AS ?index) .\n  OPTIONAL {\n    ?item a platform:Set .\n    BIND(platform:Set as ?type)\n  }\n  BIND(COALESCE(?type, platform:SetItem) AS ?kind) .\n} ORDER BY ?index DESC(?modificationDate)";
exports.SetItemsMetadataQuery = "SELECT ?item WHERE {}";
exports.SetCountQuery = "\nPREFIX ldp: <http://www.w3.org/ns/ldp#>\nSELECT ?set (COUNT(?item) as ?count) WHERE {\n  ?__rootSet__ ldp:contains ?set .\n  OPTIONAL { ?set ldp:contains ?item }\n} GROUP BY ?set";
function itemConfig(kind) {
    switch (kind.toString()) {
        case exports.SetKind.toString():
            return { isSet: true, gridTemplate: exports.SetListTemplate, listTemplate: exports.SetListTemplate };
        case '<http://www.metaphacts.com/ontologies/platform#SetItem>':
            return { isSet: false, gridTemplate: exports.GridTemplate, listTemplate: exports.ItemListTemplate };
        default: return undefined;
    }
}
exports.itemConfig = itemConfig;
exports.AcceptResourceQuery = 'ASK {}';
exports.ForAllProps = {
    setItemsQuery: exports.SetItemsQuery,
    setItemsMetadataQuery: exports.SetItemsMetadataQuery,
    setCountQuery: exports.SetCountQuery,
    acceptResourceQuery: exports.AcceptResourceQuery,
    keywordFilter: exports.KeywordSearch,
    filters: [],
    defaultViewMode: 'list',
    persistViewMode: true,
};
