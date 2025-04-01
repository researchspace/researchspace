
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

    // Find the query input and determine input type
    let inputType = "text";
    if (formData.query) {
      // Trim whitespace and update the query value
      formData.query = formData.query.trim();
      
      // Check if it starts with http
      if (formData.query.startsWith('http')) {
        inputType = "imageUrl";
      }
    }

    trigger({
      eventType: "FormWithEvent.Submit",
      source: this.props.id,
      data: {
        queryParams: formData,
        inputType: inputType, // Add the input type to the data
      },
    });
  }
}

export default FormWithEventTrigger;
