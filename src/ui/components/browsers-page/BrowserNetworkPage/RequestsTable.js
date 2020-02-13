import React from 'react';
import { ipcRenderer } from 'electron';
import { AutoSizer, Column, Table } from 'react-virtualized';

import { useDispatch } from '../../../state/state';
import KeydownBinder from '../../KeydownBinder';
import requestsTableCellRenderer from './RequestsTableCellRenderer';
import rowRenderer from './rowRenderer';

const getSelectedRequestIds = (selectedId1, selectedId2, requests) => {
  const requestIds = requests.map(request => request.id);

  const i1 = requestIds.indexOf(selectedId1);
  const i2 = requestIds.indexOf(selectedId2);
  let selectedRequestIds;

  if (i2 > i1) {
    selectedRequestIds = requestIds.slice(i1, i2 + 1);
  } else {
    selectedRequestIds = requestIds.slice(i2, i1 + 1);
  }

  return selectedRequestIds;
};

type Props = {
  requests: 'array',
  requestsTableColumns: 'array',
  selectedRequestId: 'number',
  selectedRequestId2: 'number',
  orderBy: 'string',
  dir: 'string'
};

export default ({
  requests,
  requestsTableColumns,
  selectedRequestId,
  selectedRequestId2,
  // eslint-disable-next-line no-unused-vars
  orderBy,
  // eslint-disable-next-line no-unused-vars
  dir
}: Props) => {
  const dispatch = useDispatch();
  console.log(`[RENDER] RequestsTable with ${requests.length} requests`);

  const selectedRequestIds = getSelectedRequestIds(
    selectedRequestId,
    selectedRequestId2,
    requests
  );
  /*
  const _getRowClassName = requestId => {
    let isSelected = false;

    if (selectedRequestId2 === null) {
      isSelected = parseInt(requestId) === selectedRequestId;
    } else {
      isSelected = selectedRequestIds.includes(requestId);
    }

    if (isSelected) {
      return 'selected';
    }
  };

  const _handleRightClick = (requestId, event) => {
    event.preventDefault();

    if (selectedRequestId2 !== null) {
      ipcRenderer.send('showMultipleRequestContextMenu', {
        requestId: requestId
      });
    } else {
      ipcRenderer.send('showRequestContextMenu', { requestId: requestId });
    }
  };
*/
  const _handleKeyUp = e => {
    if (e.key === 'Shift') dispatch({ type: 'SHIFT_RELEASED' });
  };

  const _handleKeyDown = e => {
    if (!['ArrowUp', 'ArrowDown', 'Shift'].includes(e.key)) return;

    e.preventDefault();
    // const requestDiv = requestDivRef.current;

    if (e.key === 'ArrowUp') {
      // dispatch({type: 'SET_SCROLLTOP', requestsTableScrollTop: requestDiv.scrollTop, page: 'browserNetworkPage'});
      dispatch({ type: 'SELECT_PREV_REQUEST_LOAD' });
    }
    if (e.key === 'ArrowDown') {
      // dispatch({type: 'SET_SCROLLTOP', requestsTableScrollTop: requestDiv.scrollTop, page: 'browserNetworkPage'});
      dispatch({ type: 'SELECT_NEXT_REQUEST_LOAD' });
    }
    if (e.key === 'Shift') dispatch({ type: 'SHIFT_PRESSED' });
  };

  // NOTE: This fires twice when the event is received for some reason
  ipcRenderer.on('deleteRequest', (event, args) => {
    dispatch({ type: 'DELETE_REQUEST', requestId: args.requestId });
  });

  // This will create the context menus for the multiple requests selection
  if (selectedRequestIds.length > 1) {
    console.log(`[Frontend] Create context menu for multiple requests`);
    ipcRenderer.send('requestsSelected', {
      requestIds: selectedRequestIds
    });
  }
  /*
  const classNameForTableHeader = columnName => {
    if (columnName === orderBy) return 'ordered';

    return '';
  };
  const setTableColumnWidth = (columnIndex, width) => {
    dispatch({
      type: 'SET_COLUMN_WIDTH',
      width: width,
      columnIndex: columnIndex,
      page: 'browserNetworkPage'
    });
  };
*/

  const selectRequest = ({ event, rowData }) => {
    // Do not proceed if this is a right-click
    if (event.nativeEvent.which === 3) return;

    const request = rowData;
    dispatch({ type: 'SELECT_REQUEST_LOAD', request: request });
  };

  return (
    <KeydownBinder
      stopMetaPropagation
      onKeydown={_handleKeyDown}
      onKeyup={_handleKeyUp}
    >
      <div className="pane-remaining" style={{ overflowX: 'hidden' }}>
        <AutoSizer className="no-highlight">
          {({ height, width }) => (
            <Table
              className="no-highlight"
              width={width}
              height={height}
              headerHeight={21}
              rowCount={requests.length}
              rowGetter={({ index }) => requests[index]}
              onRowClick={selectRequest}
              rowHeight={21}
              rowRenderer={rowRenderer}
            >
              {requestsTableColumns.map(column => (
                <Column
                  width={column.width}
                  label={column.title}
                  dataKey={column.key}
                  cellRenderer={requestsTableCellRenderer}
                />
              ))}
            </Table>
          )}
        </AutoSizer>
      </div>
    </KeydownBinder>
  );
};