"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const selenium_webdriver_1 = require("selenium-webdriver");
const asyncQ = require("async-q");
const _ = require("lodash");
function debugElement(element, mark = "") {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const driver = element.getDriver();
        yield driver.executeScript(`
    console.log(arguments[0], arguments[1]);
  `, mark, element);
    });
}
exports.debugElement = debugElement;
function sameSets(t, set1, set2) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield t.same(set1.sort(), set2.sort());
    });
}
exports.sameSets = sameSets;
exports.wait = (time) => new Promise((resolve, reject) => setTimeout(resolve, time));
function waitPageLoad(driver) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        for (;;) {
            const result = yield driver.executeScript('return document.readyState');
            if (result == "complete")
                break;
            yield exports.wait(100);
        }
    });
}
exports.waitPageLoad = waitPageLoad;
function findOnlyElement(driver, t, selector) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const elements = yield driver.findElements(selenium_webdriver_1.By.css(selector));
        yield t.ok(elements.length == 1, `only one element of ${selector} type (got ${elements.length})`);
        return elements[0];
    });
}
exports.findOnlyElement = findOnlyElement;
function findOnlyChild(driver, t, parent, selector) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const elements = yield parent.findElements(selenium_webdriver_1.By.css(selector));
        yield t.ok(elements.length == 1, `only one child element of ${selector} type (got ${elements.length})`);
        return elements[0];
    });
}
exports.findOnlyChild = findOnlyChild;
function setInputValueByName(driver, t, name, value) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const input = yield findOnlyElement(driver, t, `input[name=${name}]`);
        return yield input.sendKeys(value);
    });
}
exports.setInputValueByName = setInputValueByName;
function setInputValueBySelector(driver, t, selector, value) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const input = yield findOnlyElement(driver, t, selector);
        return yield input.sendKeys(value);
    });
}
exports.setInputValueBySelector = setInputValueBySelector;
function submit(driver, t) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const button = yield findOnlyElement(driver, t, 'input[type=submit]');
        yield button.click();
    });
}
exports.submit = submit;
function get(driver, url) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield driver.get(url);
        yield waitPageLoad(driver);
    });
}
exports.get = get;
function waitElement(driver, selector) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(selector)), 30000);
    });
}
exports.waitElement = waitElement;
function waitChildElement(parent, selector) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield awaitFor(parent.getDriver(), () => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield parent.findElements(selenium_webdriver_1.By.css(selector))).length == 0; }));
    });
}
exports.waitChildElement = waitChildElement;
function waitElementRemoved(driver, selector) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield awaitFor(driver, () => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield driver.findElements(selenium_webdriver_1.By.css(selector))).length == 0; }));
    });
}
exports.waitElementRemoved = waitElementRemoved;
function awaitFor(driver, condition) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield driver.wait(new selenium_webdriver_1.Condition('for element to be located <element>', condition), 30000);
    });
}
exports.awaitFor = awaitFor;
function setSelectValue(driver, t, element, value) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield element.sendKeys(value);
    });
}
exports.setSelectValue = setSelectValue;
function authorize(driver, t, url, username, password) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield get(driver, url);
        yield setInputValueByName(driver, t, 'username', username);
        yield setInputValueByName(driver, t, 'password', password);
        yield submit(driver, t);
    });
}
exports.authorize = authorize;
function waitLoaders(driver) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield waitElementRemoved(driver, '.system-spinner');
    });
}
exports.waitLoaders = waitLoaders;
function clickButtonByCaption(driver, t, caption) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const items = yield asyncQ.filterSeries(yield driver.findElements(selenium_webdriver_1.By.css('button')), (element) => tslib_1.__awaiter(this, void 0, void 0, function* () { return (yield element.getText()) == caption; }));
        t.ok(items.length == 1, `only one button with "${caption}" text (got ${items.length})`);
        yield scrollIntoElement(driver, items[0]);
        yield items[0].click();
    });
}
exports.clickButtonByCaption = clickButtonByCaption;
function getText(element) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const text = yield element.getText();
        return _.trim(text);
    });
}
exports.getText = getText;
function scrollIntoElement(driver, element) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield driver.executeScript('arguments[0].scrollIntoView(false)', element);
        yield exports.wait(200);
    });
}
exports.scrollIntoElement = scrollIntoElement;
//# sourceMappingURL=util.js.map