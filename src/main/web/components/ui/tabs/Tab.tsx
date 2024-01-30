import * as React from 'react';
import { Tab } from 'react-bootstrap';

interface Props {
  title: string;
  eventKey: number;
}

export class RsTab extends React.Component<Props, {}> {
  render() {
    const { title, eventKey, children } = this.props;
    const tab = (
      <Tab title={title} eventKey={eventKey}>
        {children}
      </Tab>
    );
    return tab;
  }
}

export default RsTab