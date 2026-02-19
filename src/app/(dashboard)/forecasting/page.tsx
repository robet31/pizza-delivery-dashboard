'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp,
  Loader2,
  AlertCircle,
  Info,
  RefreshCw,
  Settings,
  HelpCircle,
  Download,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  TrendingDown,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  ComposedChart,
  Brush
} from 'recharts'

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

interface ChartDataPoint {
  name: string
  Aktual: number
  Prediksi: number | null
  isForecast?: boolean
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

        // Calculate yearly/monthly breakdown
        const periodGroups: { [key: string]: { actual: number[]; forecast: number[] } } = {}
        forecastData.historical.forEach((h: { date: string; actual: number }, i: number) => {
          const period = h.date.substring(0, 7) // Get YYYY-MM
          if (!periodGroups[period]) periodGroups[period] = { actual: [], forecast: [] }
          periodGroups[period].actual.push(h.actual)
        })
        
        let periodInsights = '\n\n📅 Analisis per Periode:\n'
        const sortedPeriods = Object.keys(periodGroups).sort()
        sortedPeriods.forEach(period => {
          const avgActual = periodGroups[period].actual.reduce((a, b) => a + b, 0) / periodGroups[period].actual.length
          periodInsights += `- ${period}: Rata-rata ${formatValue(avgActual)}\n`
        })

        let insights = `Berdasarkan data historis selama ${forecastData.historical.length} periode, rata-rata nilai ${valueColumn.replace(/_/g, ' ')} adalah ${formatValue(avgHistorical)}. `
        insights += `Prediksi untuk ${forecastData.forecast.length} periode ke depan menunjukkan rata-rata ${formatValue(avgForecast)}. `
        insights += trendDesc
        insights += periodInsights

        let recommendations = ''
        if (valueColumn.includes('duration') || valueColumn.includes('time')) {
          if (change > 10) {
            recommendations = '🚨 WARNING: Prediksi menunjukkan KENAIKAN signifikan pada waktu pengiriman! Segera:\n' +
              '1. Tambah driver/motor pengirim\n' +
              '2. Optimalkan rute delivery dengan GPS\n' +
              '3. Siapkan driver cadangan untuk jam sibuk\n' +
              '4. Koordinasi dengan kitchen untuk faster preparation'
          } else if (change > 5) {
            recommendations = '⚠️ Peringatan: Waktu pengiriman diprediksi naik. Pertimbangkan:\n' +
              '1. Menambah driver di jam sibuk\n' +
              '2. Memperbaiki packing process\n' +
              '3. Monitoring order queue lebih ketat'
          } else if (change < -5) {
            recommendations = '✅ Baik: Waktu pengiriman diprediksi lebih cepat! Pertahankan dengan:\n' +
              '1. Catat best practices yang sudah diterapkan\n' +
              '2. Training driver untuk efficiency\n' +
              '3. Maintain rute optimal'
          } else {
            recommendations = '✅ Stabil: Waktu pengiriman diprediksi tetap stabil. Lanjutkan:\n' +
              '1. Monitoring regularity\n' +
              '2. Jaga quality service\n' +
              '3. Persiapkan contingency plan jika needed'
          }
        } else if (valueColumn.includes('distance')) {
          if (change > 10) {
            recommendations = '🚨 WARNING: Jarak pengiriman diprediksi NAIK signifikan! Pertimbangkan:\n' +
              '1. Tambah outlet/gerai baru\n' +
              '2. Promo untuk area dekat outlet\n' +
              '3. Optimasi zona delivery'
          } else if (change > 5) {
            recommendations = '⚠️ Peringatan: Jarak pengiriman meningkat. Evaluasi:\n' +
              '1. Strategi marketing per area\n' +
              '2. Penyesuaian ongkir'
          } else {
            recommendations = '✅ Jarak pengiriman stabil. Tingkatkan:\n' +
              '1. Customer di area dekat outlet\n' +
              '2. Delivery efficiency'
          }
        } else if (valueColumn.includes('delay')) {
          if (change > 10) {
            recommendations = '🚨 WARNING: Keterlambatan diprediksi NAIK tajam! Segera:\n' +
              '1. Investigasi root cause\n' +
              '2. Tambah staff kitchen\n' +
              '3. Perbaiki quality control'
          } else if (change > 5) {
            recommendations = '⚠️ Warning: Keterlambatan meningkat. Evaluasi:\n' +
              '1. Proses preparation\n' +
              '2. Staffing schedule'
          } else {
            recommendations = '✅ Keterlambatan terkontrol. Jaga performa!'
          }
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

  const getChartData = (): ChartDataPoint[] => {
    if (!result?.historical || !result?.forecast) return []
    
    const data: ChartDataPoint[] = result.historical.map((h, i) => ({
      name: h.date,
      Aktual: h.actual,
      Prediksi: h.forecast
    }))
    
    result.forecast.forEach((f, i) => {
      data.push({
        name: `Prediksi ${i + 1}`,
        Aktual: 0,
        Prediksi: f,
        isForecast: true
      })
    })
    
    return data
  }

  const getTrend = () => {
    if (!result?.historical || !result?.forecast) return null
    const lastActual = result.historical[result.historical.length - 1]?.actual || 0
    const lastForecast = result.forecast[result.forecast.length - 1] || 0
    const diff = lastForecast - lastActual
    const percentChange = (diff / lastActual) * 100
    
    if (Math.abs(percentChange) < 5) return { status: 'stabil', color: '#64748b', icon: Minus, text: 'Stabil' }
    if (percentChange > 0) return { status: 'naik', color: '#10b981', icon: TrendingUp, text: 'Naik' }
    return { status: 'turun', color: '#ef4444', icon: TrendingDown, text: 'Turun' }
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

  const chartData = getChartData()
  const trend = getTrend()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="text-white p-6 md:p-8" style={{ background: 'linear-gradient(135deg, rgb(72, 148, 199) 0%, rgb(70, 147, 198) 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7" />
            </div>
            Forecasting (Prediksi)
          </h1>
          <p className="mt-3 text-lg md:text-xl" style={{ color: 'rgba(255,255,255,0.9)' }}>
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
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Pengaturan Prediksi
                    </CardTitle>
                    <CardDescription className="text-base">Pilih parameter untuk menghitung prediksi</CardDescription>
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
                    </p>
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
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      Grafik Perbandingan - {getValueColumnDescription(valueColumn)}
                    </CardTitle>
                    <CardDescription className="text-base">
                      Bandingkan data aktual dengan hasil prediksi - lihat trennya langsung!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[500px] overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            interval={0}
                            height={60}
                          />
                          <YAxis 
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              padding: '12px'
                            }}
                            formatter={(value, name) => {
                              const numVal = Number(value)
                              if (name === 'Aktual') {
                                return [numVal > 0 ? formatValue(numVal) : '-', '📊 Data Aktual (Dari Database)']
                              } else {
                                return [numVal > 0 ? formatValue(numVal) : '-', '🔮 Hasil Prediksi']
                              }
                            }}
                            labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '8px' }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value: string) => (
                              <span style={{ color: '#334155', fontWeight: 500 }}>
                                {value === 'Aktual' ? '📊 Data Aktual (Histor)' : '🔮 Hasil Prediksi'}
                              </span>
                            )}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Aktual" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorActual)"
                            name="Aktual"
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 3, fill: '#fff' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Prediksi" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            strokeDasharray="8 4"
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 6, stroke: '#fff' }}
                            activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 3, fill: '#fff' }}
                            name="Prediksi"
                            connectNulls
                          />
                          <Brush 
                            dataKey="name" 
                            height={40}
                            stroke="#3b82f6"
                            fill="#f1f5f9"
                            tickFormatter={(value) => value.length > 8 ? value.substring(0, 6) + '..' : value}
                            startIndex={Math.max(0, chartData.length - 15)}
                            endIndex={chartData.length - 1}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {trend && (
                      <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-lg">
                        <trend.icon className="w-5 h-5" style={{ color: trend.color }} />
                        <span className="font-medium" style={{ color: trend.color }}>
                          Tren: {trend.text}
                        </span>
                        <span className="text-slate-500">
                          (Perbandingan data terakhir aktual vs prediksi)
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-6">
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
                    <CardDescription className="text-base">
                      Ringkasan statistik dari data historis dan hasil prediksi
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-50 rounded-xl mb-4">
                      <p className="text-sm text-slate-600">
                        <Info className="w-4 h-4 inline mr-1" />
                        <strong>Ringkasan Data</strong> menampilkan statistik penting yang membantu Anda memahami pola data secara keseluruhan.
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
