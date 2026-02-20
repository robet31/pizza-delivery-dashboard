import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const users = await prisma.user.findMany({ take: 5 })
    const count = await prisma.user.count()
    const deliveryCount = await prisma.deliveryData.count()
    const restaurantCount = await prisma.restaurant.count()
    
    const html = `
<!DOCTYPE html>
<html>
<head><title>Test DB</title></head>
<body style="font-family: monospace; padding: 20px;">
  <h1>✅ Database Connected!</h1>
  <pre>
  Users: ${count}
  DeliveryData: ${deliveryCount}
  Restaurants: ${restaurantCount}
  
  Sample Users:
  ${users.map(u => `- ${u.email} (${u.role})`).join('\n  ')}
  </pre>
</body>
</html>
`
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (error: any) {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Test DB</title></head>
<body style="font-family: monospace; padding: 20px; color: red;">
  <h1>❌ Database Error!</h1>
  <pre>${error.message}</pre>
</body>
</html>
`
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  }
}
