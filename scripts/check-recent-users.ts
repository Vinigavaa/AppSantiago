import { prisma } from "@santiago/database"

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      email: true,
      emailVerified: true,
      role: true,
      createdAt: true,
    },
  })
  console.log(JSON.stringify(users, null, 2))
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
