import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET || 'fallback-dev-secret'
  return crypto.createHmac('sha256', secret).update(password).digest('hex')
}

async function main() {
  console.log('Clearing existing database tables...')
  await prisma.dependency.deleteMany()
  await prisma.clientContact.deleteMany()
  await prisma.messageLog.deleteMany()
  await prisma.inviteToken.deleteMany()
  await prisma.project.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.account.deleteMany()

  console.log('Seeding 6-month historical database...')

  // 1. Create Main Account
  const account = await prisma.account.create({
    data: {
      accountNumber: 48213,
      name: 'Opositive Agency',
      agencyName: 'Opositive Growth Agency',
      timezone: 'UTC',
      currency: 'USD',
    },
  })

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@opositive.agency',
      name: 'Agency Admin',
      passwordHash: hashPassword('Admin@1234'),
    },
  })

  const alice = await prisma.user.create({
    data: {
      email: 'alice@opositive.agency',
      name: 'Alice Johnson (AM)',
      passwordHash: hashPassword('Alice@1234'),
    },
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@opositive.agency',
      name: 'Bob Smith (AM)',
      passwordHash: hashPassword('Bob@1234'),
    },
  })

  // 3. Create Memberships
  await prisma.membership.createMany({
    data: [
      { accountId: account.id, userId: admin.id, role: 'admin' },
      { accountId: account.id, userId: alice.id, role: 'am' },
      { accountId: account.id, userId: bob.id, role: 'am' },
    ],
  })

  // Helpers for 6-month dates (180 days)
  const DAY = 864e5
  const now = Date.now()
  const d = (n: number | null) => (n == null ? null : new Date(now - n * DAY))

  const tk = (
    title: string,
    category: string,
    priority: string,
    score: number,
    up: number,
    status: string,
    createdDaysAgo: number,
    startedDaysAgo: number | null,
    qcDaysAgo: number | null,
    closedDaysAgo: number | null,
    dueDaysAgo: number | null,
    reworkCount: number,
    desc: string,
    imp: string
  ) => ({
    title,
    category,
    priority,
    impactScore: score,
    estimatedUpliftPct: up,
    status,
    reworkCount,
    description: desc,
    impactIfDelayed: imp,
    createdAt: d(createdDaysAgo) || new Date(),
    startedAt: d(startedDaysAgo),
    qcAt: d(qcDaysAgo),
    closedAt: d(closedDaysAgo),
    dueDate: d(dueDaysAgo),
  })

  // 4. Create 3 Active Projects Running over 6 Months
  const p1 = await prisma.project.create({
    data: {
      accountId: account.id,
      projectNumber: 903112,
      clientName: 'Northwind Store',
      name: 'Ecommerce Organic & CRO Retainer',
      type: 'Ecommerce',
      category: 'SEO',
      status: 'active',
      projectToken: 'nw7Kq2xV9d',
      accountManagerId: alice.id,
      primaryColor: '#2563eb',
      dependencies: {
        create: [
          // Month 1-2 (Older closed tasks)
          tk('Compress homepage & catalog hero WebP images', 'Tech', 'high', 4, 3.5, 'closed', 170, 168, 162, 160, 165, 0, 'Swap oversized PNGs with compressed WebP assets.', 'LCP score stuck at 4.2s on mobile.'),
          tk('Fix canonical tags across 40+ category pages', 'SEO', 'high', 5, 6.0, 'closed', 155, 150, 145, 142, 148, 1, 'Ensure self-referencing canonicals exist on all paginated pages.', 'Duplicate content is diluting category rankings.'),
          tk('Setup GA4 ecommerce conversion tracking', 'Tech', 'medium', 3, 2.0, 'closed', 140, 138, 132, 130, 135, 0, 'Verify purchase event telemetry payload.', 'Missing conversion attribution on paid campaigns.'),
          tk('Redesign PDP sticky Buy button for mobile', 'CRO', 'high', 4, 4.5, 'closed', 125, 120, 115, 112, 118, 0, 'Add sticky bottom purchase bar on mobile PDP templates.', 'Mobile add-to-cart rate is 1.2% lower than desktop.'),
          
          // Month 3-4 (Mid-period closed & QC tasks)
          tk('Add Product & AggregateRating JSON-LD schema', 'SEO', 'high', 4, 4.0, 'closed', 95, 90, 85, 82, 88, 0, 'Deploy rich result markup across product catalog.', 'Competitors have star ratings in SERPs; Northwind lacks them.'),
          tk('Publish 10 targeted buyer guide articles', 'Content', 'medium', 3, 3.0, 'closed', 80, 75, 68, 65, 70, 1, 'Create high-intent top-of-funnel comparison content.', 'Missing organic search traffic for category keywords.'),
          tk('Implement 301 redirect map for discontinued SKUs', 'SEO', 'high', 5, 5.0, 'closed', 65, 60, 52, 50, 55, 0, 'Redirect 212 dead product links to relevant parent categories.', '404 errors causing crawl budget waste.'),

          // Month 5-6 (Recent pending, in_progress, and QC tasks)
          tk('Optimize Checkout One-Step UI & Field Autocomplete', 'CRO', 'high', 5, 5.5, 'in_progress', 28, 12, null, null, -4, 2, 'Simplify 3-step checkout into 1-step accordion.', '32% cart abandonment at address step.'),
          tk('Fix faceted navigation crawl budget leak', 'SEO', 'high', 5, 6.0, 'in_progress', 21, 5, null, null, -7, 0, 'Add robots noindex on multi-select filter parameters.', 'Googlebot indexing 10,000+ empty filter URLs.'),
          tk('Draft & publish Q3 seasonal sale promotional copy', 'Content', 'medium', 3, 2.5, 'qc', 18, 14, 3, null, -4, 0, 'Write landing page copy and meta banners.', 'Sale launches next week without updated SEO metadata.'),
          tk('Internal linking sprint from high-authority blog posts', 'SEO', 'medium', 3, 2.0, 'pending', 12, null, null, null, 5, 0, 'Inject contextual links into top 20 traffic blogs.', 'PageRank is trapped on blog subfolders.'),
          tk('Implement Trustpilot review widget on checkout page', 'CRO', 'low', 2, 1.5, 'pending', 6, null, null, null, 8, 0, 'Embed verified social proof badge near pay button.', 'Improves final checkout conversion confidence.'),
        ],
      },
    },
  })

  const p2 = await prisma.project.create({
    data: {
      accountId: account.id,
      projectNumber: 903113,
      clientName: 'Aster Cloud',
      name: 'B2B SaaS Technical SEO & Content Scale',
      type: 'B2B SaaS',
      category: 'Tech',
      status: 'active',
      projectToken: 'as4Tn8mW2c',
      accountManagerId: alice.id,
      primaryColor: '#7c3aed',
      dependencies: {
        create: [
          // Month 1-2
          tk('Fix staging environment robots.txt indexation leak', 'Tech', 'high', 5, 5.0, 'closed', 175, 172, 168, 165, 170, 0, 'Disallow staging domain and remove index entries.', 'Staging host ranking above production app.'),
          tk('Create Competitor vs. Aster comparison landing pages', 'SEO', 'high', 4, 4.0, 'closed', 150, 145, 140, 138, 142, 1, 'Build 4 comparison pages targeting competitor search queries.', 'High commercial intent search queries untapped.'),
          tk('Fix Google Search Console coverage errors', 'Tech', 'medium', 3, 2.0, 'closed', 135, 130, 122, 120, 125, 0, 'Clean up soft 404s and server error endpoints.', 'Googlebot encountering 500 errors on legacy API docs.'),

          // Month 3-4
          tk('Migrate blog subfolder to core domain /blog', 'Tech', 'high', 5, 7.0, 'closed', 110, 102, 95, 92, 98, 2, 'Move blog.astercloud.com to astercloud.com/blog.', 'Subdomain split authority from primary domain.'),
          tk('Deploy SoftwareApplication schema markup', 'SEO', 'medium', 3, 2.5, 'closed', 85, 80, 75, 72, 78, 0, 'Inject SaaS schema with pricing tier attributes.', 'Rich snippet missing in desktop search results.'),

          // Month 5-6
          tk('Un-noindex /docs API documentation subfolder', 'SEO', 'high', 5, 6.5, 'in_progress', 30, 15, null, null, -5, 1, 'Remove accidental header rule blocking search bots.', '4,000 developer documentation pages hidden from Google.'),
          tk('Publish 6 enterprise cloud migration case studies', 'Content', 'high', 4, 4.0, 'qc', 20, 10, 2, null, -2, 0, 'Produce downloadable PDF & HTML case studies.', 'Sales team needs proof points for enterprise deals.'),
          tk('Build interactive ROI calculator tool on pricing page', 'CRO', 'high', 4, 4.5, 'pending', 14, null, null, null, 7, 0, 'Embed JS calculator estimating monthly cloud savings.', 'High bounce rate on pricing grid.'),
          tk('Optimize Core Web Vitals (INP < 200ms)', 'Tech', 'medium', 3, 3.0, 'pending', 8, null, null, null, 10, 0, 'De-bounce heavy analytics scripts blocking main thread.', 'Mobile INP rating marked Poor in GSC.'),
        ],
      },
    },
  })

  const p3 = await prisma.project.create({
    data: {
      accountId: account.id,
      projectNumber: 903114,
      clientName: 'Pulse Health',
      name: 'HealthTech Growth & Paid Media Engine',
      type: 'HealthTech',
      category: 'PPC',
      status: 'active',
      projectToken: 'ph9Xm3kL1p',
      accountManagerId: bob.id,
      primaryColor: '#059669',
      dependencies: {
        create: [
          // Month 1-2
          tk('HIPAA compliance audit on conversion tracking scripts', 'Tech', 'high', 5, 4.0, 'closed', 165, 160, 155, 152, 158, 0, 'Audit Meta pixel & GA4 tags for PII leakage.', 'Legal requirement before scaling ad spend.'),
          tk('Redesign patient onboarding questionnaire UI', 'CRO', 'high', 4, 5.0, 'closed', 140, 132, 125, 122, 128, 1, 'Shorten 12-step form into 4 dynamic steps.', '55% drop-off rate on step 3.'),

          // Month 3-4
          tk('Launch Google Search Ads PMax campaign for telehealth', 'PPC', 'high', 5, 8.0, 'closed', 105, 98, 90, 88, 95, 0, 'Structure Performance Max campaign with custom intent signals.', 'Scaling paid patient acquisitions.'),
          tk('Publish 12 medical reviewer verified health articles', 'Content', 'medium', 3, 3.5, 'closed', 75, 70, 62, 60, 68, 0, 'Include doctor author bios & citation links.', 'E-E-A-T requirements for medical search terms.'),

          // Month 5-6
          tk('A/B test video ad creatives for Instagram & TikTok', 'Social', 'high', 4, 4.0, 'in_progress', 25, 12, null, null, -3, 0, 'Test 3 user-generated video hooks against static banners.', 'Creative fatigue increasing Cost Per Acquisition (CPA).'),
          tk('Setup automated re-engagement email sequence for lead dropouts', 'Email', 'high', 4, 3.5, 'qc', 16, 8, 3, null, -1, 0, 'Trigger 3-part email drip for uncompleted onboarding.', 'Recovering abandoned consultation signups.'),
          tk('Landing page speed optimization for paid traffic', 'Tech', 'medium', 3, 2.5, 'pending', 10, null, null, null, 6, 0, 'Inline critical CSS and lazy load video player assets.', 'Ad Quality Score affected by 3.8s page load speed.'),
          tk('Expand local SEO citations for 15 clinic locations', 'SEO', 'low', 2, 2.0, 'pending', 5, null, null, null, 12, 0, 'Sync Google Business Profiles and local directories.', 'Local pack visibility lagging in secondary markets.'),
        ],
      },
    },
  })

  // 5. Add sample message logs over the last 6 months for activity feed & comms log
  await prisma.messageLog.createMany({
    data: [
      { accountId: account.id, projectId: p1.id, channel: 'email', direction: 'outbound', fromName: 'Alice Johnson', toName: 'Northwind Team', subject: 'Monthly SEO Progress Update', body: 'We have completed the canonical fix and compressed 100+ hero images.', sentAt: d(160)! },
      { accountId: account.id, projectId: p2.id, channel: 'slack', direction: 'outbound', fromName: 'Alice Johnson', toName: '#aster-growth', subject: 'Staging Leak Resolved', body: 'Staging environment robots.txt has been disallowed and verified.', sentAt: d(110)! },
      { accountId: account.id, projectId: p3.id, channel: 'email', direction: 'outbound', fromName: 'Bob Smith', toName: 'Pulse Health Team', subject: 'PMax Campaign Launch Complete', body: 'Google Ads PMax telehealth campaign is live and generating leads.', sentAt: d(85)! },
      { accountId: account.id, projectId: p1.id, channel: 'system', direction: 'system', fromName: 'System', toName: 'Alice Johnson', subject: 'QC Submitted: Q3 Seasonal Sale Copy', body: 'Copy draft moved to QC review status.', sentAt: d(3)! },
      { accountId: account.id, projectId: p2.id, channel: 'whatsapp', direction: 'outbound', fromName: 'Alice Johnson', toName: 'Aster CTO', subject: 'Docs Un-noindex Update', body: 'Developer documentation un-noindexing in progress.', sentAt: d(1)! },
    ],
  })

  console.log('Seeding complete! 3 active projects over 6 months created successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
