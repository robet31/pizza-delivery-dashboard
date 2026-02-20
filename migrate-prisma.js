const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const SQLITE_DB = './backend-fastapi/pizza.db'

const restaurantMap = {
  'cmlkhmfwn00002shlb1bebzi7': { name: "Domino's", code: 'DOM', location: 'Jakarta' },
  'cmlkhmfwn00012shlwpdkuapt': { name: "Papa John's", code: 'PJS', location: 'Surabaya' },
  'cmlkhmfwn00022shlce12ejas': { name: 'Little Caesars', code: 'LCE', location: 'Bandung' },
  'cmlkhmfwn00032shlrtfy1kad': { name: 'Pizza Hut', code: 'PHT', location: 'Malang' },
  'cmlkhmfwn00042shlh6i6rol4': { name: "Marco's Pizza", code: 'MCP', location: 'Semarang' },
}

async function main() {
  console.log('Starting migration from Excel + SQLite...')

  // 1. Create Restaurants with correct IDs
  console.log('\n📍 Creating Restaurants...')
  for (const [id, data] of Object.entries(restaurantMap)) {
    await prisma.restaurant.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    console.log(`  ✓ ${data.name}`)
  }

  // 2. Create Users
  console.log('\n👥 Creating Users...')
  const users = [
    { email: 'admin@pizza.com', name: 'Admin Pusat', role: 'ADMIN_PUSAT', position: 'ADMIN_PUSAT', restaurantId: null },
    { email: 'gm@pizza.com', name: 'General Manager', role: 'GM', position: 'GM', restaurantId: 'cmlkhmfwn00002shlb1bebzi7' },
    { email: 'manager.dominos@pizza.com', name: 'Manager Domino', role: 'MANAGER', position: 'MANAGER', restaurantId: 'cmlkhmfwn00002shlb1bebzi7' },
    { email: 'manager.papajohns@pizza.com', name: 'Manager Papa John', role: 'MANAGER', position: 'MANAGER', restaurantId: 'cmlkhmfwn00012shlwpdkuapt' },
    { email: 'manager.little@pizza.com', name: 'Manager Little Caesars', role: 'MANAGER', position: 'MANAGER', restaurantId: 'cmlkhmfwn00022shlce12ejas' },
    { email: 'manager.pizzahut@pizza.com', name: 'Manager Pizza Hut', role: 'MANAGER', position: 'MANAGER', restaurantId: 'cmlkhmfwn00032shlrtfy1kad' },
    { email: 'manager.marcos@pizza.com', name: 'Manager Marco', role: 'MANAGER', position: 'MANAGER', restaurantId: 'cmlkhmfwn00042shlh6i6rol4' },
    { email: 'staff.dominos@pizza.com', name: 'Staff Domino', role: 'STAFF', position: 'STAFF', restaurantId: 'cmlkhmfwn00002shlb1bebzi7' },
    { email: 'staff.papajohns@pizza.com', name: 'Staff Papa John', role: 'STAFF', position: 'STAFF', restaurantId: 'cmlkhmfwn00012shlwpdkuapt' },
    { email: 'staff.little@pizza.com', name: 'Staff Little Caesars', role: 'STAFF', position: 'STAFF', restaurantId: 'cmlkhmfwn00022shlce12ejas' },
    { email: 'staff.pizzahut@pizza.com', name: 'Staff Pizza Hut', role: 'STAFF', position: 'STAFF', restaurantId: 'cmlkhmfwn00032shlrtfy1kad' },
    { email: 'staff.marcos@pizza.com', name: 'Staff Marco', role: 'STAFF', position: 'STAFF', restaurantId: 'cmlkhmfwn00042shlh6i6rol4' },
  ]

  const hashedPassword = await bcrypt.hash('password123', 10)
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: hashedPassword, isActive: true },
    })
    console.log(`  ✓ ${user.email} (${user.role})`)
  }

  // 3. Migrate DeliveryData from SQLite
  console.log('\n📦 Migrating DeliveryData from SQLite...')
  const db = Database(SQLITE_DB)
  
  const orders = db.prepare(`
    SELECT * FROM DeliveryData
  `).all()

  console.log(`  Found ${orders.length} orders in SQLite`)

  // Clear existing data and re-migrate
  await prisma.deliveryData.deleteMany()
  console.log('  Cleared existing data')

  const dataToInsert = orders.map(order => ({
    id: order.id,
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    location: order.location,
    orderTime: new Date(order.orderTime),
    deliveryTime: new Date(order.deliveryTime),
    deliveryDuration: order.deliveryDuration,
    orderMonth: order.orderMonth,
    orderHour: order.orderHour,
    pizzaSize: order.pizzaSize,
    pizzaType: order.pizzaType,
    toppingsCount: order.toppingsCount,
    pizzaComplexity: order.pizzaComplexity,
    toppingDensity: order.toppingDensity,
    distanceKm: order.distanceKm,
    trafficLevel: order.trafficLevel,
    trafficImpact: order.trafficImpact,
    isPeakHour: Boolean(order.isPeakHour),
    isWeekend: Boolean(order.isWeekend),
    paymentMethod: order.paymentMethod,
    paymentCategory: order.paymentCategory,
    estimatedDuration: order.estimatedDuration,
    deliveryEfficiency: order.deliveryEfficiency,
    delayMin: order.delayMin,
    isDelayed: Boolean(order.isDelayed),
    restaurantAvgTime: order.restaurantAvgTime,
    uploadedBy: order.uploadedBy || 'system',
    uploadedAt: new Date(order.uploadedAt),
    validatedAt: order.validatedAt ? new Date(order.validatedAt) : null,
    validatedBy: order.validatedBy,
    qualityScore: order.qualityScore,
    version: order.version,
  }))

  // Batch insert in chunks
  const chunkSize = 500
  for (let i = 0; i < dataToInsert.length; i += chunkSize) {
    const chunk = dataToInsert.slice(i, i + chunkSize)
    await prisma.deliveryData.createMany({ data: chunk })
    console.log(`  ✓ Migrated ${Math.min(i + chunkSize, dataToInsert.length)}/${dataToInsert.length}`)
  }

  db.close()

  // Verify
  const [rCount, uCount, dCount] = await Promise.all([
    prisma.restaurant.count(),
    prisma.user.count(),
    prisma.deliveryData.count(),
  ])

  console.log('\n✅ Migration Complete!')
  console.log(`   Restaurants: ${rCount}`)
  console.log(`   Users: ${uCount}`)
  console.log(`   DeliveryData: ${dCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
