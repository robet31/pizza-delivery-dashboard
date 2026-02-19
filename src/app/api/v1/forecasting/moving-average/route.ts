import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const data: any[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })
    data.push(row)
  }
  
  return data
}

function movingAverage(data: number[], window: number = 3, periods: number = 7): number[] {
  if (data.length < window) {
    return Array(periods).fill(data.reduce((a, b) => a + b, 0) / data.length)
  }
  
  const forecasts: number[] = []
  const paddedData = [...data]
  
  for (let i = 0; i < periods; i++) {
    const windowData = paddedData.slice(-window)
    const avg = windowData.reduce((a, b) => a + b, 0) / windowData.length
    forecasts.push(avg)
    paddedData.push(avg)
  }
  
  return forecasts
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const dateColumn = formData.get('date_column') as string || 'order_date'
    const valueColumn = formData.get('value_column') as string || 'estimated_duration'
    const periods = parseInt(formData.get('periods') as string || '7')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const csvData = parseCSV(text)

    if (csvData.length === 0) {
      return NextResponse.json({ error: 'No data in file' }, { status: 400 })
    }

    const dateKey = Object.keys(csvData[0]).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('month')) || dateColumn
    const valueKey = Object.keys(csvData[0]).find(k => k.toLowerCase().includes(valueColumn.toLowerCase())) || valueColumn

    const groupedData: { [key: string]: number } = {}
    csvData.forEach(row => {
      const dateVal = row[dateKey] || row[dateColumn] || ''
      const valueVal = parseFloat(row[valueKey] || row[valueColumn] || '0') || 0
      if (dateVal) {
        if (!groupedData[dateVal]) {
          groupedData[dateVal] = 0
        }
        groupedData[dateVal] += valueVal
      }
    })

    const sortedDates = Object.keys(groupedData).sort()
    const timeSeriesData = sortedDates.map(date => groupedData[date])

    if (timeSeriesData.length < 3) {
      return NextResponse.json({ 
        success: false,
        error: 'Minimal 3 data point diperlukan untuk forecasting' 
      })
    }

    const forecast = movingAverage(timeSeriesData, 3, periods)

    const historical = sortedDates.map((date, i) => {
      let forecastVal = timeSeriesData[i]
      if (i >= 3) {
        const window = timeSeriesData.slice(Math.max(0, i - 3), i)
        forecastVal = window.reduce((a, b) => a + b, 0) / window.length
      }
      return {
        date,
        actual: timeSeriesData[i],
        forecast: forecastVal
      }
    })

    return NextResponse.json({
      success: true,
      method: 'Moving Average',
      historical,
      forecast,
      periods
    })
  } catch (error) {
    console.error('Forecasting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
