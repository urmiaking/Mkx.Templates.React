import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { Button } from './Button'

export type DataColumn<T> = {
  key: string
  title: string
  value: (row: T) => string | number | null | undefined
  cell?: (row: T) => ReactNode
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
}

type Props<T> = {
  rows: readonly T[]
  columns: readonly DataColumn<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
  caption?: string
}

type Sort = {key: string; direction: 'asc' | 'desc'}

export function DataTable<T>({
  rows, columns, getRowId, loading = false, emptyMessage = 'داده‌ای یافت نشد', pageSize = 5, caption
}: Props<T>) {
  const [sort, setSort] = useState<Sort | null>(null)
  const [page, setPage] = useState(0)
  const processed = useMemo(() => {
    if (!sort) return [...rows]
    const column = columns.find(c => c.key === sort.key)
    if (!column) return [...rows]
    const collator = new Intl.Collator('fa', {numeric: true, sensitivity: 'base'})
    return [...rows].sort((a,b) => {
      const av = column.value(a)
      const bv = column.value(b)
      if (av == null) return bv == null ? 0 : 1
      if (bv == null) return -1
      const compared = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : collator.compare(String(av),String(bv))
      return sort.direction === 'asc' ? compared : -compared
    })
  }, [rows, columns, sort])
  const safePageSize = Math.max(1,pageSize)
  const pageCount = Math.max(1, Math.ceil(processed.length/safePageSize))
  const currentPage = Math.min(page,pageCount-1)
  const visible = processed.slice(currentPage*safePageSize,(currentPage+1)*safePageSize)
  function orderBy(key: string) {
    setSort(old => old?.key === key ? {key,direction:old.direction === 'asc' ? 'desc' : 'asc'} : {key,direction:'asc'})
    setPage(0)
  }
  return <div className="ui-table-shell">
    <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={caption || 'جدول داده‌ها'}>
      <table className="ui-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={column.sortable ? (sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined} className={'ui-table--' + (column.align ?? 'start')}>
          {column.sortable ? <button type="button" className="ui-table-sort" onClick={() => orderBy(column.key)}
            aria-label={'مرتب‌سازی ' + column.title}>
              {column.title}{sort?.key === column.key
                ? sort.direction === 'asc' ? <ChevronUp size={15}/> : <ChevronDown size={15}/>
                : <ChevronsUpDown size={14}/>}
            </button> : column.title}
        </th>)}</tr></thead>
        <tbody>{!loading && visible.map(row => <tr key={getRowId(row)}>
          {columns.map(column => <td key={column.key} className={'ui-table--' + (column.align ?? 'start')}>
            {column.cell ? column.cell(row) : column.value(row)}
          </td>)}
        </tr>)}
        {(loading || visible.length === 0) && <tr><td className="ui-table-empty" colSpan={columns.length || 1}>
          {loading ? 'در حال بارگذاری...' : emptyMessage}
        </td></tr>}</tbody>
      </table>
    </div>
    {!loading && processed.length > safePageSize && <nav aria-label="صفحه‌بندی جدول" className="ui-table-pagination">
      <span>{new Intl.NumberFormat('fa-IR').format(currentPage*safePageSize+1)}–{new Intl.NumberFormat('fa-IR').format(Math.min((currentPage+1)*safePageSize,processed.length))} از {new Intl.NumberFormat('fa-IR').format(processed.length)}</span>
      <div className="ui-table-pagination__actions">
        <Button variant="secondary" type="button" disabled={currentPage===0} onClick={() => setPage(currentPage-1)}>
          <ChevronRight size={17}/> قبلی
        </Button>
        <Button variant="secondary" type="button" disabled={currentPage>=pageCount-1} onClick={() => setPage(currentPage+1)}>
          بعدی <ChevronLeft size={17}/>
        </Button>
      </div>
    </nav>}
  </div>
}
