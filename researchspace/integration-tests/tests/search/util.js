"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const selenium_webdriver_1 = require("selenium-webdriver");
const QueryString = require("querystring");
const asyncQ = require("async-q");
const _ = require("lodash");
const Url = require("url");
const fs_1 = require("mz/fs");
const path_1 = require("path");
const util_1 = require("../util");
const util_2 = require("../util");
const util_3 = require("../util");
const util_4 = require("../util");
const htmlDnD = require('html-dnd');
const dateFormatItemClasses = {
    'Date': 0,
    'DateRange': 1,
    'DateDeviation': 2,
    'Year': 3,
    'YearRange': 4,
    'YearDeviation': 5
};
class Search {
    constructor(driver, t) {
        this.knownClauses = {};
        this.driver = driver;
        this.t = t;
    }
    startSearch(url) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_2.get(this.driver, url);
            yield util_1.waitElement(this.driver, '.QueryBuilder--searchArea');
        });
    }
    selectItem(parentSelector, childSelector, childName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const parent = yield util_2.findOnlyElement(this.driver, this.t, parentSelector);
            const items = yield parent.findElements(selenium_webdriver_1.By.css(childSelector));
            for (let item of items) {
                const itemText = yield util_1.getText(item);
                if (itemText === childName) {
                    yield item.click();
                    return;
                }
            }
            yield this.t.ok(false, `item should exist`);
        });
    }
    setDomain(domain) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.selectItem('.QueryBuilder--domainSelection', '.QueryBuilder--categorySelectionItem', domain);
        });
    }
    setRange(range) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.selectItem('.QueryBuilder--rangeSelection', '.QueryBuilder--categorySelectionItem', range);
        });
    }
    setRelation(relation) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.selectItem('.QueryBuilder--relationSelector', '.ItemSelector--itemHolder', relation);
        });
    }
    setDateFormat(name) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const parent = yield util_2.findOnlyElement(this.driver, this.t, '.DateFormatSelector--holder');
            const placeholder = yield util_2.findOnlyChild(this.driver, this.t, parent, '.Select-placeholder');
            yield placeholder.click();
            const item = (yield parent.findElements(selenium_webdriver_1.By.css('.Select-option')))[dateFormatItemClasses[name]];
            yield item.click();
        });
    }
    setYearByElement(t, element, value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const parts = value.split("/");
            yield t.ok(parts.length == 2, 'year and era are separated by slash');
            const year = parts[0], era = parts[1];
            const input = yield util_2.findOnlyChild(this.driver, t, element, 'input');
            yield util_1.scrollIntoElement(this.driver, input);
            yield input.sendKeys(year);
            if (era !== 'AD') {
                const select = yield util_2.findOnlyChild(this.driver, t, element, 'select');
                yield util_1.scrollIntoElement(this.driver, select);
                yield util_2.setSelectValue(this.driver, t, select, era.toUpperCase());
            }
        });
    }
    setYearRange(from, upto) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const elements = yield this.driver.findElements(selenium_webdriver_1.By.css('.YearInput--holder'));
            yield this.t.ok(elements.length == 2, `date range has two inputs`);
            yield this.setYearByElement(this.t, elements[0], from);
            yield this.setYearByElement(this.t, elements[1], upto);
            yield this.clickDateSelectButton();
        });
    }
    setYear(exact) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const elements = yield this.driver.findElements(selenium_webdriver_1.By.css('.YearInput--holder'));
            yield this.t.ok(elements.length == 1, `date range has two inputs`);
            yield this.setYearByElement(this.t, elements[0], exact);
            yield this.clickDateSelectButton();
        });
    }
    clickDateSelectButton() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const button = yield util_2.findOnlyElement(this.driver, this.t, '.DateFormatSelector--inputHolder .btn');
            yield util_1.scrollIntoElement(this.driver, button);
            yield util_1.wait(500);
            yield button.click();
        });
    }
    getLastClause() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.getNumResults();
            const newClauses = yield this.driver.findElements(selenium_webdriver_1.By.css('.QueryBuilder--searchClause'));
            const addedClauses = yield asyncQ.filterSeries(newClauses, (newClause) => tslib_1.__awaiter(this, void 0, void 0, function* () { return !this.knownClauses[yield newClause.getAttribute('id')]; }));
            const id = yield addedClauses[0].getAttribute('id');
            this.knownClauses[id] = true;
            return `#${id}`;
        });
    }
    hoverAndClick(elementToHover, button) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.driver.actions().mouseMove(elementToHover).perform();
            yield util_1.wait(200);
            yield button.click();
        });
    }
    addClause(clause, selector) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const parent = yield util_2.findOnlyElement(this.driver, this.t, clause);
            const removeButton = yield util_2.findOnlyChild(this.driver, this.t, parent, '.QueryBuilder--removeConjunctButton');
            const button = yield util_2.findOnlyChild(this.driver, this.t, parent, selector);
            yield this.hoverAndClick(removeButton, button);
        });
    }
    addOrClause(clause) {
        return this.addClause(clause, '.QueryBuilder--addDisjunctButton');
    }
    addAndClause(clause) {
        return this.addClause(clause, '.QueryBuilder--addConjunctButton');
    }
    findSet(nameOfSet) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.waitElement(this.driver, '.set-management__set-caption span > span');
            yield util_1.wait(500);
            const items = yield asyncQ.filterSeries(yield this.driver.findElements(selenium_webdriver_1.By.css('.set-management__set-caption span > span')), (element) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(element)) == nameOfSet; }));
            yield this.t.ok(items.length == 1, `only one set in clipboard with name "${nameOfSet}" (got ${items.length})`);
            return items[0];
        });
    }
    typeRange(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const input = yield util_2.findOnlyElement(this.driver, this.t, '.QueryBuilder--searchBasedTermSelector input');
            yield input.sendKeys(value);
        });
    }
    typeTextRange(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const input = yield util_2.findOnlyElement(this.driver, this.t, '.TextSelection--inputGroup input');
            yield input.sendKeys(value);
            const button = yield util_2.findOnlyElement(this.driver, this.t, '.btn-primary');
            yield button.click();
        });
    }
    fillRangeFromSet(nameOfSet) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const setSpan = yield this.findSet(nameOfSet);
            const draggable = yield this.driver.executeScript(`return arguments[0].parentNode.parentNode.parentNode.parentNode.parentNode;`, setSpan);
            let droppables = [];
            droppables = (yield this.driver.findElements(selenium_webdriver_1.By.css('.SemanticTreeInput--holder.QueryBuilder--hierarchySelector')));
            if (droppables.length == 0) {
                droppables = (yield this.driver.findElements(selenium_webdriver_1.By.css('.QueryBuilder--resourceSelector')));
            }
            this.t.ok(droppables.length == 1, 'there should be an item to drop onto');
            const droppable = droppables[0];
            yield util_4.debugElement(draggable, 'set');
            yield util_4.debugElement(droppable, 'input');
            const storeId = yield this.driver.executeAsyncScript(htmlDnD.dragCode, draggable);
            yield util_1.wait(1000);
            yield this.driver.executeScript(htmlDnD.dropCode, storeId, droppable);
        });
    }
    selectRange(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.waitElement(this.driver, '.QueryBuilder--searchBasedTermSelector .Select-option');
            const element = yield util_2.findOnlyElement(this.driver, this.t, `.QueryBuilder--searchBasedTermSelector .Select-option span[title="${value}"]`);
            yield element.click();
        });
    }
    toggleRangeNode(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.waitElement(this.driver, '.LazyTreeSelector--itemExpanded > div > span, .LazyTreeSelector--itemCollapsed > div > span');
            const items = yield this.driver.executeScript(`
      return (function (value) {
        return Array.prototype.slice.call(
          document.querySelectorAll(
            '.LazyTreeSelector--itemExpanded > div > span, .LazyTreeSelector--itemCollapsed > div > span'
          )
        ).filter(function (element) {
          return element.textContent == value;
        });
      })(arguments[0]);
    `, value);
            const checkboxes = yield this.driver.executeScript(`
      return Array.prototype.slice.call(
        arguments[0].parentNode.parentNode.children
      ).filter(x => x.tagName.toLowerCase() == 'input');
    `, items[0]);
            yield util_1.scrollIntoElement(this.driver, checkboxes[0]);
            yield checkboxes[0].click();
        });
    }
    submitRangeTree() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const buttons = yield asyncQ.filterSeries(yield this.driver.findElements(selenium_webdriver_1.By.css('.SemanticTreeInput--dropdownButton')), (element) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(element)) == 'Select'; }));
            yield this.t.ok(buttons.length == 1, `only one Select button (got ${buttons.length})`);
            yield buttons[0].click();
        });
    }
    getSearchResults() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const numResults = yield this.getNumResults();
            yield util_1.waitElement(this.driver, '#search-results .nav.nav-tabs li');
            yield this.switchResultMode('Table');
            yield util_1.waitLoaders(this.driver);
            const results = [];
            results.push(yield this.getSearchResultsPage());
            const limit = numResults == null ? 100 : Math.ceil(numResults / 10) - 1;
            if (limit !== 0) {
                const button = yield this.findNextPageBtn();
                yield util_1.scrollIntoElement(this.driver, button);
            }
            for (let i = 0; i < limit; ++i) {
                const button = yield this.findNextPageBtn();
                const btnClass = yield button.getAttribute('class');
                if (btnClass === 'disabled') {
                    break;
                }
                yield button.click();
                results.push(yield this.getSearchResultsPage());
            }
            const output = _.flatten(results).sort();
            yield this.t.equal(numResults, output.length, `correct number of results`);
            return output;
        });
    }
    getNumResults() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.wait(500);
            yield util_1.waitLoaders(this.driver);
            yield util_1.waitElement(this.driver, '.num-results');
            const element = yield util_2.findOnlyElement(this.driver, this.t, '.num-results');
            if (!element)
                return;
            const text = yield util_1.getText(element);
            const matches = text.match(/^Found ([0-9]+) matches$/);
            yield this.t.ok(matches != null, `correct message with result count`);
            if (matches == null)
                return null;
            return parseInt(matches[1], 10);
        });
    }
    switchResultMode(mode) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const tabs = yield this.driver.findElements(selenium_webdriver_1.By.css('#search-results .nav.nav-tabs li'));
            const tableTabs = yield asyncQ.filterSeries(tabs, (tab) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(tab)) == mode; }));
            yield this.t.ok(tableTabs.length == 1, `only one ${mode} tab (got ${tableTabs.length})`);
            const tableTab = tableTabs[0];
            yield util_1.scrollIntoElement(this.driver, tableTab);
            yield tableTab.click();
            yield util_1.wait(200);
        });
    }
    findNextPageBtn() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.waitElement(this.driver, '.pagination li a span');
            const pageNavs = yield asyncQ.filterSeries(yield this.driver.findElements(selenium_webdriver_1.By.css('.pagination li a span')), (nav) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(nav)) == '»'; }));
            const result = yield this.driver.executeScript(`return arguments[0].parentNode.parentNode;`, pageNavs[0]);
            return result;
        });
    }
    getSearchResultsPage() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.waitElement(this.driver, '#search-results a[href^="/resource/"]');
            yield util_1.wait(300);
            const elements = yield this.driver.findElements(selenium_webdriver_1.By.css('#search-results a[href^="/resource/"]'));
            const hrefs = yield this.driver.executeScript(`
      return Array.prototype.slice.call(arguments[0]).map(function (element) {
        return element.getAttribute('href');
      });
    `, elements);
            const uris = hrefs.map(href => {
                const url = Url.parse(href);
                if (url.query) {
                    return `<${QueryString.parse(url.query)['uri']}>`;
                }
                else if (url.path) {
                    const path = url.path.split('/');
                    return decodeURIComponent(path[path.length - 1]);
                }
                else {
                    this.t.ok(false, `result url is parseable`);
                }
            });
            return uris;
        });
    }
    removeConjunct(text) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.removeClause(text);
            const buttons = yield asyncQ.filterSeries(yield this.driver.findElements(selenium_webdriver_1.By.css('.QueryBuilder--removeConjunctButton')), (button) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(button)) == 'cancel'; }));
            yield this.t.ok(buttons.length == 1, `only one button to cancel conjunction edit (got ${buttons.length})`);
            yield buttons[0].click();
        });
    }
    removeClause(text) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const clause = yield this.findClause(text);
            const button = yield util_2.findOnlyChild(this.driver, this.t, clause, '.QueryBuilder--editButton');
            yield this.driver.actions().mouseMove(button).perform();
            yield button.click();
        });
    }
    findClause(text) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const elements = yield this.driver.findElements(selenium_webdriver_1.By.css('.QueryBuilder--itemHolder'));
            const clauses = yield asyncQ.filterSeries(elements, (element) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                return (yield util_1.getText(element)) === text;
            }));
            yield this.t.ok(clauses.length == 1, `only one clause with such text`);
            return clauses[0];
        });
    }
    startNestedSearch() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const button = yield util_2.findOnlyElement(this.driver, this.t, '.QueryBuilder--nestedSearchButton');
            yield button.click();
        });
    }
    showFacet() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const button = yield util_2.findOnlyElement(this.driver, this.t, '.show-facet-button');
            yield button.click();
            yield util_1.waitElement(this.driver, '.facet');
        });
    }
    filterByName(list, name) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield asyncQ.filterSeries(list, (item) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const text = yield util_1.getText(item);
                const matches = text.match(/^(.*) \([0-9]+\)$/);
                return matches != null && matches[1] == name;
            }));
        });
    }
    openFacetRelation(name) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const relations = yield this.filterByName(yield this.driver.findElements(selenium_webdriver_1.By.css('.facet-relation__content')), name);
            yield this.t.ok(relations.length == 1, `only one "${name}" relation (got ${relations.length})`);
            const relation = yield this.driver.executeScript(`return arguments[0].parentNode.parentNode;`, relations[0]);
            const icon = yield relation.findElements(selenium_webdriver_1.By.css('.facet__relation__header__icon'));
            if (icon.length == 1) {
                yield util_1.scrollIntoElement(this.driver, relation);
                yield relation.click();
                yield util_1.waitChildElement(relation, '.facet__relation__values');
            }
            return yield this.driver.executeScript(`return arguments[0].parentNode;`, relation);
        });
    }
    clickFacetCheckbox(relation, name) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const input = yield util_2.findOnlyChild(this.driver, this.t, relation, '.facet__relation__values__filter > input');
            yield input.sendKeys(name);
            yield util_1.waitElement(this.driver, '.facet__relation__values__value.checkbox');
            const checkboxes = yield this.filterByName(yield relation.findElements(selenium_webdriver_1.By.css('.facet__relation__values__value.checkbox')), name);
            yield this.t.ok(checkboxes.length == 1, `only one "${name}" checkbox (got ${checkboxes.length})`);
            yield util_1.scrollIntoElement(this.driver, checkboxes[0]);
            yield checkboxes[0].click();
        });
    }
    saveSet(nameOfSet) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_3.clickButtonByCaption(this.driver, this.t, 'Save As Set');
            const input = yield util_2.findOnlyElement(this.driver, this.t, '.save-as-dataset-modal__form__collection-name');
            yield input.sendKeys(nameOfSet);
            const submit = yield util_2.findOnlyElement(this.driver, this.t, '.save-as-dataset-modal__form__save-button');
            yield submit.click();
            yield util_1.waitElement(this.driver, '.set-management__set');
        });
    }
    deleteSet(nameOfSet) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const setSpan = yield this.findSet(nameOfSet);
            const parent = yield this.driver.executeScript(`return arguments[0].parentNode.parentNode.parentNode;`, setSpan);
            const button = yield util_2.findOnlyChild(this.driver, this.t, parent, 'button');
            yield this.hoverAndClick(setSpan, button);
            const links = yield asyncQ.filterSeries(yield parent.findElements(selenium_webdriver_1.By.css('a')), (element) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(element)) == 'Remove set'; }));
            this.t.ok(links.length == 1, `only one link to remove set (got ${links.length})`);
            yield links[0].click();
            const yesButtons = yield asyncQ.filterSeries(yield parent.findElements(selenium_webdriver_1.By.css('.btn-toolbar > button')), (element) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield util_1.getText(element)) == 'yes'; }));
            this.t.ok(yesButtons.length == 1, `only one yes button (got ${yesButtons.length})`);
            const yesButton = yesButtons[0];
            yield yesButton.click();
            yield util_1.waitElementRemoved(this.driver, '.dropdown.open.btn-group.btn-group-link');
        });
    }
}
exports.Search = Search;
class DatasetLoader {
    constructor(ds) {
        this.ds = ds;
    }
    readData(fileName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return JSON.parse(yield fs_1.readFile(path_1.join(__dirname, '..', '..', 'data', this.ds, fileName + '.json'), { encoding: 'utf8' }));
        });
    }
}
exports.DatasetLoader = DatasetLoader;
function testSearch(driver, t, options, f) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const d = new DatasetLoader(options.dataset);
        const s = new Search(driver, t);
        yield s.startSearch(options.searchUrl);
        yield f(s, d);
    });
}
exports.testSearch = testSearch;
function testByExample(driver, t, options, examples, f) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield asyncQ.mapSeries(_.toPairs(examples), ([key, example]) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield t.test(`${key}`, (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                return yield testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield f(s, d, example);
                }));
            }));
        }));
    });
}
exports.testByExample = testByExample;
//# sourceMappingURL=util.js.map