/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as _ from 'lodash';
import { ButtonGroup } from 'react-bootstrap';

import { ArgumentsContext, ArgumentsContextTypes, AssertedBelief, SimpleBeliefValue } from './ArgumentsApi';

import * as styles from './Belief.scss';

export interface BeliefProps {
  forValue: string;
  isCanonical: boolean;
}

interface State {
  belief: AssertedBelief;
}

export class Belief extends React.Component<BeliefProps, State> {
  static contextTypes = ArgumentsContextTypes;
  context: ArgumentsContext;

  constructor(props: BeliefProps, context: ArgumentsContext) {
    super(props, context);
    this.state = {
      belief: context.getBeliefValue(props.forValue, props.isCanonical),
    };
  }

  componentWillReceiveProps(nextProps: BeliefProps, context: ArgumentsContext) {
    const { forValue, isCanonical } = this.props;
    if (forValue !== nextProps.forValue || isCanonical !== nextProps.isCanonical) {
      this.setState({
        belief: context.getBeliefValue(nextProps.forValue, nextProps.isCanonical),
      });
    }
  }

  componentDidUpdate(prevProps: BeliefProps, prevState: State) {
    const { belief } = this.state;
    if (belief !== prevState.belief) {
      this.context.changeBelief(belief);
    }
  }

  render() {
    const { belief } = this.state;
    const id = `belief-selection-${belief.targetValue}`;
    return (
      <ButtonGroup bsSize="xs">
        <label className={`btn btn-default ${styles.radioButton} ${styles.agree}`}>
          <input
            type="radio"
            name={id}
            value={SimpleBeliefValue.Agree}
            defaultChecked={belief.belief.value === SimpleBeliefValue.Agree}
            onChange={this.onBeliefChange}
          />
          <span>YES</span>
        </label>
        <label className={`btn btn-default ${styles.radioButton} ${styles.disagree}`}>
          <input
            type="radio"
            name={id}
            value={SimpleBeliefValue.Disagree}
            defaultChecked={belief.belief.value === SimpleBeliefValue.Disagree}
            onChange={this.onBeliefChange}
          />
          <span>NO</span>
        </label>
      </ButtonGroup>
    );
  }

  private onBeliefChange = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value as SimpleBeliefValue;
    this.setState(
      (prevState: State): State => {
        const newBelief = _.clone(prevState.belief);
        newBelief.belief.value = value;
        return { belief: newBelief };
      }
    );
  };
}

export default Belief;
