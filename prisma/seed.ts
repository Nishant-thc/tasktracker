import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.dependency.deleteMany()
  await prisma.clientContact.deleteMany()
  await prisma.project.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.account.deleteMany()

  console.log('Seeding database...')

  // 1. Create Account
  const account = await prisma.account.create({
    data: {
      accountNumber: 48213,
      name: 'Opositive',
      timezone: 'UTC',
      currency: 'USD',
    },
  })

  // 2. Create Agency User
  const agencyUser = await prisma.user.create({
    data: {
      email: 'admin@opositive.agency',
      name: 'Agency Admin',
    },
  })

  // 3. Create Membership
  await prisma.membership.create({
    data: {
      accountId: account.id,
      userId: agencyUser.id,
      role: 'owner',
    },
  })

  // Helper for dates
  const DAY = 864e5
  const now = Date.now()
  const d = (n: number | null) => (n == null ? null : new Date(now - n * DAY))

  // Helper for task creation
  const tk = (
    title: string,
    pri: string,
    score: number,
    up: number,
    status: string,
    c: number,
    s: number | null,
    q: number | null,
    cl: number | null,
    due: number | null,
    desc: string,
    imp: string,
    links: string[]
  ) => {
    return {
      title,
      priority: pri,
      impactScore: score,
      estimatedUpliftPct: up,
      status,
      description: desc,
      impactIfDelayed: imp,
      links: JSON.stringify(links),
      createdAt: d(c) || new Date(),
      startedAt: d(s),
      qcAt: d(q),
      closedAt: d(cl),
      dueDate: d(due),
    }
  }

  // 4. Create Projects & Dependencies
  const projectsData = [
    {
      clientName: 'Northwind Store',
      name: 'SEO implementation',
      type: 'Ecommerce',
      projectToken: 'nw7Kq2xV9d',
      tasks: [
        tk('Fix canonical tags on category pages', 'high', 5, 6, 'in_progress', 24, 5, null, null, -3, 'Add self-referencing canonicals on every /category/ URL, as listed in the audit sheet.', 'Duplicate content is splitting ranking signals across 40+ category pages.', ['https://docs.google.com/spreadsheets/audit-sheet']),
        tk('Redirect map for retired product URLs', 'high', 5, 5, 'pending', 21, null, null, null, -7, 'Apply the 301 redirect map for the 212 discontinued product URLs.', 'Old URLs return 404s and lose the backlinks pointing at them.', ['https://drive.google.com/redirect-map']),
        tk('Add Product and Review schema', 'high', 4, 4, 'qc', 18, 14, 3, null, -4, 'Deploy the JSON-LD template on all product templates.', 'Missing rich results lower click-through on 200+ product pages.', ['https://drive.google.com/schema-template']),
        tk('Link top 15 blog posts to money pages', 'medium', 3, 2, 'pending', 12, null, null, null, null, 'Add the contextual links from the sheet into the 15 highest-traffic blog posts.', 'Link equity is not reaching the pages that convert.', []),
        tk('Publish FAQ copy on 5 service pages', 'low', 2, 1, 'pending', 6, null, null, null, 8, 'Upload the approved FAQ copy to the CMS.', 'Misses FAQ rich results and AI answer coverage.', []),
        tk('Compress homepage hero images', 'high', 4, 3, 'closed', 34, 31, 27, 25, 26, 'Swap in the optimised WebP files from the shared folder.', 'LCP was 4.1s, hurting Core Web Vitals on mobile.', []),
        tk('Add hreflang for UK and US stores', 'medium', 3, 2, 'closed', 28, 23, 18, 16, 15, 'Implement hreflang pairs across both storefronts.', 'Wrong regional page was ranking in UK results.', []),
      ]
    },
    {
      clientName: 'Aster Cloud',
      name: 'Technical SEO retainer',
      type: 'B2B SaaS',
      projectToken: 'as4Tn8mW2c',
      tasks: [
        tk('Fix indexation of the /docs subfolder', 'high', 5, 6, 'in_progress', 16, 6, null, null, -4, 'Remove the noindex header from docs templates and resubmit the sitemap.', 'Documentation pages that answer buyer questions are not appearing in search.', []),
        tk('Consolidate duplicate pricing URLs', 'high', 4, 4, 'pending', 5, null, null, null, 5, 'Redirect /pricing-old and /plans to /pricing.', 'Pricing traffic is split across three URLs.', []),
        tk('Add comparison page templates', 'medium', 4, 4, 'pending', 10, null, null, null, -2, 'Build the vs-competitor template from the design file.', 'No page targets high-intent comparison searches.', []),
        tk('Add SoftwareApplication schema', 'medium', 3, 2, 'qc', 14, 10, 2, null, null, 'Deploy Organization and SoftwareApplication JSON-LD.', 'Product details are missing from rich results.', []),
        tk('Close the staging robots.txt leak', 'high', 4, 3, 'closed', 30, 29, 27, 26, 26, 'Block staging hostnames and remove indexed URLs.', 'Staging pages were competing with production.', []),
        tk('Add demo CTA tracking events', 'medium', 3, 0, 'closed', 22, 20, 15, 14, 13, 'Fire GA4 events on every demo CTA.', 'Demo conversions were not attributable to organic.', [])
      ]
    }
  ]

  let projNum = 903112
  for (const p of projectsData) {
    const project = await prisma.project.create({
      data: {
        accountId: account.id,
        projectNumber: projNum++,
        clientName: p.clientName,
        name: p.name,
        type: p.type,
        projectToken: p.projectToken,
      }
    })

    for (const t of p.tasks) {
      await prisma.dependency.create({
        data: {
          projectId: project.id,
          ...t
        }
      })
    }
  }

  console.log('Database seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
