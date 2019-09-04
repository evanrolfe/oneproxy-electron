// @flow
import type { HotKeyDefinition, KeyBindings, KeyCombination } from './hotkeys';
import {
  areSameKeyCombinations,
  getPlatformKeyCombinations,
  newDefaultRegistry
} from './hotkeys';

function _pressedHotKey(e: KeyboardEvent, bindings: KeyBindings): boolean {
  const pressedKeyComb: KeyCombination = {
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
    keyCode: e.keyCode
  };
  const keyCombList = getPlatformKeyCombinations(bindings);

  for (const keyComb of keyCombList) {
    if (areSameKeyCombinations(pressedKeyComb, keyComb)) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether a hotkey has been pressed.
 * @param e the activated keyboard event.
 * @param definition the hotkey definition being checked.
 * @returns {Promise<boolean>}
 */
export async function pressedHotKey(
  e: KeyboardEvent,
  definition: HotKeyDefinition
): Promise<boolean> {
  const hotKeyRegistry = newDefaultRegistry();
  return _pressedHotKey(e, hotKeyRegistry[definition.id]);
}

/**
 * Call callback if the hotkey has been pressed.
 * @param e the activated keyboard event.
 * @param definition the hotkey definition being checked.
 * @param callback to be called if the hotkey has been activated.
 * @returns {Promise<void>}
 */
export async function executeHotKey(
  e: KeyboardEvent,
  definition: HotKeyDefinition,
  callback: Function
): Promise<void> {
  if (await pressedHotKey(e, definition)) {
    callback();
  }
}
