import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found',
        availableEmails: await prisma.user.findMany({ select: { email: true } })
      })
    }

    const isValid = await bcrypt.compare(password, user.password)

    return NextResponse.json({
      success: isValid,
      user: { email: user.email, name: user.name, role: user.role },
      passwordHash: user.password.substring(0, 20) + '...',
      passwordLength: user.password.length
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
