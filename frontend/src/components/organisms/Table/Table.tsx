import React, { useState } from 'react';
import './Table.scss';
import Spinner from '../../atoms/Spinner/Spinner';
import Icon from '../../atoms/Icon/Icon';

export interface ColumnType<T = unknown> {
  title: React.ReactNode;
  key: string;
  dataIndex?: string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
}

export interface TableProps<T = unknown> {
  dataSource: T[];
  columns: ColumnType<T>[];
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  pagination?: { pageSize?: number } | false;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
}

export function Table<T = unknown>({
  dataSource = [],
  columns = [],
  rowKey = '_id',
  loading = false,
  pagination = { pageSize: 5 },
  size = 'middle',
  style,
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination parameters
  const pageSize = pagination ? pagination.pageSize || 5 : dataSource.length;
  const total = dataSource.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Slice data for active page
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination ? dataSource.slice(startIndex, startIndex + pageSize) : dataSource;

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    const val = (record as Record<string, unknown>)[rowKey];
    if (typeof val === 'string' || typeof val === 'number') {
      return String(val);
    }
    return String(index);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderCellContent = (record: T, column: ColumnType<T>, rowIndex: number) => {
    const rawVal = column.dataIndex ? (record as Record<string, unknown>)[column.dataIndex] : undefined;
    if (column.render) {
      return column.render(rawVal, record, rowIndex);
    }
    if (typeof rawVal === 'object' && rawVal !== null) {
      return JSON.stringify(rawVal);
    }
    return rawVal !== undefined ? String(rawVal) : null;
  };

  return (
    <div className="table-organism-wrapper" style={style}>
      <div className={`table-container table-container--${size}`}>
        {loading && (
          <div className="table-loading-overlay">
            <Spinner size="medium" tip="Retrieving records..." />
          </div>
        )}
        <table className="custom-html-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="table-header-cell">
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((record, rowIndex) => (
                <tr key={getRowKey(record, rowIndex)} className="table-body-row">
                  {columns.map((col) => (
                    <td key={col.key} className="table-body-cell">
                      {renderCellContent(record, col, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              !loading && (
                <tr className="table-empty-row">
                  <td colSpan={columns.length} className="table-empty-cell">
                    <div className="table-empty-state">
                      <Icon name="empty-state" size={48} className="empty-state-icon" />
                      <span className="empty-state-text">No records found</span>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination panel */}
      {pagination && totalPages > 1 && (
        <div className="table-pagination-panel">
          <div className="pagination-info">
            Showing {Math.min(startIndex + 1, total)} to {Math.min(startIndex + pageSize, total)} of {total} items
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <Icon name="pagination-prev" size={14} />
            </button>
            <span className="pagination-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <Icon name="pagination-next" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
