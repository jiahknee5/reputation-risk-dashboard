import { Download } from 'lucide-react'

interface ExportButtonProps {
  data: Record<string, unknown>[] | string
  filename: string
  format: 'csv' | 'json'
  label?: string
}

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h]
      const s = v === null || v === undefined ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export default function ExportButton({ data, filename, format, label }: ExportButtonProps) {
  const handleExport = () => {
    let content: string
    let mimeType: string

    if (format === 'csv' && Array.isArray(data)) {
      content = toCSV(data)
      mimeType = 'text/csv'
    } else {
      content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      mimeType = 'application/json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-200 transition-colors"
    >
      <Download size={14} />
      {label || `Export ${format.toUpperCase()}`}
    </button>
  )
}
