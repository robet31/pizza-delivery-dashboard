import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    console.log('Test login attempt for:', email)

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        reason: 'User not found',
        triedEmail: email 
      })
    }

    if (!user.isActive) {
      return NextResponse.json({ 
        success: false, 
        reason: 'User not active',
        isActive: user.isActive
      })
    }

    return NextResponse.json({
      success: true,
      user: { 
        email: user.email, 
        name: user.name, 
        role: user.role,
        isActive: user.isActive
      },
      dbConnected: true
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      reason: 'Server error',
      error: error.message 
    }, { status: 500 })
  }
}
