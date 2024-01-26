import { trigger } from 'platform/api/events/EventsStore';
import * as React from 'react';
import { Tabs } from 'react-bootstrap';
import * as TabsEvents from './TabEvents';
import {localeStorageTabs} from './LocalStorageTab'

interface Props {
  id: string;
  defaultActiveKey?: string | number;
}

export class RsTabs extends React.Component<Props, {key: any}> {

  constructor(props, context) {
    super(props, context);
      this.state = {
        key: props.defaultActiveKey || props.children[0].props.eventKey
      };
  }

  componentDidMount() {
    const { defaultTabKey, sourceId } = localeStorageTabs.getValues()
    if(defaultTabKey && this.props.id === sourceId) {
      this.setState({key: defaultTabKey})
      localeStorageTabs.removeKey()
    }
  }

  private onTabSelected = (key: any) => {
    trigger({
      source: this.props.id,
      eventType: TabsEvents.TabSelected,
      data: { key, source: this.props.id },
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