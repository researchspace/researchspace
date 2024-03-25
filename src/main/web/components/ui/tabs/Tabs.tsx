import { trigger } from 'platform/api/events/EventsStore';
import * as React from 'react';
import { Tabs } from 'react-bootstrap';
import * as TabsEvents from './TabEvents';
import {localeStorageTabs} from './LocalStorageTab'

interface Props {
  id: string;
  defaultActiveKey?: string | number;
  className?: string;
}

export class RsTabs extends React.Component<Props, {key: any}> {

  constructor(props, context) {
    super(props, context);
    let firstChildrenPropEventKey = null
      if (Array.isArray(props.children)) {
      firstChildrenPropEventKey = props.children[0]?.props?.eventKey
    } else {
      firstChildrenPropEventKey = props.children?.props?.eventKey
    }
      this.state = {
        key: props.defaultActiveKey || firstChildrenPropEventKey
      };
  }

  componentDidMount() {
    const defaultTabKey = localeStorageTabs.getTabKeyBySource(this.props.id)
    if (defaultTabKey) {
      this.setState({key: defaultTabKey})
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
    const { id, defaultActiveKey, className,children } = this.props;
    const tabs = (
      <Tabs className={className} activeKey={this.state.key} defaultActiveKey={defaultActiveKey} id={id} onSelect={this.onTabSelected}>{children}</Tabs>
    );
    return tabs;
  }
}

export default RsTabs