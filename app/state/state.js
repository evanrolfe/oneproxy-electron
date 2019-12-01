import { ipcRenderer, remote } from 'electron';
import { put, takeLatest, takeEvery, all, select } from 'redux-saga/effects';
import { createContainer } from 'react-tracked';
// eslint-disable-next-line import/no-named-as-default
import useSagaReducer from './useSagaReducer';
import { getPane } from './selectors';

export const RESOURCE_TYPES = [
  'document',
  'eventsource',
  'fetch',
  'font',
  'image',
  'manifest',
  'media',
  'navigation',
  'other',
  'stylesheet',
  'script',
  'texttrack',
  'websocket',
  'xhr'
];

export const STATUS_CODES = {
  2: '2xx [Success]',
  3: '3xx [Redirect]',
  4: '4xx [Request Error]',
  5: '5xx [Server Error]'
};

export const ALL_TABLE_COLUMNS = [
  { key: 'id', title: '#', width: 40 },
  { key: 'title', title: 'Browser', width: 100 },
  { key: 'method', title: 'Method', width: 70 },
  { key: 'host', title: 'Host', width: 100 },
  { key: 'path', title: 'Path', width: 200 },
  { key: 'request_type', title: 'Type', width: 100 },
  { key: 'ext', title: 'Ext', width: 40 },
  { key: 'response_status', title: 'Status', width: 70 },
  {
    key: 'response_body_length',
    title: 'Length',
    width: 70
  },
  {
    key: 'response_remote_address',
    title: 'IP Address',
    width: 130
  },
  { key: 'created_at', title: 'Time', width: 200 }
];

const selectedColumns = [
  'id',
  'title',
  'method',
  'host',
  'path',
  'response_status',
  'request_type'
];

const requestsTableColumns = ALL_TABLE_COLUMNS.filter(column =>
  selectedColumns.includes(column.key)
);

const initialState = {
  activeTheme: 'default',
  shiftPressed: false,
  windowSizeThrottel: remote.getCurrentWindow().getSize(),
  browserNetworkPage: {
    requestViewTabIndex: 0,
    viewMode: 'pretty', // pretty | raw | preview | parsed
    viewContent: 'render', // source | render
    orderBy: 'id',
    dir: 'desc',
    requestsTableColumns: requestsTableColumns,
    requestsTableScrollTop: 0,
    browsers: [],
    requests: [],
    request: null,
    selectedRequestId: null,
    selectedRequestId2: null,
    filters: {
      hostList: [],
      hostSetting: '', // ''|'include'|'exclude'
      pathList: [],
      pathSetting: '', // ''|'include'|'exclude'
      statusCodes: Object.keys(STATUS_CODES),
      resourceTypes: RESOURCE_TYPES,
      extSetting: '', // ''|'include'|'exclude'
      extList: [],
      search: '',
      browserId: null
    },
    page: {
      orientation: 'horizontal',
      panes: [
        {
          id: 1,
          tab: 'Network',
          length: 700,
          draggingPane: false
        },
        {
          id: 2,
          orientation: 'vertical',
          length: 500,
          draggingPane: false,
          panes: [
            {
              id: 3,
              tabs: ['Request'],
              length: 150,
              draggingPane: false,
              tabIndex: 0
            },
            {
              id: 4,
              tabs: ['Response', 'Body'],
              length: 300,
              draggingPane: false,
              tabIndex: 0
            }
          ]
        }
      ]
    }
  }
};

/* ----------------------------------------------------------------------------*
 * Reducers:
 * ----------------------------------------------------------------------------*/
const handleRequestDelete = (state, action) => {
  let deletedIds;
  // If multiple requests were deleted:
  if (Array.isArray(action.requestId) === true) {
    deletedIds = action.requestId;

    // If a single request was deleted:
  } else {
    deletedIds = [action.requestId];
  }

  return {
    ...state,
    requests: state.requests.filter(req => !deletedIds.includes(req.id))
  };
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

const selectRequest = (state, action) => {
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
  return newState;
};

const toggleColumnOrder = (state, action) => {
  const newState = { ...state };

  if (action.columnKey !== state[action.page].orderBy) {
    newState[action.page].orderBy = action.columnKey;
  } else {
    newState[action.page].dir =
      state[action.page].dir === 'asc' ? 'desc' : 'asc';
  }

  return newState;
};

const setColumnWidth = (state, action) => {
  const newState = { ...state };
  const newTableColumns = [...state[action.page].requestsTableColumns];
  newTableColumns[action.columnIndex].width = action.width;

  newState[action.page].requestsTableColumns = newTableColumns;

  return newState;
};

const setSearch = (state, action) => {
  const newFilters = Object.assign({}, state[action.page].filters);
  newFilters.search = action.value;

  const newState = { ...state };
  newState[action.page].filters = newFilters;
  return newState;
};

const setFilters = (state, action) => {
  const newFilters = Object.assign({}, state[action.page].filters);

  Object.keys(action.filters).forEach(key => {
    newFilters[key] = action.filters[key];
  });

  const newState = { ...state };
  newState[action.page].filters = newFilters;
  return newState;
};

const setBodyTabView = (state, action) => {
  const newState = { ...state };
  newState[action.page].viewMode = action.viewMode;
  newState[action.page].viewContent = action.viewContent;
  return newState;
};

const setNestedValue = (key, state, action) => {
  const newState = { ...state };

  newState[action.page][key] = action[key];
  console.log(`[STATE] Set ${action.page}.${key} to: ${action[key]}`);
  return newState;
};

const setOrientation = (state, action) => {
  const newState = { ...state };

  newState.browserNetworkPage.page.orientation = action.orientation;

  // Set default lengths for each pane:
  let defaultLength;
  if (action.orientation === 'vertical') {
    defaultLength = 500;
  } else if (action.orientation === 'horizontal') {
    defaultLength = 200;
  }
  newState.browserNetworkPage.page.panes.forEach(pane => {
    pane.length = defaultLength;
  });

  return newState;
};

const setPaneValue = (key, state, action) => {
  const newState = { ...state };

  const pane = getPane(state, action.paneId);
  pane[key] = action[key];

  console.log(
    `[STATE] Set ${action.page}.page.panes[${action.paneId}].${key} to: ${
      action[key]
    }`
  );

  return newState;
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'BROWSERS_LOADED':
      return setNestedValue('browsers', state, action);

    case 'REQUESTS_LOADED':
      ipcRenderer.send('requestsChanged', { requests: action.requests });
      return setNestedValue('requests', state, action);

    case 'REQUEST_LOADED':
      return setNestedValue('request', state, action);
    case 'REQUEST_DELETED':
      return handleRequestDelete(state, action);

    // RequestsTable:
    case 'SELECT_REQUEST':
      return selectRequest(state, action);
    case 'SELECT_PREV_REQUEST':
      return selectPrevRequest(state, action);
    case 'SELECT_NEXT_REQUEST':
      return selectNextRequest(state, action);
    case 'SHIFT_PRESSED':
      return { ...state, shiftPressed: true };
    case 'SHIFT_RELEASED':
      return { ...state, shiftPressed: false };
    case 'TOGGLE_COLUMN_ORDER':
      return toggleColumnOrder(state, action);
    case 'SET_COLUMN_WIDTH':
      return setColumnWidth(state, action);
    case 'SET_SCROLLTOP':
      return setNestedValue('requestsTableScrollTop', state, action);
    case 'SET_DRAGGING_PANE':
      return setPaneValue('draggingPane', state, action);
    case 'SET_PANE_LENGTH':
      return setPaneValue('length', state, action);
    case 'SET_PANE_TABINDEX':
      return setPaneValue('tabIndex', state, action);

    case 'SET_SEARCH':
      return setSearch(state, action);
    case 'SET_FILTERS':
      return setFilters(state, action);
    case 'SET_WINDOW_SIZE_THROTTLED':
      return { ...state, windowSizeThrottel: action.windowSize };

    // RequestView:
    case 'SET_BODYTAB_VIEW':
      return setBodyTabView(state, action);

    // SettingsModal:
    case 'SET_THEME':
      return { ...state, activeTheme: action.theme };
    case 'SET_ORIENTATION':
      return setOrientation(state, action);
    case 'SET_TABLECOLUMNS':
      return setNestedValue('requestsTableColumns', state, action);

    default:
      return state; // needs this for AsyncAction
  }
};

/* ----------------------------------------------------------------------------*
 * Sagas:
 * ----------------------------------------------------------------------------*/

function* saveState() {
  const state = yield select();
  localStorage.setItem('activeTheme', state.activeTheme);
  console.log('Saved state.');
}

function* loadState() {
  /*
  const orientation = yield localStorage.getItem('browserNetworkPage.orientation');
  yield put({ type: 'SET_ORIENTATION', orientation: orientation, page: 'browserNetworkPage' });

  const activeTheme = yield localStorage.getItem('activeTheme');
  yield put({ type: 'SET_THEME', theme: activeTheme });

  const paneWidth = yield localStorage.getItem('browserNetworkPage.paneWidth');
  const paneHeight = yield localStorage.getItem('browserNetworkPage.paneHeight');
  if (paneWidth !== null && paneWidth !== undefined)
    yield put({ type: 'SET_PANE_WIDTH', paneWidth: parseInt(paneWidth), page: 'browserNetworkPage' });

  if (paneHeight !== null && paneHeight !== undefined)
    yield put({ type: 'SET_PANE_HEIGHT', paneHeight: parseInt(paneHeight), page: 'browserNetworkPage' });
*/
}

function* setThemeStorage(action) {
  yield put({ type: 'SET_THEME', theme: action.theme });
  localStorage.setItem('activeTheme', action.theme);
}

function* setOrientationStorage(action) {
  yield put({
    type: 'SET_ORIENTATION',
    orientation: action.orientation,
    page: action.page
  });
  localStorage.setItem(`${action.page}.orientation`, action.orientation);
}

function* setTableColumnsStorage(action) {
  yield put({
    type: 'SET_TABLECOLUMNS',
    requestsTableColumns: action.requestsTableColumns,
    page: action.page
  });
  localStorage.setItem(
    `${action.page}.requestsTableColumns`,
    action.requestsTableColumns
  );
}

function* setPaneHeightStorage(action) {
  yield put({
    type: 'SET_PANE_HEIGHT',
    paneHeight: action.height,
    page: 'browserNetworkPage'
  });
  localStorage.setItem('browserNetworkPage.paneHeight', action.height);
}

function* setPaneWidthStorage(action) {
  yield put({
    type: 'SET_PANE_WIDTH',
    paneWidth: action.width,
    page: 'browserNetworkPage'
  });
  localStorage.setItem('browserNetworkPage.paneWidth', action.width);
}

function* loadRequests() {
  const filters = yield select(state => state.browserNetworkPage.filters);
  const orderBy = yield select(state => state.browserNetworkPage.orderBy);
  const dir = yield select(state => state.browserNetworkPage.dir);

  const params = { ...filters, order_by: orderBy, dir: dir };

  const response = yield global.backendConn.send(
    'RequestsController',
    'index',
    params
  );

  const requests = response.result.body;

  yield put({
    type: 'REQUESTS_LOADED',
    requests: requests,
    page: 'browserNetworkPage'
  });
}

function* loadRequest() {
  const requestId = yield select(
    state => state.browserNetworkPage.selectedRequestId
  );

  const response = yield global.backendConn.send('RequestsController', `show`, {
    id: requestId
  });
  const request = response.result.body;
  console.log(`Loaded request ${request.id}`);

  yield put({
    type: 'REQUEST_LOADED',
    request: request,
    page: 'browserNetworkPage'
  });
}

function* loadBrowsers() {
  const result = yield global.backendConn.send(
    'BrowsersController',
    'index',
    {}
  );
  const browsers = result.result.body;

  yield put({
    type: 'BROWSERS_LOADED',
    browsers: browsers,
    page: 'browserNetworkPage'
  });
}

function* deleteRequest(action) {
  yield global.backendConn.send('RequestsController', 'delete', {
    id: action.requestId
  });
  yield put({ type: 'REQUEST_DELETED', requestId: action.requestId });
}

function* selectRequestLoad(action) {
  yield put({
    type: 'SELECT_REQUEST',
    requestId: action.request.id,
    page: 'browserNetworkPage'
  });
  yield put({ type: 'LOAD_REQUEST' });
}

function* selectPrevRequestLoad() {
  yield put({ type: 'SELECT_PREV_REQUEST', page: 'browserNetworkPage' });
  yield put({ type: 'LOAD_REQUEST' });
}

function* selectNextRequestLoad() {
  yield put({ type: 'SELECT_NEXT_REQUEST', page: 'browserNetworkPage' });
  yield put({ type: 'LOAD_REQUEST' });
}

function* searchRequests(action) {
  yield put({
    type: 'SET_SEARCH',
    value: action.value,
    page: 'browserNetworkPage'
  });
  yield put({ type: 'LOAD_REQUESTS' });
}

function* filterRequests(action) {
  yield put({
    type: 'SET_FILTERS',
    filters: action.filters,
    page: 'browserNetworkPage'
  });
  yield put({ type: 'LOAD_REQUESTS' });
}

function* toggleColumnOrderRequests(action) {
  yield put({
    type: 'TOGGLE_COLUMN_ORDER',
    columnKey: action.columnKey,
    page: action.page
  });
  yield put({ type: 'LOAD_REQUESTS' });
}

function* rootSaga() {
  yield all([
    takeLatest('LOAD_BROWSERS', loadBrowsers),
    takeLatest('LOAD_REQUESTS', loadRequests),
    takeLatest('LOAD_REQUEST', loadRequest),
    takeEvery('DELETE_REQUEST', deleteRequest),
    takeLatest('SEARCH_REQUESTS', searchRequests),
    takeLatest('FILTER_REQUESTS', filterRequests),
    takeLatest('TOGGLE_COLUMN_ORDER_REQUESTS', toggleColumnOrderRequests),
    takeLatest('SELECT_REQUEST_LOAD', selectRequestLoad),
    takeLatest('SELECT_PREV_REQUEST_LOAD', selectPrevRequestLoad),
    takeLatest('SELECT_NEXT_REQUEST_LOAD', selectNextRequestLoad),
    takeLatest('SAVE_STATE', saveState),
    takeLatest('LOAD_STATE', loadState),
    // Settings:
    takeLatest('SET_THEME_STORAGE', setThemeStorage),
    takeLatest('SET_ORIENTATION_STORAGE', setOrientationStorage),
    takeLatest('SET_TABLECOLUMNS_STORAGE', setTableColumnsStorage),
    takeLatest('SET_PANE_HEIGHT_STORAGE', setPaneHeightStorage),
    takeLatest('SET_PANE_WIDTH_STORAGE', setPaneWidthStorage)
  ]);
}

// eslint-disable-next-line import/no-named-as-default
const useValue = () => useSagaReducer(rootSaga, reducer, initialState);

export const {
  Provider,
  useTrackedState,
  useSelector,
  useUpdate: useDispatch
} = createContainer(useValue);
