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
import * as React from 'react';
import { Alert, Row, Col } from 'react-bootstrap';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';

import { getRepositoryConfigTemplates } from 'platform/api/services/repository';
import { RepositoryConfigEditor } from './RepositoryConfigEditor';

import * as styles from './RepositoryConfigInitializer.scss';

interface State {
  readonly loadingError?: any;
  readonly repositoryTemplates?: string[];
}

export class RepositoryConfigInitializer extends Component<{}, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.cancellation.map(getRepositoryConfigTemplates()).observe({
      value: (repositoryTemplates) =>
        this.setState({
          repositoryTemplates,
        }),
      error: (loadingError) => this.setState({ loadingError }),
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { loadingError, repositoryTemplates } = this.state;

    if (loadingError) {
      return <Alert bsStyle="info"> {loadingError} </Alert>;
    }
    return (
      <div data-flex-layout="row top-center">
        <div className={styles.editorArea}>
          <h2>Please configure the default repository</h2>
          <p>
            There is no configuration for the default repository in the system. Please set the configuration of the
            repository you would like to use as the system default, then validate the connection and confirm with Update
            Config. The configuration has to be expressed in the RDF Turtle format. You can select a template for some
            of the commonly used repository types.
          </p>
          <Row>
            <Col sm={2}>
              <b>neptune</b>
              <p>For use with Amazon Neptune.</p>
            </Col>
            <Col sm={2}>
              <b>stardog</b>
              <p>For use with a Stardog repository</p>
            </Col>
            <Col sm={3}>
              <b>sparql</b>
              <p>
                Use with any SPARQL 1.1 compliant database endpoint where authentication is not required, e.g.
                Blazegraph, RDF4J
              </p>
            </Col>
            <Col sm={3}>
              <b>sparql-basic</b>
              <p>Same as "sparql", but includes basic authentication. Can be used for GraphDB amongst others.</p>
            </Col>
          </Row>
          <Alert bsStyle="info">
            In the template, please replace all placeholders marked with {'{'}% and %{'} '}
            with your actual values.
          </Alert>
          {
            <RepositoryConfigEditor
              id="default"
              repositoryTemplates={repositoryTemplates}
              showRestartPrompt={true}
              reloadPageOnSuccess={true}
              initializerMode={true}
              preselectedTemplate="sparql"
            />
          }
        </div>
      </div>
    );
  }
}

export default RepositoryConfigInitializer;
