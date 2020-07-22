/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { initModuleRegistry } from '../bootstrap';
initModuleRegistry();

import * as Kefir from 'kefir';
import * as ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { Component, createElement } from 'react';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { DefaultRepositoryInfo } from 'platform/api/services/repository';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getRegisteredPrefixes } from 'platform/api/services/namespace';
import PageViewer from '../page/PageViewer';
import * as D from 'react-dom-factories';

import { init as initNavigation, __unsafe__setCurrentResource } from 'platform/api/navigation';
import { init as initBaseUrl } from 'platform/api/http';
import { renderNotificationSystem, registerNotificationSystem } from 'platform/components/ui/notification';
import { renderOverlaySystem, registerOverlaySystem } from 'platform/components/ui/overlay';

/*
 * Example for using
 *
 * @example
 * <html lang="en">
 *  <head>
 *    <meta name="version" content="{{version}}" />
 *    <meta name="viewport" content="width=device-width, initial-scale=1">
 *    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
 *    <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1" />
 *    {{{html-head}}}
 *    <script defer type='text/javascript' src='{{assetsMap.vendor}}'></script>
 *    <script defer type='text/javascript'
 *      src='http://localhost:3000/assets/page-renderer-bundle.js'>
 *    </script>
 *  </head>
 *  <body>
 *    <div id="application"></div>
 *    <script>
 *      addEventListener('DOMContentLoaded', () => {
 *        researchspace.init();
 *        var app = document.getElementById('application');
 *        researchspace.render('http://www.researchspace.org/resource/assets/OntodiaView', {}, app);
 *      });
 *    </script>
 *  </body>
 *  </html>
 */

export class SubsystemContainer extends Component<{}, {}> {
  constructor(props: {}, context: any) {
    super(props, context);
  }

  componentDidMount() {
    registerNotificationSystem(this);
    registerOverlaySystem(this);
  }

  render() {
    return D.div({}, renderNotificationSystem(), renderOverlaySystem());
  }
}

function initPlatform(baseUrl?: string) {
  initBaseUrl(baseUrl);
  return Kefir.combine({
    url: initNavigation(),
    prefixes: getRegisteredPrefixes(),
    rawConfig: ConfigHolder.fetchConfig(),
    repositories: DefaultRepositoryInfo.init(),
    subsystem: initSubsystems(),
  })
    .flatMap(({ url, prefixes, rawConfig }) => {
      try {
        SparqlUtil.init(prefixes);
        ConfigHolder.initializeConfig(rawConfig);
      } catch (e) {
        return Kefir.constantError<any>(e);
      }
      return Kefir.constant(url);
    })
    .onValue(() => {
      console.log('ResearchSpace platform has been initialized successfully!');
    });
}

function initSubsystems() {
  const element = document.createElement('div');
  return Kefir.stream<SubsystemContainer>((emitter) => {
    const ref = (instance) => {
      if (instance) {
        emitter.emit(instance);
        emitter.end();
      }
    };
    ReactDOM.render(createElement(SubsystemContainer, { ref }), document.body.appendChild(element));
  }).toProperty();
}

let platform = null;
declare var __webpack_public_path__;

window['researchspace'] = {
  init: function (baseUrl?: string) {
    if (baseUrl) {
      __webpack_public_path__ = baseUrl + '/assets/';
    }
    platform = initPlatform(baseUrl);
  },
  render: function (pageIri: string, params: {}, htmlElement: HTMLElement) {
    platform.onValue(() => {
      const resource = Rdf.iri(pageIri);
      __unsafe__setCurrentResource(resource);
      render(
        PageViewer({
          iri: resource,
          context: resource,
          params: params,
          noBackdrop: true,
        }),
        htmlElement
      );
    });
  },
};
