Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var SemanticChart_1 = require("../../../../main/components/semantic/chart/SemanticChart");
var literal = rdf_1.Rdf.literal, iri = rdf_1.Rdf.iri;
var xsd = rdf_1.vocabularies.xsd;
var NON_PIVOTING_DATASETS = {
    'head': {
        'link': [],
        'vars': ['year', 'papers', 'authors', 'authorsPerPaper'],
    },
    'results': {
        'distinct': undefined,
        'ordered': undefined,
        'bindings': [
            {
                'year': literal('2008'),
                'papers': literal('149', xsd.integer),
                'authors': literal('396', xsd.integer),
                'authorsPerPaper': literal('2.6577181208053691275', xsd.decimal),
            },
            {
                'year': literal('2009'),
                'papers': literal('118', xsd.integer),
                'authors': literal('358', xsd.integer),
                'authorsPerPaper': literal('3.03389830508474576271', xsd.decimal),
            },
        ],
    },
};
var peter = iri('http://data.semanticweb.org/person/peter-haase');
var enrico = iri('http://data.semanticweb.org/person/enrico-motta');
var PIVOTING_DATASETS = {
    'head': {
        'link': [],
        'vars': ['author', 'year', 'papers'],
    },
    'results': {
        'distinct': undefined,
        'ordered': undefined,
        'bindings': [{
                'author': peter, 'year': literal('2010'), 'papers': literal('2', xsd.integer),
            }, {
                'author': peter, 'year': literal('2012'), 'papers': literal('1', xsd.integer),
            }, {
                'author': enrico, 'year': literal('2012'), 'papers': literal('2', xsd.integer),
            }, {
                'author': peter, 'year': literal('2013'), 'papers': literal('7', xsd.integer),
            }, {
                'author': enrico, 'year': literal('2013'), 'papers': literal('2', xsd.integer),
            }],
    },
};
function chartConfig(config) {
    return {
        type: config.type,
        sets: config.dataSets,
        multiDataSet: config.multiDataSet,
        query: '',
        provider: config.provider,
    };
}
describe('ChartWidgetComponent', function () {
    it('builds categorial data without pivoting (highcharts)', function () {
        var props = chartConfig({
            type: 'bar',
            dataSets: [
                { dataSetName: 'Authors', category: 'year', value: 'authors' },
                { dataSetName: 'Papers', category: 'year', value: 'papers' },
            ],
            provider: 'highcharts',
        });
        var builtData = SemanticChart_1.buildData(props, NON_PIVOTING_DATASETS);
        var expectedData = {
            'sets': [
                {
                    'mapping': {
                        'dataSetName': 'Authors',
                        'category': 'year',
                        'value': 'authors',
                    },
                    'iri': undefined,
                    'name': 'Authors',
                    'points': NON_PIVOTING_DATASETS.results.bindings,
                },
                {
                    'mapping': {
                        'dataSetName': 'Papers',
                        'category': 'year',
                        'value': 'papers',
                    },
                    'iri': undefined,
                    'name': 'Papers',
                    'points': NON_PIVOTING_DATASETS.results.bindings,
                },
            ],
            'categories': [
                literal('2008'), literal('2009'),
            ],
        };
        chai_1.assert.deepEqual(builtData, expectedData);
    });
    it('builds categorial data with pivoting (chartjs)', function () {
        var props = chartConfig({
            type: 'bar',
            multiDataSet: { dataSetVariable: 'author', category: 'year', value: 'papers' },
            provider: 'chartjs',
        });
        var builtData = SemanticChart_1.buildData(props, PIVOTING_DATASETS);
        var expectedData = {
            'sets': [
                {
                    'id': 'http://data.semanticweb.org/person/enrico-motta',
                    'iri': enrico,
                    'name': null,
                    'mapping': {
                        'dataSetVariable': 'author',
                        'category': 'year',
                        'value': 'papers',
                    },
                    'points': [
                        null,
                        {
                            'author': enrico, 'year': literal('2012'), 'papers': literal('2', xsd.integer),
                        },
                        {
                            'author': enrico, 'year': literal('2013'), 'papers': literal('2', xsd.integer),
                        },
                    ],
                },
                {
                    'id': 'http://data.semanticweb.org/person/peter-haase',
                    'iri': peter,
                    'name': null,
                    'mapping': {
                        'dataSetVariable': 'author',
                        'category': 'year',
                        'value': 'papers',
                    },
                    'points': [
                        {
                            'author': peter, 'year': literal('2010'), 'papers': literal('2', xsd.integer),
                        },
                        {
                            'author': peter, 'year': literal('2012'), 'papers': literal('1', xsd.integer),
                        }, {
                            'author': peter, 'year': literal('2013'), 'papers': literal('7', xsd.integer),
                        },
                    ],
                },
            ],
            'categories': [
                literal('2010'), literal('2012'), literal('2013'),
            ],
        };
        chai_1.assert.deepEqual(builtData, expectedData);
    });
});
