const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing user passwords...')
  
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Update all users with the same password
  const users = await prisma.user.findMany()
  
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })
    console.log(`✓ Fixed password for ${user.email}`)
  }
  
  console.log('\n✅ All passwords fixed!')
  console.log(`   Password: ${password}`)
  console.log(`   Hash: ${hashedPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
