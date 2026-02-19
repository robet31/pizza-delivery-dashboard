'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp,
  Loader2,
  AlertCircle,
  Info,
  Calendar,
  BarChart3,
  LineChart,
  Download,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ForecastResult {
  success?: boolean
  historical?: { date: string; actual: number; forecast: number }[]
  forecast?: number[]
  method?: string
  error?: string
  insights?: string
  recommendations?: string
}

interface DataSummary {
  success?: boolean
  total_orders?: number
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#10b981',
  warning: '#f59e0b',
}

function ScrollableLineChart({ 
  historical, 
  forecast,
  valueColumn,
  color = COLORS.primary,
  forecastColor = COLORS.accent 
}: { 
  historical: { date: string; actual: number; forecast: number }[]
  forecast: number[]
  valueColumn: string
  color?: string
  forecastColor?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredData, setHoveredData] = useState<{type: string; value: number; date: string} | null>(null)
  
  const totalPoints = historical.length + forecast.length
  const pointWidth = 80
  const chartWidth = totalPoints * pointWidth
  
  if (!historical?.length) return <div className="h-64 flex items-center justify-center text-slate-400">Tidak ada data</div>
  
  const allValues = [...historical.map(h => h.actual), ...(forecast || [])]
  const maxVal = Math.max(...allValues) * 1.1
  const minVal = Math.min(...allValues) * 0.9
  const range = maxVal - minVal || 1
  
  const chartHeight = isFullscreen ? 400 : 300
  const padding = { top: 30, right: 30, bottom: 50, left: 60 }
  
  const getY = (val: number) => padding.top + chartHeight - padding.bottom - ((val - minVal) / range) * (chartHeight - padding.top - padding.bottom)
  
  const getX = (index: number) => padding.left + (index / (totalPoints - 1)) * (chartWidth || 300)
  
  const historicalPoints = historical.map((h, i) => ({
    x: getX(i),
    y: getY(h.actual),
    data: h
  }))
  
  const forecastPoints = forecast.map((f, i) => ({
    x: getX(historical.length + i),
    y: getY(f),
    value: f,
    label: `Prediksi ${i + 1}`
  }))
  
  const maxScroll = Math.max(0, chartWidth - (containerRef.current?.clientWidth || 800) + padding.left + padding.right)
  
  const scroll = (direction: 'left' | 'right') => {
    const scrollAmount = 300
    if (containerRef.current) {
      const newPos = direction === 'right' 
        ? Math.min(scrollPosition + scrollAmount, maxScroll)
        : Math.max(scrollPosition - scrollAmount, 0)
      containerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setScrollPosition(newPos)
    }
  }

  const formatValue = (val: number) => {
    if (valueColumn.includes('duration') || valueColumn.includes('time')) return `${val.toFixed(1)} menit`
    if (valueColumn.includes('distance')) return `${val.toFixed(1)} km`
    if (valueColumn.includes('delay')) return `${val.toFixed(1)} menit`
    return val.toFixed(1)
  }

  const formatLabel = (label: string) => {
    if (label.length > 10) return label.substring(0, 8) + '...'
    return label
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-600 text-sm">Data Aktual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full" style={{ backgroundColor: forecastColor }} />
            <span className="text-slate-600 text-sm">Prediksi</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => scroll('left')} disabled={scrollPosition <= 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-400">
            {Math.round((scrollPosition / (maxScroll || 1)) * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => scroll('right')} disabled={scrollPosition >= maxScroll}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div 
          className="relative bg-gradient-to-b from-blue-50 to-white rounded-xl border border-slate-200"
          style={{ 
            width: `${chartWidth + padding.left + padding.right}px`, 
            height: `${chartHeight + padding.top + padding.bottom}px` 
          }}
        >
          <svg 
            width={chartWidth + padding.left + padding.right} 
            height={chartHeight + padding.top + padding.bottom}
            className="absolute top-0 left-0"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
              const y = padding.top + (chartHeight - padding.top - padding.bottom) * tick
              const val = maxVal - (maxVal - minVal) * tick
              return (
                <g key={i}>
                  <line 
                    x1={padding.left} 
                    y1={y} 
                    x2={chartWidth + padding.left - padding.right} 
                    y2={y} 
                    stroke="#e2e8f0" 
                    strokeDasharray="4,4"
                  />
                  <text 
                    x={padding.left - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    fontSize="11" 
                    fill="#64748b"
                  >
                    {formatValue(val)}
                  </text>
                </g>
              )
            })}
            
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth + padding.left - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            
            {historicalPoints.length > 1 && (
              <path
                d={`M ${historicalPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            
            {forecastPoints.length > 0 && historicalPoints.length > 0 && (
              <path
                d={`M ${historicalPoints[historicalPoints.length - 1].x},${historicalPoints[historicalPoints.length - 1].y} L ${forecastPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke={forecastColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8,4"
              />
            )}
            
            {historicalPoints.map((p, i) => (
              <g key={`h-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-8 transition-all"
                  onMouseEnter={() => setHoveredData({type: 'Aktual', value: p.data.actual, date: p.data.date})}
                  onMouseLeave={() => setHoveredData(null)}
                />
              </g>
            ))}
            
            {forecastPoints.map((p, i) => (
              <g key={`f-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill={forecastColor}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredData({type: 'Prediksi', value: p.value, date: p.label})}
                  onMouseLeave={() => setHoveredData(null)}
                />
              </g>
            ))}
            
            {historical.map((h, i) => (
              <text 
                key={`label-h-${i}`}
                x={historicalPoints[i]?.x || 0}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                transform={`rotate(-45, ${historicalPoints[i]?.x || 0}, ${chartHeight - padding.bottom + 20})`}
              >
                {formatLabel(h.date)}
              </text>
            ))}
            
            {forecast.map((_, i) => (
              <text 
                key={`label-f-${i}`}
                x={forecastPoints[i]?.x || 0}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {formatLabel(`Pred ${i+1}`)}
              </text>
            ))}
            
            <text 
              x={(chartWidth + padding.left + padding.right) / 2} 
              y={chartHeight + 5} 
              textAnchor="middle" 
              fontSize="12" 
              fill="#64748b"
            >
              Periode Waktu
            </text>
            
            <text 
              x={15} 
              y={(chartHeight + padding.top + padding.bottom) / 2} 
              textAnchor="middle" 
              fontSize="12" 
              fill="#64748b"
              transform={`rotate(-90, 15, ${(chartHeight + padding.top + padding.bottom) / 2})`}
            >
              Nilai {valueColumn.replace('_', ' ')}
            </text>
          </svg>
          
          {hoveredData && (
            <div 
              className="absolute bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-10 pointer-events-none"
              style={{ 
                left: '50%', 
                top: '10px',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-semibold">{hoveredData.date}</div>
              <div>{hoveredData.type}: {formatValue(hoveredData.value)}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span>← Scroll untuk melihat {valueColumn.replace('_', ' ')} lebih detail</span>
        <span>{totalPoints} titik data | {historical.length} historis + {forecast.length} prediksi</span>
      </div>
    </div>
  )
}

export default function ForecastingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const userRole = (session?.user as any)?.role || (session?.user as any)?.position || 'STAFF'
  const allowedRoles = ['GM', 'ADMIN_PUSAT']
  
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [dateColumn, setDateColumn] = useState('order_month')
  const [valueColumn, setValueColumn] = useState('estimated_duration')
  const [method, setMethod] = useState('exponential-smoothing')
  const [periods, setPeriods] = useState(7)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated' && !allowedRoles.includes(userRole)) router.push('/')
  }, [status, userRole, router])

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/analytics-data/summary')
      const data = await res.json()
      setDataSummary(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const runForecast = async () => {
    setIsCalculating(true)
    setError('')
    
    try {
      const res = await fetch('/api/v1/analytics-data/summary')
      const summaryData = await res.json()
      setDataSummary(summaryData)
      
      if (!summaryData.success || summaryData.total_orders === 0) {
        setError('Tidak ada data di database')
        setIsCalculating(false)
        return
      }

      const dataRes = await fetch('/api/v1/analytics-data/all-data')
      const dataJson = await dataRes.json()
      
      if (!dataJson.data || dataJson.data.length === 0) {
        setError('Tidak ada data di database')
        setIsCalculating(false)
        return
      }

      const csvData = convertToCSV(dataJson.data)
      
      const formData = new FormData()
      formData.append('file', new Blob([csvData], { type: 'text/csv' }))
      formData.append('date_column', dateColumn)
      formData.append('value_column', valueColumn)
      formData.append('periods', periods.toString())

      const endpoint = method === 'exponential-smoothing' 
        ? '/api/v1/forecasting/exponential-smoothing'
        : method === 'moving-average'
        ? '/api/v1/forecasting/moving-average'
        : '/api/v1/forecasting/linear-trend'

      const forecastRes = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      const forecastData = await forecastRes.json()
      
      if (forecastData.historical && forecastData.forecast) {
        const avgHistorical = forecastData.historical.reduce((a: number, b: {actual: number}) => a + b.actual, 0) / forecastData.historical.length
        const avgForecast = forecastData.forecast.reduce((a: number, b: number) => a + b, 0) / forecastData.forecast.length
        const change = ((avgForecast - avgHistorical) / avgHistorical) * 100
        
        let trendDesc = ''
        if (change > 5) {
          trendDesc = `📈 Ada kecenderungan PENINGKATAN sebesar ${change.toFixed(1)}% dari rata-rata historis.`
        } else if (change < -5) {
          trendDesc = `📉 Ada kecenderungan PENURUNAN sebesar ${Math.abs(change).toFixed(1)}% dari rata-rata historis.`
        } else {
          trendDesc = `➡️ Nilai diprediksi akan STABIL dengan perubahan sekitar ${change.toFixed(1)}%.`
        }

        let insights = `Berdasarkan data historis selama ${forecastData.historical.length} periode, rata-rata nilai ${valueColumn.replace(/_/g, ' ')} adalah ${formatValue(avgHistorical)}. `
        insights += `Prediksi untuk ${forecastData.forecast.length} periode ke depan menunjukkan rata-rata ${formatValue(avgForecast)}. `
        insights += trendDesc

        let recommendations = ''
        if (valueColumn.includes('duration') || valueColumn.includes('time')) {
          recommendations = '💡 Rekomendasi: Jika prediksi menunjukkan peningkatan waktu pengiriman, pertimbangkan untuk menambah driver atau mengoptimalkan rute delivery.'
        } else if (valueColumn.includes('distance')) {
          recommendations = '💡 Rekomendasi: Jika prediksi menunjukkan peningkatan jarak, pertimbangkan untuk memperluas area layanan atau menambah titik distribusi.'
        } else if (valueColumn.includes('delay')) {
          recommendations = '💡 Rekomendasi: Jika prediksi menunjukkan peningkatan keterlambatan, evaluasi proses persiapan dan pengiriman untuk mengurangi delay.'
        } else {
          recommendations = '💡 Rekomendasi: Gunakan data ini untuk perencanaan staffing dan inventory di periode mendatang.'
        }
        
        forecastData.insights = insights
        forecastData.recommendations = recommendations
      }
      
      setResult(forecastData)
    } catch (err) {
      setError('Gagal menghitung forecast')
    } finally {
      setIsCalculating(false)
    }
  }

  const formatValue = (val: number) => {
    if (valueColumn.includes('duration') || valueColumn.includes('time')) return `${val.toFixed(1)} menit`
    if (valueColumn.includes('distance')) return `${val.toFixed(1)} km`
    if (valueColumn.includes('delay')) return `${val.toFixed(1)} menit`
    return val.toFixed(1)
  }

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]
    for (const row of data) {
      const values = headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`
        return val
      })
      csvRows.push(values.join(','))
    }
    return csvRows.join('\n')
  }

  const downloadResult = (format: 'csv' | 'json') => {
    if (!result?.historical || !result?.forecast) return

    if (format === 'csv') {
      const csvContent = [
        'date,actual,forecast',
        ...result.historical.map((h, i) => `${h.date},${h.actual},${h.forecast}`),
        ...result.forecast.map((f, i) => `Forecast ${i + 1},,${f}`)
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'forecast_result.csv'
      a.click()
    } else {
      const jsonContent = JSON.stringify(result, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'forecast_result.json'
      a.click()
    }
  }

  const getMethodDescription = (m: string) => {
    switch(m) {
      case 'exponential-smoothing':
        return 'Exponential Smoothing: Metode yang memberikan bobot lebih pada data terbaru. Cocok untuk data dengan tren atau pola musiman.'
      case 'moving-average':
        return 'Moving Average: Metode rata-rata bergerak yang menghitung rata-rata dari beberapa periode terakhir. Cocok untuk data yang stabil.'
      case 'linear-trend':
        return 'Linear Trend: Metode garis lurus yang menunjukkan kecenderungan umum data. Cocok untuk data dengan tren naik/turun stabil.'
      default:
        return ''
    }
  }

  const getValueColumnDescription = (v: string) => {
    switch(v) {
      case 'estimated_duration':
        return 'Waktu Pengiriman (menit)'
      case 'distance_km':
        return 'Jarak Pengiriman (km)'
      case 'delay_min':
        return 'Keterlambatan (menit)'
      case 'hour':
        return 'Jam Pemesanan'
      default:
        return v.replace(/_/g, ' ')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80 text-lg">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="text-white p-6 md:p-8" style={{ background: 'linear-gradient(135deg, rgb(72, 148, 199) 0%, rgb(70, 147, 198) 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            Forecasting (Prediksi)
          </h1>
          <p className="mt-2 text-xs md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Prediksi data masa depan berdasarkan data historis - mudah dipahami!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {dataSummary && dataSummary.total_orders && dataSummary.total_orders > 0 ? (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Pengaturan Prediksi
                    </CardTitle>
                    <CardDescription>Pilih parameter untuk menghitung prediksi</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowHelp(!showHelp)}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {showHelp ? 'Sembunyikan' : 'Bantuan'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showHelp && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">📖 Apa itu Forecasting?</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Forecasting adalah teknik untuk memprediksi nilai di masa depan berdasarkan data di masa lalu. 
                      Bayangkan seperti meramal cuaca - kita menggunakan data sebelumnya untuk menebak apa yang akan terjadi.
                    </p>
                    <h4 className="font-semibold text-blue-800 mb-2">🔧 Cara Menggunakan:</h4>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                      <li>Pilih <strong>"Apa yang ingin diprediksi"</strong> - misalnya waktu pengiriman atau jarak</li>
                      <li>Pilih <strong>"Metode"</strong> - cara perhitungan prediksi (lihat bantuan di bawah)</li>
                      <li>Pilih <strong>"Berapa lama ke depan"</strong> - berapa periode yang ingin diprediksi</li>
                      <li>Klik <strong>"Hitung Prediksi"</strong></li>
                    </ol>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Apa yang ingin diprediksi?</label>
                    <Select value={valueColumn} onValueChange={setValueColumn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimated_duration">⏱️ Waktu Pengiriman (menit)</SelectItem>
                        <SelectItem value="distance_km">📍 Jarak Pengiriman (km)</SelectItem>
                        <SelectItem value="delay_min">⏰ Keterlambatan (menit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Metode Prediksi</label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exponential-smoothing">📈 Exponential Smoothing</SelectItem>
                        <SelectItem value="moving-average">📊 Moving Average</SelectItem>
                        <SelectItem value="linear-trend">📉 Linear Trend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Berapa lama ke depan?</label>
                    <Select value={periods.toString()} onValueChange={(v) => setPeriods(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 periode</SelectItem>
                        <SelectItem value="7">7 periode</SelectItem>
                        <SelectItem value="14">14 periode</SelectItem>
                        <SelectItem value="30">30 periode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={runForecast} 
                      disabled={isCalculating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isCalculating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menghitung...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" /> Hitung Prediksi</>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    {getMethodDescription(method)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </p>
              </div>
            )}

            {result?.historical && result?.forecast && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="w-5 h-5" />
                      Grafik Prediksi - {getValueColumnDescription(valueColumn)}
                    </CardTitle>
                    <CardDescription>
                      Garis biru = data aktual | Garis hijau putus-putus = prediksi | Scroll untuk melihat lebih detail
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollableLineChart 
                      historical={result.historical} 
                      forecast={result.forecast}
                      valueColumn={valueColumn}
                    />
                    
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => downloadResult('csv')}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                      <Button variant="outline" onClick={() => downloadResult('json')}>
                        <FileJson className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        💡 Apa yang bisa disimpulkan?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 leading-relaxed">
                        {result.insights}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        🎯 Rekomendasi untuk Bisnis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 leading-relaxed">
                        {result.recommendations}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      📊 Ringkasan Data
                    </CardTitle>
                    <CardDescription>
                      Ringkasan statistik dari data historis dan hasil prediksi
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-50 rounded-xl mb-4">
                      <p className="text-sm text-slate-600">
                        <Info className="w-4 h-4 inline mr-1" />
                        <strong>Ringkasan Data</strong> menampilkan statistik penting yang membantu Anda memahami pola data secara keseluruhan. 
                        Gunakan informasi ini untuk membuat keputusan bisnis yang lebih baik.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600 font-medium">Data Historis</p>
                        <p className="text-2xl font-bold text-blue-800">{result.historical?.length || 0} periode</p>
                        <p className="text-xs text-blue-400">Jumlah periode data lampau</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-xs text-green-600 font-medium">Periode Prediksi</p>
                        <p className="text-2xl font-bold text-green-800">{result.forecast?.length || 0} periode</p>
                        <p className="text-xs text-green-400">Berapa lama ke depan</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600 font-medium">Rata-rata Aktual</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {formatValue(result.historical?.reduce((a, b) => a + b.actual, 0) / (result.historical?.length || 1) || 0)}
                        </p>
                        <p className="text-xs text-amber-400">Nilai rata-rata historis</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl">
                        <p className="text-xs text-purple-600 font-medium">Rata-rata Prediksi</p>
                        <p className="text-2xl font-bold text-purple-800">
                          {formatValue(result.forecast?.reduce((a, b) => a + b, 0) / (result.forecast?.length || 1) || 0)}
                        </p>
                        <p className="text-xs text-purple-400">Nilai prediksi rata-rata</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Belum Ada Data</h2>
            <p className="text-slate-500 mb-6">Silakan upload data terlebih dahulu di halaman Upload Data</p>
            <Button onClick={() => router.push('/upload')}>
              Upload Data
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
