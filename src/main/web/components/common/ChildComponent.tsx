import * as React from 'react';
import { List } from 'immutable';
import { SharedStateContext } from '../common/SuperStateComponent';

interface ChildComponentProps {
  id: string;
  sharedstates: List<string>;
}

class ChildComponent extends React.Component<ChildComponentProps> {
  static contextType = SharedStateContext;

  componentDidMount() {
    this.context.registerSharedStates(this.props.id, this.props.sharedstates);
  }

  render() {
    const sharedStates = this.props.sharedstates;
    const componentSharedStates = this.context.sharedStates[this.props.id] || {};
    return (
      <div>
        {sharedStates.map((stateKey: string) => (
          <input
            key={stateKey}
            value={componentSharedStates[stateKey] || ''}
            onChange={(e) => this.context.updateSharedState(this.props.id, stateKey, e.target.value)}
          />
        ))}
      </div>
    );
  }
}

export default ChildComponent;
