TAP: http://www.node-tap.org/
Selenium: http://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/
Browserstack: https://www.browserstack.com/automate

## Prerequisites
1) `yarn` for dependencies management
2) chrome webdriver for local testing - https://sites.google.com/a/chromium.org/chromedriver/downloads

## Setup
Run `yarn` in the `integration-tests` folder.

## Running Tests

To run on browserstack:
```
BROWSERSTACK_USERNAME=username BROWSERSTACK_ACCESS_KEY=accesskey RS_DEVELOP_USERNAME=deployment_user_name RS_DEVELOP_PASSWORD=deployment_user_password ./node_modules/.bin/ts-node index.ts jenkins
```

To run on locally:
```
RS_DEVELOP_USERNAME=deployment_user_name RS_DEVELOP_PASSWORD=deployment_user_password ./node_modules/.bin/ts-node index.ts development-local|local
```

## Configuration
see `config/machines.ts` file for browser/environment configuration options
