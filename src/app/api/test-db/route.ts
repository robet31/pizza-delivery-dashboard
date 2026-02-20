import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true, isActive: true },
      take: 5
    })
    
    const count = await prisma.user.count()
    const deliveryCount = await prisma.deliveryData.count()
    
    return NextResponse.json({
      success: true,
      users,
      totalUsers: count,
      totalDeliveryData: deliveryCount,
      message: 'Database connection OK'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
