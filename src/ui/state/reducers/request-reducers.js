import { ipcRenderer } from 'electron';

import { getSelectedRequestIds } from '../selectors';
import { setNestedValue } from './utils';

const requestsLoaded = (state, action) => {
  ipcRenderer.send('requestsChanged', { requests: action.requests });
  return setNestedValue('requests', state, action);
};

const requestLoaded = (state, action) =>
  setNestedValue('request', state, action);

const requestCreated = (state, action) => {
  const newState = { ...state };

  // TODO: Insert it in the right place depending on the order_by and dir state
  newState.browserNetworkPage.requests.unshift(action.request);

  return newState;
};

const requestUpdated = (state, action) => {
  console.log(`[STATE] Request updated, updating the state...`);
  console.log(action.request);

  const newState = { ...state };

  const requestIds = newState.browserNetworkPage.requests.map(r => r.id);
  const index = requestIds.indexOf(action.request.id);
  newState.browserNetworkPage.requests[index] = action.request;

  return newState;
};

const requestDeleted = (state, action) => {
  let deletedIds;

  if (Array.isArray(action.requestId)) {
    deletedIds = action.requestId;
  } else {
    deletedIds = [action.requestId];
  }

  const newState = { ...state };

  newState.browserNetworkPage.requests = newState.browserNetworkPage.requests.filter(
    request => !deletedIds.includes(request.id)
  );

  // Clear the selected requests:
  newState.browserNetworkPage.selectedRequestId = null;
  newState.browserNetworkPage.selectedRequestId2 = null;

  return newState;
};

const selectRequest = (state, action) => {
  console.log(`[REQUESTREDUCERS] selecting request ${action.requestId}...`);
  let selectedRequestId2 = null;

  if (state.shiftPressed === true) {
    if (state.browserNetworkPage.selectedRequestId2 === null) {
      selectedRequestId2 = state.browserNetworkPage.selectedRequestId;
    } else {
      selectedRequestId2 = state.browserNetworkPage.selectedRequestId2;
    }
  }

  const newState = { ...state };
  newState[action.page].selectedRequestId = action.requestId;
  newState[action.page].selectedRequestId2 = selectedRequestId2;

  // Create the multiple requests context menu if necessary:
  if (selectedRequestId2 !== null) {
    const selectedRequestIds = getSelectedRequestIds(newState);
    console.log(
      `[STATE] Create contenxt menu for(${selectedRequestIds.length}) requests`
    );
    ipcRenderer.send('requestsSelected', { requestIds: selectedRequestIds });
  }

  console.log(`[REQUESTREDUCERS] selected request ${action.requestId}`);
  return newState;
};

const selectPrevRequest = (state, action) => {
  const index = state[action.page].requests.findIndex(
    request => request.id === state[action.page].selectedRequestId
  );
  const prevRequest = state[action.page].requests[index - 1];
  if (prevRequest === undefined) return state;

  return selectRequest(state, { requestId: prevRequest.id, page: action.page });
};

const selectNextRequest = (state, action) => {
  const index = state[action.page].requests.findIndex(
    request => request.id === state[action.page].selectedRequestId
  );
  const nextRequest = state[action.page].requests[index + 1];
  if (nextRequest === undefined) return state;

  return selectRequest(state, { requestId: nextRequest.id, page: action.page });
};

const requestReducers = {
  REQUESTS_LOADED: requestsLoaded,
  REQUEST_LOADED: requestLoaded,
  REQUEST_CREATED: requestCreated,
  REQUEST_DELETED: requestDeleted,
  REQUEST_UPDATED: requestUpdated,
  SELECT_REQUEST: selectRequest,
  SELECT_PREV_REQUEST: selectPrevRequest,
  SELECT_NEXT_REQUEST: selectNextRequest
};

export { requestReducers };
