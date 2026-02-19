'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sparkles,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Tag,
  TrendingUp,
  Package,
  HelpCircle,
  Info,
  Star,
  Clock,
  ArrowRight,
  Lightbulb,
  Target,
  BarChart3,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RecommendationResult {
  success?: boolean
  recommendations?: {
    popular_items?: any[]
    by_category?: any[]
    frequently_bought_together?: any[]
    trending?: any[]
  }
  error?: string
}

interface DataSummary {
  success?: boolean
  total_orders?: number
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316']

export default function RecommendationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('popular')
  const [showHelp, setShowHelp] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

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

  const runRecommendation = async () => {
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
      formData.append('item_column', 'pizza_type')
      formData.append('category_column', 'pizza_size')
      formData.append('order_id_column', 'order_id')
      formData.append('date_column', 'order_date')
      formData.append('n', '10')

      const recommendRes = await fetch('/api/v1/recommendation/all-methods', {
        method: 'POST',
        body: formData,
      })
      const recommendData = await recommendRes.json()
      setResult(recommendData)
    } catch (err) {
      setError('Gagal menghitung rekomendasi')
    } finally {
      setIsCalculating(false)
    }
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

  const popularItems = result?.recommendations?.popular_items || []
  const categoryItems = result?.recommendations?.by_category || []
  const boughtTogether = result?.recommendations?.frequently_bought_together || []
  const trendingItems = result?.recommendations?.trending || []

  const getInsightSummary = () => {
    if (!result?.recommendations) return null
    
    const insights: string[] = []
    
    if (popularItems.length > 0) {
      const topItem = popularItems[0]
      insights.push(`🔥 "${topItem.item}" adalah produk TERLARIS dengan ${topItem.percentage}% dari total pesanan.`)
    }
    
    if (trendingItems.length > 0) {
      const topTrending = trendingItems[0]
      if (topTrending.trend > 0) {
        insights.push(`📈 "${topTrending.item}" sedang TRENDING dengan peningkatan ${(topTrending.trend * 100).toFixed(1)}%!`)
      }
    }
    
    if (boughtTogether.length > 0) {
      const topPair = boughtTogether[0]
      insights.push(`🛒 Pelanggan sering memesan "${topPair.item1}" dan "${topPair.item2}" bersamaan (${topPair.count}x).`)
    }
    
    return insights
  }

  const insights = getInsightSummary()

  const comparisonContent = (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Perbandingan: Forecasting vs Rekomendasi
          </CardTitle>
          <CardDescription>
            Memahami perbedaan dan hubungan antara kedua fitur analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                🔮 Forecasting (Prediksi)
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p><strong>Apa:</strong> Memprediksi nilai numerik di masa depan</p>
                <p><strong>Contoh:</strong> Waktu pengiriman, jarak, keterlambatan</p>
                <p><strong>Guna:</strong> Perencanaan sumber daya & operasional</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>🔧 Prediksi berapa banyak driver dibutuhkan</li>
                  <li>📦 Planning inventory bahan baku</li>
                  <li>⏰ Estimasi waktu pengiriman ke pelanggan</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-xl">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                ⭐ Rekomendasi
              </h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Apa:</strong> Menemukan pola & tren produk</p>
                <p><strong>Contoh:</strong> Produk populer, combo, tren</p>
                <p><strong>Guna:</strong> Strategi marketing & penjualan</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>🎯 Mana produk yang harus dipromosikan</li>
                  <li>🛒 Paket combo apa yang menguntungkan</li>
                  <li>📈 Produk apa yang lagi naik tren</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              💡 Bagaimana Menggunakan Keduanya Secara Bersama?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-amber-700">
              <div className="p-3 bg-white rounded-lg">
                <p className="font-semibold mb-1">1. Gunakan Forecasting untuk:</p>
                <p>Memperkirakan berapa banyak pesanan (kuantitas) di periode mendatang</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="font-semibold mb-1">2. Gunakan Rekomendasi untuk:</p>
                <p>Menentukan produk APA yang akan dijual (kualitas & variasi)</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="font-semibold mb-1">3. Kombinasikan untuk:</p>
                <p>Strategi bisnis optimal: cukup stok, tepat produk, maksimal keuntungan!</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/forecasting">
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <TrendingUp className="w-4 h-4 mr-2" />
                Buka Forecasting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="text-white p-6 md:p-8" style={{ background: 'linear-gradient(135deg, rgb(72, 148, 199) 0%, rgb(70, 147, 198) 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            Sistem Rekomendasi
          </h1>
          <p className="mt-2 text-xs md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Temukan produk populer, tren, dan kombinasi terbaik untuk meningkatkan penjualan
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {dataSummary && dataSummary.total_orders && dataSummary.total_orders > 0 ? (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Analisis Rekomendasi
                    </CardTitle>
                    <CardDescription>Klik tombol di bawah untuk menghitung rekomendasi berdasarkan data Anda</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowComparison(!showComparison)}
                      className={showComparison ? "bg-purple-50" : ""}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {showComparison ? 'Sembunyikan' : 'Bandingkan'} dengan Forecasting
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowHelp(!showHelp)}
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      {showHelp ? 'Sembunyikan' : 'Bantuan'}
                    </Button>
                    <Button 
                      onClick={runRecommendation}
                      disabled={isCalculating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isCalculating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menghitung...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> Hitung Rekomendasi</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {showHelp && (
                <CardContent>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">📖 Apa itu Sistem Rekomendasi?</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Sistem rekomendasi membantu Anda memahami perilaku pelanggan dan menemukan peluang untuk meningkatkan penjualan.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                      <div>
                        <h5 className="font-semibold mb-1">🔥 Produk Populer</h5>
                        <p>Produk yang paling banyak dipesan - fokus promosikan ini!</p>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-1">📦 Kategori</h5>
                        <p>Produk favorit berdasarkan ukuran/katagori pizza.</p>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-1">🛒 Beli Bersama</h5>
                        <p>Kombinasi produk yang sering dipesan bersamaan - buat paket combo!</p>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-1">📈 Sedang Tren</h5>
                        <p>Produk yang sedang naik popularitasnya - peluang besar!</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {showComparison && comparisonContent}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </p>
              </div>
            )}

            {result?.recommendations && (
              <>
                {insights && insights.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-green-50 rounded-xl border border-amber-200">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      💡 Highlights - Insights Penting
                    </h4>
                    <div className="space-y-2">
                      {insights.map((insight, i) => (
                        <p key={i} className="text-slate-700">{insight}</p>
                      ))}
                    </div>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Hasil Rekomendasi
                    </CardTitle>
                    <CardDescription>
                      Klik setiap tab untuk melihat analisis berbeda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="popular">🔥 Populer</TabsTrigger>
                        <TabsTrigger value="category">📦 Kategori</TabsTrigger>
                        <TabsTrigger value="together">🛒 Beli Bersama</TabsTrigger>
                        <TabsTrigger value="trending">📈 Tren</TabsTrigger>
                      </TabsList>

                      <TabsContent value="popular" className="mt-6">
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <strong>Produk Populer</strong> adalah produk yang PALING BANYAK dipesan. 
                            Ini menunjukkan apa yang paling dicari pelanggan - jadi pastikan stok selalu ada!
                          </p>
                        </div>
                        
                        {popularItems.length > 0 ? (
                          <div className="space-y-3">
                            {popularItems.map((item, i) => (
                              <div 
                                key={i}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border-l-4"
                                style={{ borderLeftColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                  >
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg text-slate-800">{item.item}</p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                      <ShoppingCart className="w-3 h-3" />
                                      {item.order_count} pesanan
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                    {item.percentage}%
                                  </p>
                                  <p className="text-xs text-slate-500">dari total pesanan</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada data</p>
                          </div>
                        )}
                        
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            🎯 Rekomendasi Bisnis:
                          </h5>
                          <ul className="text-sm text-green-700 space-y-1">
                            <li>• Pastikan stok bahan untuk produk paling populer selalu tersedia</li>
                            <li>• Buat promo bundle dengan produk populer sebagai utama</li>
                            <li>• Fokus marketing pada produk ranking 1-3</li>
                            <li>• Kombinasikan dengan data forecasting untuk预测 kebutuhan stok</li>
                          </ul>
                        </div>
                      </TabsContent>

                      <TabsContent value="category" className="mt-6">
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-700 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <strong>Analisis per Kategori</strong> membantu Anda melihat preferensi pelanggan berdasarkan UKURAN pizza. 
                            Ukuran mana yang paling banyak diminta?
                          </p>
                        </div>
                        
                        {categoryItems.length > 0 ? (
                          <div className="space-y-4">
                            {Object.entries(
                              categoryItems.reduce((acc: any, item: any) => {
                                if (!acc[item.category]) acc[item.category] = []
                                acc[item.category].push(item)
                                return acc
                              }, {})
                            ).map(([category, items]: [string, any], idx) => (
                              <div key={category} className="p-4 bg-slate-50 rounded-xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                  <Tag className="w-4 h-4" />
                                  📦 {category}
                                  <span className="text-sm font-normal text-slate-500">
                                    ({items.reduce((a: number, b: any) => a + b.order_count, 0)} pesanan)
                                  </span>
                                </h3>
                                <div className="space-y-2">
                                  {items.slice(0, 5).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                                      <span className="font-medium">{item.item}</span>
                                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                                        <ShoppingCart className="w-3 h-3" />
                                        {item.order_count}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada data kategori</p>
                          </div>
                        )}
                        
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            🎯 Rekomendasi Bisnis:
                          </h5>
                          <ul className="text-sm text-green-700 space-y-1">
                            <li>• Sesuaikan stok bahan berdasarkan ukuran yang paling populer</li>
                            <li>• Buat promo berbeda untuk setiap kategori</li>
                            <li>• Pertimbangkan untuk menambah varian rasa di kategori populer</li>
                          </ul>
                        </div>
                      </TabsContent>

                      <TabsContent value="together" className="mt-6">
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <strong>Produk Beli Bersama</strong> adalah pasangan produk yang sering dipesan BERDAMPINGAN. 
                            Ini adalah kesempatan emas untuk membuat PAKET COMBO yang menguntungkan!
                          </p>
                        </div>
                        
                        {boughtTogether.length > 0 ? (
                          <div className="space-y-3">
                            {boughtTogether.map((pair, i) => (
                              <div 
                                key={i}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border-l-4 border-green-500"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <ShoppingCart className="w-6 h-6 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg text-slate-800">{pair.item1}</p>
                                    <p className="text-sm text-slate-500">+ {pair.item2}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-bold text-green-600">{pair.count}x</p>
                                  <p className="text-xs text-slate-500">dipesanan bersamaan</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada data</p>
                          </div>
                        )}
                        
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            🎯 Rekomendasi Bisnis:
                          </h5>
                          <ul className="text-sm text-green-700 space-y-1">
                            <li>• Buat paket combo dari pasangan produk yang sering dibeli bersamaan</li>
                            <li>• Tawarkan diskon untuk paket combo (misal: beli 2 gratis 1)</li>
                            <li>• Pasang rekomendasi "Customers also bought" di halaman checkout</li>
                          </ul>
                        </div>
                      </TabsContent>

                      <TabsContent value="trending" className="mt-6">
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-700 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <strong>Produk Tren</strong> adalah produk yang SEDANG NAIK popularitasnya dalam waktu terakhir. 
                            Ini adalah PELUANG BESAR yang harus dimanfaatkan sekarang juga!
                          </p>
                        </div>
                        
                        {trendingItems.length > 0 ? (
                          <div className="space-y-3">
                            {trendingItems.map((item, i) => (
                              <div 
                                key={i}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border-l-4 border-purple-500"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg text-slate-800">{item.item}</p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {item.recent_count} pesanan terbaru
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-3xl font-bold ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.trend >= 0 ? '+' : ''}{(item.trend * 100).toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.trend >= 0 ? 'meningkat' : 'menurun'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada data tren</p>
                          </div>
                        )}
                        
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            🎯 Rekomendasi Bisnis:
                          </h5>
                          <ul className="text-sm text-green-700 space-y-1">
                            <li>• Manfaatkan momentum tren dengan membuat promo khusus produk trending</li>
                            <li>• Tingkatkan stok untuk produk yang sedang naik tren</li>
                            <li>• Rencanakan kampanye marketing untuk produk dengan tren positif</li>
                          </ul>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
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
