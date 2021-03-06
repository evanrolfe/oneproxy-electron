import React, { Component } from 'react';
import classnames from 'classnames';
import KeydownBinder from '../KeydownBinder';

import { hotKeyRefs } from '../../utils/hotkeys';
import { pressedHotKey } from '../../utils/hotkeys-listener';

// Keep global z-index reference so that every modal will
// appear over top of an existing one.
let globalZIndex = 1000;

type Props = {
  wide: 'boolean',
  thin: 'boolean',
  noEscape: 'boolean',
  dontFocus: 'boolean',
  closeOnKeyCodes: 'array',
  onHide: 'function',
  onShow: 'function',
  onCancel: 'function',
  onKeyDown: 'function',
  freshState: 'boolean',
  children: 'object',
  className: 'string'
};

class Modal extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);

    this.state = {
      open: false,
      forceRefreshCounter: 0,
      zIndex: globalZIndex
    };

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleClick = this._handleClick.bind(this);
    this._setModalRef = this._setModalRef.bind(this);
    this.show = this.show.bind(this);
    this.toggle = this.toggle.bind(this);
    this.isOpen = this.isOpen.bind(this);
    this.hide = this.hide.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.open === false &&
      this.state.open === true &&
      this.props.onShow
    ) {
      this.props.onShow();
    }
  }

  async _handleKeyDown(e) {
    if (!this.state.open) {
      return;
    }

    if (this.props.onKeyDown) {
      this.props.onKeyDown(e);
    }

    // Don't check for close keys if we don't want them
    if (this.props.noEscape) {
      return;
    }

    const closeOnKeyCodes = this.props.closeOnKeyCodes || [];
    const pressedEscape = await pressedHotKey(e, hotKeyRefs.CLOSE_MODAL);
    const pressedCloseButton = closeOnKeyCodes.find(c => c === e.keyCode);

    // Pressed escape
    if (pressedEscape || pressedCloseButton) {
      e.preventDefault();
      this.hide();
      if (this.props.onCancel) {
        this.props.onCancel();
      }
    }
  }

  _handleClick(e) {
    // Don't check for close keys if we don't want them
    if (this.props.noEscape) {
      return;
    }

    // Did we click a close button. Let's check a few parent nodes up as well
    // because some buttons might have nested elements. Maybe there is a better
    // way to check this?
    let { target } = e;
    let shouldHide = false;

    for (let i = 0; i < 5; i++) {
      if (
        target instanceof HTMLElement &&
        target.hasAttribute('data-close-modal')
      ) {
        shouldHide = true;
        break;
      }

      target = target.parentNode;
    }

    if (shouldHide) {
      this.hide();
      if (this.props.onCancel) {
        this.props.onCancel();
      }
    }
  }

  _setModalRef(n) {
    this._node = n;
  }

  show(options) {
    const { freshState } = this.props;
    const { forceRefreshCounter } = this.state;

    this.setState({
      open: true,
      zIndex: globalZIndex++,
      forceRefreshCounter: forceRefreshCounter + (freshState ? 1 : 0)
    });

    if (this.props.dontFocus) {
      return;
    }

    // Allow instance-based onHide method
    this.onHide = options ? options.onHide : null;

    setTimeout(() => this._node && this._node.focus());
  }

  toggle() {
    if (this.state.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  isOpen() {
    return this.state.open;
  }

  hide(noCallback) {
    this.setState({ open: false });

    if (noCallback === true) return;

    if (this.props.onHide) {
      this.props.onHide();
    }

    if (this.onHide) {
      this.onHide();
    }
  }

  render() {
    const { thin, wide, noEscape, className, children } = this.props;
    const { open, zIndex, forceRefreshCounter } = this.state;

    if (!open) {
      return null;
    }

    const classes = classnames(
      'modal',
      'theme--pane',
      className,
      { 'modal--noescape': noEscape },
      { 'modal--wide': wide },
      { 'modal--thin': thin }
    );

    const styles = {};
    if (open) {
      styles.zIndex = zIndex;
    }

    return (
      <KeydownBinder stopMetaPropagation scoped onKeydown={this._handleKeyDown}>
        <div
          ref={this._setModalRef}
          tabIndex="-1"
          className={classes}
          style={styles}
          aria-hidden={!open}
          onClick={this._handleClick}
        >
          <div
            className="modal__backdrop overlay theme--transparent-overlay"
            data-close-modal
          />
          <div className="modal__content__wrapper">
            <div className="modal__content" key={forceRefreshCounter}>
              {children}
            </div>
          </div>
        </div>
      </KeydownBinder>
    );
  }
}

export default Modal;
