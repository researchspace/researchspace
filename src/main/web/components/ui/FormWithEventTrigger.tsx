
import * as React from 'react';

import { Component } from 'platform/api/components';
import { trigger } from 'platform/api/events';

export interface Props {
  id: string;
}

export class FormWithEventTrigger extends Component<any, any> {
  render() {
    return (
      <form onSubmit={this.onSubmit}>
        {this.props.children}
      </form>
    );
  }

  onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData =
      Array.from(form.elements as HTMLFormControlsCollection)
        .filter((element: any) => element.name)
        .reduce((acc: any, element: any) => ({
          ...acc,
          [element.name]: element.value
        }), {});

    trigger({
      eventType: "FormWithEvent.Submit",
      source: this.props.id,
      data: formData,
    });
  }
}

export default FormWithEventTrigger;
