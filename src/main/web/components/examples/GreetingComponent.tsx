import * as React from 'react';
import {Component} from 'platform/api/components';

interface GreetingComponentProps {
  name: string
}

interface GreetingComponentState {
  addition: string
}

export class GreetingComponent extends Component<GreetingComponentProps, GreetingComponentState> {
  constructor(props: GreetingComponentProps, context: any) {
    super(props, context);
    this.state = {
      addition: ''
    };
    this.onAdditionChange = this.onAdditionChange.bind(this);
  }

  render() {
    return <div>
      <div>Hello {this.props.name}! {this.state.addition}</div>
      <input type="text" onChange={this.onAdditionChange} />
    </div>;
  }

  private onAdditionChange(event) {
    this.setState({
      addition: event.target.value,
    });
  }
}

// register GreetingComponent as the default export for this source file
export default GreetingComponent;