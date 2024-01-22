import { trigger } from 'platform/api/events/EventsStore';
import * as React from 'react';
import { Tabs } from 'react-bootstrap';
import * as TabsEvents from './TabEvents';
import { Cancellation } from 'platform/api/async/Cancellation';
import { BrowserPersistence } from 'platform/components/utils';

interface Props {
  id: string;
  defaultActiveKey?: string;
}



export class RsTabs extends React.Component<Props, {key: any}> {

  private readonly cancellation = new Cancellation();
  private LocalStorageState = BrowserPersistence.adapter<{
    readonly sourceId?: string;
    readonly defaultTabKey?: any;
  }>();

  constructor(props, context) {
    super(props, context);
    this.state = {
      key: props.key ?? 1
    };
  }

  componentDidMount() {
    const { defaultTabKey, sourceId } = this.LocalStorageState.get('form-default-key')
    if(defaultTabKey && this.props.id === sourceId) {
      this.setState({key: defaultTabKey})
      this.LocalStorageState.remove('form-default-key')
    }
    
    
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onTabSelected = (key: any) => {
    trigger({
      source: this.props.id,
      eventType: TabsEvents.TabSelected,
      data: { key },
    });
    this.setState({key})
  }

  render() {
    const { id, defaultActiveKey, children } = this.props;
    const tabs = (
      <Tabs activeKey={this.state.key} defaultActiveKey={defaultActiveKey} id={id} onSelect={this.onTabSelected}>{children}</Tabs>
    );
    return tabs;
  }
}

export default RsTabs