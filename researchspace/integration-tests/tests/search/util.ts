/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import {By, WebDriver, WebElement, Key} from 'selenium-webdriver';
import {Test} from 'tap';
import * as QueryString from 'querystring';
import * as asyncQ from 'async-q';
import * as _ from 'lodash';
import * as Url from 'url';
import {readFile} from 'mz/fs';
import {join} from 'path';

import {Options} from '../options';
import {
  wait, waitElement, waitPageLoad, waitLoaders, waitChildElement, waitElementRemoved,
  getText, scrollIntoElement,
} from '../util';
import {get, findOnlyElement, findOnlyChild, setSelectValue} from '../util';
import {clickButtonByCaption} from '../util';
import {debugElement} from '../util';

// https://bugs.chromium.org/p/chromedriver/issues/detail?id=841
const htmlDnD = require('html-dnd');

export type DateFormat = 'Date' | 'DateRange' | 'DateDeviation' | 'Year' | 'YearRange' | 'YearDeviation'
const dateFormatItemClasses: { [format: string]: number; } = {
  'Date': 0,
  'DateRange': 1,
  'DateDeviation': 2,
  'Year': 3,
  'YearRange': 4,
  'YearDeviation': 5
};

export class Search {
  private driver: WebDriver;
  private t: Test;

  constructor(driver: WebDriver, t: Test) {
    this.driver = driver;
    this.t = t;
  }

  /**
   * Start new search
   */
  async startSearch(url: string) {
    await get(this.driver, url);
    await waitElement(this.driver, '.QueryBuilder--searchArea');
  }

  /**
   * Select item from dropdown list
   * @param parentSelector selector for the frame
   * @param childSelector selector for item
   * @param childName text of the child to find
   */
  private async selectItem(parentSelector: string, childSelector: string, childName: string) {
    const parent = await findOnlyElement(this.driver, this.t, parentSelector);
    const items = await parent.findElements(By.css(childSelector));
    for (let item of items) {
      const itemText = await getText(item);
      if (itemText === childName) {
        await item.click();
        return;
      }
    }
    await this.t.ok(false, `item should exist`);
  }

  /**
   * Set domain
   * @param domain domain
   */
  async setDomain(domain: string) {
    await this.selectItem('.QueryBuilder--domainSelection', '.QueryBuilder--categorySelectionItem', domain);
  }

  /**
   * Set range
   * @param range range
   */
  async setRange(range: string) {
    await this.selectItem('.QueryBuilder--rangeSelection', '.QueryBuilder--categorySelectionItem', range);
  }

  /**
   * Set relation
   * @param relation relation
   */
  async setRelation(relation: string) {
    await this.selectItem('.QueryBuilder--relationSelector', '.ItemSelector--itemHolder', relation);
  }

  /**
   * Select date input format
   * @param name either of Date, DateRange, DateDeviation, Year, YearRange, YearDeviation
   */
  async setDateFormat(name: DateFormat) {
    const parent = await findOnlyElement(this.driver, this.t, '.DateFormatSelector--holder');
    const placeholder = await findOnlyChild(this.driver, this.t, parent, '.Select-placeholder');
    await placeholder.click();
    const item = (await parent.findElements(By.css('.Select-option')))[dateFormatItemClasses[name]];
    await item.click();
  }


  /**
   * Set year into a year selection control
   */
  async setYearByElement(t: Test, element: WebElement, value: string) {
    const parts = value.split('/');
    await t.ok(parts.length === 2, 'year and era are separated by slash');
    const year = parts[0], era = parts[1];
    const input = await findOnlyChild(this.driver, t, element, 'input');
    await scrollIntoElement(this.driver, input);
    await input.clear();
    await input.sendKeys(year);
    if (era !== 'AD') {
      const select = await findOnlyChild(this.driver, t, element, 'select');
      await scrollIntoElement(this.driver, select);
      await setSelectValue(this.driver, t, select, era.toUpperCase());
    }
  }

  /**
   * Set year range
   * @param from eariler year
   * @param upto latter year
   */
  async setYearRange(from: string, upto: string) {
    const elements = await this.driver.findElements(By.css('.YearInput--holder'));
    await this.t.ok(elements.length === 2, `date range has two inputs`);
    await this.setYearByElement(this.t, elements[0], from);
    await this.setYearByElement(this.t, elements[1], upto);
    await this.clickDateSelectButton();
  }

  /**
   * Set year
   * @param exact the only value
   */
  async setYear(exact: string) {
    const elements = await this.driver.findElements(By.css('.YearInput--holder'));
    await this.t.ok(elements.length === 1, `date range has two inputs`);
    await this.setYearByElement(this.t, elements[0], exact);
    await this.clickDateSelectButton();
  }

  async clickDateSelectButton() {
    const button = await findOnlyElement(this.driver, this.t, '.DateFormatSelector--inputHolder .btn');
    await scrollIntoElement(this.driver, button);
    await wait(500);
    await button.click();
  }

  // identifiers of already found clauses
  private knownClauses: {[clause: string]: boolean} = {};

  /**
   * Get last added clause
   */
  public async getLastClause() {
    await this.getNumResults();
    const newClauses = await this.driver.findElements(By.css('.QueryBuilder--searchClause'));
    const addedClauses = await asyncQ.filterSeries(newClauses, async (newClause: WebElement) =>
      !this.knownClauses[await newClause.getAttribute('id')]
    );
    const id = await addedClauses[0].getAttribute('id');
    this.knownClauses[id] = true;
    return `#${id}`;
  }

  private async hoverAndClick(elementToHover: WebElement, button: WebElement) {
    await this.driver.actions().mouseMove(elementToHover).perform();
    await wait(200);
    await button.click();
  }

  /**
   * Press "and" or "or" button
   * @param clause clause id
   * @param selecor selector for given type of button
   */
  private async addClause(clause: string, selector: string) {
    const parent = await findOnlyElement(this.driver, this.t, clause);
    // hovering mouse over remove button to make conjunct/disjunct addition visible
    const removeButton = await findOnlyChild(
      this.driver, this.t, parent, '.QueryBuilder--removeConjunctButton'
    );
    const button = await findOnlyChild(this.driver, this.t, parent, selector);
    await this.hoverAndClick(removeButton, button);
  }

  /**
   * Add "or" (disjunctive) clause
   * @param clause parent clause id
   */
  addOrClause(clause: string) {
    return this.addClause(clause, '.QueryBuilder--addDisjunctButton');
  }

  /**
   * Add "and" (conjunctive) clause
   * @param clause parent clause id
   */
  addAndClause(clause: string) {
    return this.addClause(clause, '.QueryBuilder--addConjunctButton');
  }

  private async findSet(nameOfSet: string) {
    await waitElement(this.driver, '.set-management__set-caption span > span');
    await wait(500);
    const items = await asyncQ.filterSeries(
      await this.driver.findElements(By.css('.set-management__set-caption span > span')),
      async (element: WebElement) => await getText(element) === nameOfSet
    );
    await this.t.ok(items.length === 1, `only one set in clipboard with name "${nameOfSet}" (got ${items.length})`);
    return items[0];
  }

  /**
   * Type into the range field (if search)
   * @param value text to write
   */
  async typeRange(value: string) {
    const input = await findOnlyElement(this.driver, this.t, '.QueryBuilder--searchBasedTermSelector input');
    await input.sendKeys(value);
  }

  /**
   * Type into the range text search and click 'Find Text'
   * @param value text to write
   */
  async typeTextRange(value: string) {
    const input = await findOnlyElement(this.driver, this.t, '.TextSelection--inputGroup input');
    await input.sendKeys(value);
    const button = await findOnlyElement(this.driver, this.t, '.btn-primary');
    await button.click();
  }


  /**
   * Fill range with a set
   */
  async fillRangeFromSet(nameOfSet: string) {
    const setSpan = await this.findSet(nameOfSet);
    const draggable = await this.driver.executeScript(`return arguments[0].parentNode.parentNode.parentNode.parentNode.parentNode;`, setSpan) as WebElement;
    let droppables = [];
    droppables = await this.driver.findElements(By.css('.SemanticTreeInput--holder.QueryBuilder--hierarchySelector')) as WebElement[];
    if (droppables.length === 0) {
      droppables = await this.driver.findElements(By.css('.QueryBuilder--resourceSelector')) as WebElement[];
    }
    this.t.ok(droppables.length === 1, 'there should be an item to drop onto');
    const droppable = droppables[0];
    await debugElement(draggable, 'set');
    await debugElement(droppable, 'input');
    const storeId = await this.driver.executeAsyncScript(htmlDnD.dragCode, draggable) as number;
    await wait(1000);
    await this.driver.executeScript(htmlDnD.dropCode, storeId, droppable);
  }

  /**
   * Select from one of the options in list dropdown
   * @param value text of the option
   */
  async selectRange(value: string) {
    await waitElement(this.driver, '.QueryBuilder--searchBasedTermSelector .Select-option');
    const element = await findOnlyElement(this.driver, this.t, `.QueryBuilder--searchBasedTermSelector .Select-option span[title="${value}"]`);
    await element.click();
  }

  /**
   * Toggle the node in dropdown tree
   * @param value text on the node
   */
  async toggleRangeNode(value: string) {
    await waitElement(this.driver, '.LazyTreeSelector--itemExpanded > div > span, .LazyTreeSelector--itemCollapsed > div > span');
    const items = await this.driver.executeScript(`
      return (function (value) {
        return Array.prototype.slice.call(
          document.querySelectorAll(
            '.LazyTreeSelector--itemExpanded > div > span, .LazyTreeSelector--itemCollapsed > div > span'
          )
        ).filter(function (element) {
          return element.textContent === value;
        });
      })(arguments[0]);
    `, value) as WebElement[];
    const checkboxes = await this.driver.executeScript(`
      return Array.prototype.slice.call(
        arguments[0].parentNode.parentNode.children
      ).filter(x => x.tagName.toLowerCase() === 'input');
    `, items[0]) as WebElement[];
    await scrollIntoElement(this.driver, checkboxes[0]);
    await checkboxes[0].click();
  }

  /**
   * Close dropdown tree
   */
  async submitRangeTree() {
    const buttons = await asyncQ.filterSeries(
      await this.driver.findElements(By.css('.SemanticTreeInput--dropdownButton')),
      async (element: WebElement) => await getText(element) === 'Select'
    );
    await this.t.ok(buttons.length === 1, `only one Select button (got ${buttons.length})`);
    await buttons[0].click();
  }

  /**
   * Get search results from "Table" view. Scan all pages.
   */
  async getSearchResults() {
    const numResults = await this.getNumResults();
    await waitElement(this.driver, '#search-results .nav.nav-tabs li');
    await this.switchResultMode('Table');
    await waitLoaders(this.driver);
    const results = [];
    results.push(await this.getSearchResultsPage());
    const limit = numResults === null ? 100 : Math.ceil(numResults / 10) - 1;
    if (limit !== 0) {
      const button = await this.findNextPageBtn();
      await scrollIntoElement(this.driver, button);
    }
    for (let i = 0; i < limit; ++i) {
      const button = await this.findNextPageBtn();
      const btnClass = await button.getAttribute('class');
      if (btnClass === 'disabled') {
        break;
      }
      const buttonInner = await findOnlyChild(this.driver, this.t, button, 'a');
      await buttonInner.click();
      results.push(await this.getSearchResultsPage());
    }
    const output = _.flatten(results).sort();
    await this.t.equal(numResults, output.length, `correct number of results`);
    return output;
  }

  /**
   * Sanity check: number of results must be as shown
   */
  public async getNumResults() {
    await wait(500); // wait to make sure that we don't check old results
    await waitLoaders(this.driver);
    await waitElement(this.driver, '.num-results');
    const element = await findOnlyElement(this.driver, this.t, '.num-results');
    if (!element) {
      return null;
    }
    const text = await getText(element);
    if (text === null) {
      return null;
    }
    return parseInt(text, 10);
  }

  /**
   * Switch mode in which search results are displayed
   * @param mode text on the tab that enables the mode
   */
  private async switchResultMode(mode: string) {
    const tabs = await this.driver.findElements(By.css('#search-results .nav.nav-tabs li'));
    const tableTabs = await asyncQ.filterSeries(tabs, async (tab: WebElement) => await getText(tab) === mode);
    await this.t.ok(tableTabs.length === 1, `only one ${mode} tab (got ${tableTabs.length})`);
    const tableTab = tableTabs[0];
    await scrollIntoElement(this.driver, tableTab);
    await tableTab.click();
    await wait(200);
  }

  /**
   * Find a button that goes to next page in paginator
   */
  private async findNextPageBtn() {
    await waitElement(this.driver, '.pagination li a span');
    const pageNavs = await asyncQ.filterSeries(
      await this.driver.findElements(By.css('.pagination li a span')),
      async (nav: WebElement) => await getText(nav) === '»'
    );
    const result = await this.driver.executeScript(`return arguments[0].parentNode.parentNode;`, pageNavs[0]) as WebElement;
    return result;
  }

  /**
   * Ge one page of search results
   */
  private async getSearchResultsPage() {
    await waitElement(this.driver, '#search-results a[href^="/resource/"]');
    await wait(300);
    const elements = await this.driver.findElements(By.css('#search-results a[href^="/resource/"]'));
    const hrefs = await this.driver.executeScript(`
      return Array.prototype.slice.call(arguments[0]).map(function (element) {
        return element.getAttribute('href');
      });
    `, elements) as string[];
    const uris = hrefs.map(href => {
      const url = Url.parse(href);
      if (url.query) {
        return `<${QueryString.parse(url.query)['uri']}>`;
      } else if (url.path) {
        const path = url.path.split('/');
        return decodeURIComponent(path[path.length - 1]);
      } else {
        this.t.ok(false, `result url is parseable`);
      }
    });
    return uris;
  }

  /**
   * Remove "and" (conjunctive) clause
   */
  async removeConjunct(text: string) {
    await this.removeClause(text);
    const buttons = await asyncQ.filterSeries(
      await this.driver.findElements(By.css('.QueryBuilder--removeConjunctButton')),
      async (button: WebElement) => await getText(button) === 'cancel'
    );
    await this.t.ok(buttons.length === 1, `only one button to cancel conjunction edit (got ${buttons.length})`);
    await buttons[0].click();
  }

  /**
   * Remove any part of any clause by name
   * @param text text on the part; must be unique
   */
  private async removeClause(text: string) {
    const clause = await this.findClause(text);
    const button = await findOnlyChild(this.driver, this.t, clause, '.QueryBuilder--editButton');
    await this.driver.actions().mouseMove(button).perform();
    await button.click();
  }

  /**
   * Find search clause by its text (disregarding the type)
   * @param text text on the part; must be unique
   */
  private async findClause(text: string) {
    const elements = await this.driver.findElements(By.css('.QueryBuilder--itemHolder'));
    const clauses = await asyncQ.filterSeries(elements, async (element: WebElement) => {
      return await getText(element) === text;
    });
    await this.t.ok(clauses.length === 1, `only one clause with such text`);
    return clauses[0];
  }

  /**
   * Start nested search
   */
  async startNestedSearch() {
    const button = await findOnlyElement(this.driver, this.t, '.QueryBuilder--nestedSearchButton');
    await button.click();
  }

  /**
   * Show filter facet
   */
  async showFacet() {
    const button = await findOnlyElement(this.driver, this.t, '.show-facet-button');
    await button.click();
    await waitElement(this.driver, '.facet');

    // make sure that the relations has been rendered
    await this.waitFacetUpdated();
  }

  /**
   * Filter nodes by text on them, counts ignored
   * @param list array of elements
   * @param name text to find
   */
  private async filterByName(list: WebElement[], name: string) {
    return await asyncQ.filterSeries(
      list,
      async (item: WebElement) => {
        const text = await getText(item);
        const matches = text.match(/^(.*) \([0-9]+\)$/);
        return matches != null && matches[1] === name;
      }
    );
  }

  /**
   * Filter relations by name
   * @param list array of elements
   * @param name text to find
   */
  private async filterRelationsByName(list: WebElement[], name: string) {
    return await asyncQ.filterSeries(
      list,
      async (item: WebElement) => {
        const text = await getText(item);
        return text === name;
      }
    );
  }

  /**
   * Choose relation in search facet
   * @param name relation name
   * @return relation parent element
   */
  async openFacetRelation(name: string) {
    const relations = await this.filterRelationsByName(
      await this.driver.findElements(By.css('.facet-relation__content')),
      name
    );
    await this.t.ok(relations.length === 1, `only one "${name}" relation (got ${relations.length})`);
    const relation = await this.driver.executeScript(`return arguments[0].parentNode.parentNode;`, relations[0]) as WebElement;
    const icon = await relation.findElements(By.css('.facet__relation__header__icon'));
    if (icon.length === 1) {
      await scrollIntoElement(this.driver, relation);
      await relation.click();
      await waitChildElement(relation, '.facet__relation__body');
    }
    return await this.driver.executeScript(`return arguments[0].parentNode;`, relation) as WebElement;
  }

  /**
   * Find checkbox inside of relation accordion in search facet
   * @param relation element that contains relation accordion
   * @param name text on checkbox
   */
  async clickFacetCheckbox(relation: WebElement, name: string) {
    const input = await findOnlyChild(this.driver, this.t, relation, '.facet__relation__values__filter input');
    await input.clear();
    await input.sendKeys(name);
    await waitElement(this.driver, '.facet__relation__values__value.checkbox');
    const checkboxes = await this.filterByName(
      await relation.findElements(By.css('.facet__relation__values__value.checkbox')),
      name
    );
    await this.t.ok(
      checkboxes.length === 1, `only one "${name}" checkbox (got ${checkboxes.length})`
    );
    await scrollIntoElement(this.driver, checkboxes[0]);
    await checkboxes[0].click();

    // make sure that the relations has been updated
    await this.waitFacetUpdated();
  }

  async setFacetYearRange(relation: WebElement, from: string, upto: string) {
    const elements = await relation.findElements(By.css('.YearInput--holder'));
    await this.t.ok(elements.length === 2, `date range has two inputs`);
    await this.setFacetYearByElement(elements[0], from);
    await this.setFacetYearByElement(elements[1], upto);
  }

  async setFacetYearByElement(element: WebElement, value: string) {
    await this.setYearByElement(this.t, element, value);
    await this.waitFacetUpdated();
  }

  async waitFacetUpdated() {
    await waitElementRemoved(this.driver, '.facet .system-spinner');
  }

  async saveSet(nameOfSet: string) {
    await clickButtonByCaption(this.driver, this.t, 'Save As Set');
    const input =
      await findOnlyElement(this.driver, this.t, '.save-as-dataset-modal__form__collection-name');
    await input.sendKeys(nameOfSet);
    const submit =
      await findOnlyElement(this.driver, this.t, '.save-as-dataset-modal__form__save-button');
    await submit.click();
    await waitElement(this.driver, '.set-management__set');
  }

  async deleteSet(nameOfSet: string) {
    const setSpan = await this.findSet(nameOfSet);
    const parent = await this.driver.executeScript(
      `return arguments[0].parentNode.parentNode.parentNode;`, setSpan
    ) as WebElement;
    const button = await findOnlyChild(this.driver, this.t, parent, 'button');
    await this.hoverAndClick(setSpan, button);
    const links = await asyncQ.filterSeries(
      await parent.findElements(By.css('a')),
      async (element: WebElement) => await getText(element) === 'Remove set'
    );
    this.t.ok(links.length === 1, `only one link to remove set (got ${links.length})`);
    await links[0].click();
    const yesButtons = await asyncQ.filterSeries(
      await parent.findElements(By.css('.btn-toolbar > button')),
      async (element: WebElement) => await getText(element) === 'yes'
    );
    this.t.ok(yesButtons.length === 1, `only one yes button (got ${yesButtons.length})`);
    const yesButton = yesButtons[0];
    await yesButton.click();
    await waitElementRemoved(this.driver, '.dropdown.open.btn-group.btn-group-link');
  }
}

export async function readData(file: string) {
  return JSON.parse(
    await readFile(file, {encoding: 'utf8'})
  );
}


/**
 * Setup search
 */
export function testSearch(
  driver: WebDriver,
  t: Test,
  searchUrl: string
) {
  return async function(f: (arg: Search) => Promise<any>): Promise<any> {
    const s = new Search(driver, t);
    await s.startSearch(searchUrl);
    await f(s);
  };
}
