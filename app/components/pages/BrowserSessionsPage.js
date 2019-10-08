// @flow
import React, { Component } from 'react';

type Props = {};

export default class BrowserSessionsPage extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.newBrowser = this.newBrowser.bind(this);
  }

  newBrowser() {
    global.backendConn.send('BrowsersController', 'create', {});
  }

  render() {
    return (
      <div className="hello">
        Browser Sessions!
        <br />
        <a onClick={() => this.newBrowser()}>Open a new browser</a>
      </div>
    );
  }
}
