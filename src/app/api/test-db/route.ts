import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    
    const count = await prisma.user.count()
    const deliveryCount = await prisma.deliveryData.count()
    const restaurantCount = await prisma.restaurant.count()
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      counts: {
        users: count,
        deliveryData: deliveryCount,
        restaurants: restaurantCount
      },
      recentUsers: users.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive
      })),
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      database: 'disconnected',
      error: error.message,
      code: error.code,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}
