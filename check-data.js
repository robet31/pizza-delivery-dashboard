const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const r = await p.restaurant.count()
  const u = await p.user.count()
  const d = await p.deliveryData.count()
  console.log('Restaurants:', r, 'Users:', u, 'DeliveryData:', d)
  await p.$disconnect()
}

check()
