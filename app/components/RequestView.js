import React, { Component } from 'react';
import { Tab, TabList, Tabs, TabPanel } from 'react-tabs';
import RequestTab from './RequestView/RequestTab';
import ResponseTab from './RequestView/ResponseTab';
import BodyTab from './RequestView/BodyTab';
import CookiesTab from './RequestView/CookiesTab';

type Props = {
  selectedRequestId: 'number',
  panelHeight: 'number',
  draggingPane: 'boolean',
  codeMirrorWidth: 'number',
  tabIndex: 'number',
  setRequestViewTabIndex: 'function'
};

export default class RequestView extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = { request: {}, tabIndex: 0 };
    this.loadRequest();
  }

  componentDidMount() {
    this.loadRequest();
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.draggingPane === true) {
      return false;
    }

    return true;
  }

  componentDidUpdate(previousProps) {
    if (this.props.selectedRequestId !== previousProps.selectedRequestId) {
      this.loadRequest();
    }
  }

  async loadRequest() {
    if (this.props === undefined || this.props.selectedRequestId === undefined)
      return;

    const id = this.props.selectedRequestId;
    const response = await global.backendConn.send(
      'RequestsController',
      `show`,
      { id: id }
    );
    const request = response.result.body;

    if (request !== undefined && request.id !== this.state.request.id) {
      const newState = Object.assign({}, this.state);
      newState.request = request;
      this.setState(newState);
    }
  }

  render() {
    const request = this.state.request;

    return (
      <div className="pane-remaining pane-container-vertical ">
        <div className="pane-fixed">
          <Tabs
            className="theme--pane__body react-tabs"
            selectedIndex={this.props.tabIndex}
            onSelect={tabIndex => this.props.setRequestViewTabIndex(tabIndex)}
          >
            <TabList>
              <Tab>
                <button type="button">Request</button>
              </Tab>

              <Tab>
                <button type="button">Response</button>
              </Tab>

              <Tab>
                <button type="button">Body</button>
              </Tab>

              <Tab>
                <button type="button">Cookies</button>
              </Tab>
            </TabList>

            {/* Stupid Hack to avoid a warning from react-tabs: */}
            <TabPanel />
            <TabPanel />
            <TabPanel />
            <TabPanel />
          </Tabs>
        </div>

        {this.props.tabIndex === 0 && (
          <div className="pane-remaining">
            <RequestTab height={this.props.panelHeight} request={request} />
          </div>
        )}
        {this.props.tabIndex === 1 && (
          <div className="pane-remaining">
            <ResponseTab height={this.props.panelHeight} request={request} />
          </div>
        )}
        {this.props.tabIndex === 2 && (
          <BodyTab
            request={request}
            codeMirrorWidth={this.props.codeMirrorWidth}
          />
        )}
        {this.props.tabIndex === 3 && (
          <div className="pane-remaining">
            <CookiesTab request={request} />
          </div>
        )}
      </div>
    );
  }
}
