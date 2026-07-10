/**
 * Development seed for Word of Mouth.
 *
 * Wipes the content collections and rebuilds a small but realistic travel
 * journal: one admin + one author, three countries, five cities, four people
 * (with a "met via" chain), eight published posts across 2025/2026, and one
 * draft. All writes go through Payload's Local API so validation and hooks run
 * exactly as they would in production.
 *
 * Run:
 *   DATABASE_URL=postgres://wom:wom@127.0.0.1:5432/word_of_mouth \
 *     npx pnpm@10 exec tsx scripts/seed.ts
 */
import config from '../src/payload.config'
import { getPayload } from 'payload'

const ctx = { context: { skipRevalidate: true } }

/** Build a minimal Lexical richText value from a list of paragraph strings. */
const body = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'text',
          text,
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          version: 1,
        },
      ],
    })),
  },
})

async function seed() {
  const payload = await getPayload({ config })

  // --- Wipe content in a dependency-safe order. Clear people.metVia first so
  // no person still points at a post we're about to delete. ---
  await payload.delete({ collection: 'post-views', where: { id: { exists: true } }, ...ctx })
  const existingPeople = await payload.find({ collection: 'people', limit: 1000, depth: 0 })
  for (const person of existingPeople.docs) {
    await payload.update({ collection: 'people', id: person.id, data: { metVia: null }, ...ctx })
  }
  await payload.delete({ collection: 'posts', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'people', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'cities', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'countries', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'users', where: { id: { exists: true } }, ...ctx })

  // --- Users ---
  const admin = await payload.create({
    collection: 'users',
    data: {
      name: 'Randy',
      email: 'admin@example.com',
      password: 'password',
      role: 'admin',
      bio: 'Runs Word of Mouth. Collects bar tips and the names of the people who give them.',
    },
    ...ctx,
  })

  const author = await payload.create({
    collection: 'users',
    data: {
      name: 'Mira Okafor',
      email: 'mira@example.com',
      password: 'password',
      role: 'author',
      bio: 'Writes slow travel dispatches from wherever a good recommendation lands her.',
    },
    ...ctx,
  })

  // --- Countries ---
  const portugal = await payload.create({
    collection: 'countries',
    data: {
      name: 'Portugal',
      intro:
        'Atlantic light, tiled facades, and a coastline that keeps handing you reasons to slow down.',
    },
    ...ctx,
  })
  const japan = await payload.create({
    collection: 'countries',
    data: {
      name: 'Japan',
      intro: 'Where precision and hospitality meet — down to the way a stranger points you home.',
    },
    ...ctx,
  })
  const mexico = await payload.create({
    collection: 'countries',
    data: {
      name: 'Mexico',
      intro: 'Loud markets, quiet courtyards, and the best meals hiding one street off the map.',
    },
    ...ctx,
  })

  // --- Cities ---
  const lisbon = await payload.create({
    collection: 'cities',
    data: {
      name: 'Lisbon',
      country: portugal.id,
      intro: 'Seven hills, yellow trams, and a habit of ending the night somewhere you didn’t plan.',
    },
    ...ctx,
  })
  const porto = await payload.create({
    collection: 'cities',
    data: {
      name: 'Porto',
      country: portugal.id,
      intro: 'Granite and river fog, with cellars full of patient wine across the water.',
    },
    ...ctx,
  })
  const tokyo = await payload.create({
    collection: 'cities',
    data: {
      name: 'Tokyo',
      country: japan.id,
      intro: 'A city of thresholds — each alley a different rulebook, each counter a small world.',
    },
    ...ctx,
  })
  const kyoto = await payload.create({
    collection: 'cities',
    data: {
      name: 'Kyoto',
      country: japan.id,
      intro: 'Temples on a grid, and a stillness you have to walk a while to find.',
    },
    ...ctx,
  })
  const oaxaca = await payload.create({
    collection: 'cities',
    data: {
      name: 'Oaxaca',
      country: mexico.id,
      intro: 'Mezcal, mole, and mornings that smell like cut herbs and wood smoke.',
    },
    ...ctx,
  })

  // --- People (referral chain filled in below) ---
  const tomas = await payload.create({
    collection: 'people',
    data: { name: 'Tomás', note: 'Bartender at a tiny place in Alfama, Lisbon.' },
    ...ctx,
  })
  const yuki = await payload.create({
    collection: 'people',
    data: { name: 'Yuki', note: 'Coffee roaster in Nakameguro. Tomás’ friend from culinary school.', metVia: { relationTo: 'people', value: tomas.id } },
    ...ctx,
  })
  const elena = await payload.create({
    collection: 'people',
    data: { name: 'Elena', note: 'Guesthouse owner in Porto who knows every cellar by name.', metVia: { relationTo: 'people', value: yuki.id } },
    ...ctx,
  })
  const carlos = await payload.create({
    collection: 'people',
    data: { name: 'Carlos', note: 'Mezcal maker outside Oaxaca. Met through a write-up, not a person.' },
    ...ctx,
  })

  // --- Posts ---
  type PostSeed = {
    title: string
    city: number
    author: number
    referredBy?: number
    date: string
    excerpt: string
    paras: string[]
    status?: 'published' | 'draft'
  }

  const posts: PostSeed[] = [
    {
      title: 'The Alfama bar with no sign',
      city: lisbon.id,
      author: admin.id,
      referredBy: tomas.id,
      date: '2025-04-12',
      excerpt: 'A doorway, a curtain, and the best vinho verde I’ve had — on a bartender’s say-so.',
      paras: [
        'I would have walked straight past it. There is no sign, just a bead curtain and a slate with two wines chalked on it.',
        'Tomás had told me to knock and ask for the green one. I did, and an hour later I was three glasses deep and had a list of five more places on a napkin.',
        'This is the whole reason for this site: the best things I find come from people, not maps.',
      ],
    },
    {
      title: 'Porto in the river fog',
      city: porto.id,
      author: author.id,
      referredBy: elena.id,
      date: '2025-06-03',
      excerpt: 'Elena walked me across the bridge at dawn to a cellar that doesn’t open to tourists.',
      paras: [
        'Porto wakes slowly. The fog sits on the Douro until the sun burns a hole in it around nine.',
        'Elena knows every cellar master by their first name, and she vouched for me, which is the only reason the door opened.',
      ],
    },
    {
      title: 'A counter for eight in Nakameguro',
      city: tokyo.id,
      author: admin.id,
      referredBy: yuki.id,
      date: '2025-09-21',
      excerpt: 'Yuki’s roastery led to a dinner counter that seats eight and takes no reservations.',
      paras: [
        'Yuki roasts coffee by day and, it turns out, knows exactly where to eat by night.',
        'The counter seats eight. You sit, you eat what the chef decides, and you leave grinning. No menu, no choices, no complaints.',
      ],
    },
    {
      title: 'Kyoto before the crowds',
      city: kyoto.id,
      author: author.id,
      date: '2025-11-08',
      excerpt: 'The trick to the famous temples is simply being there an hour before anyone else.',
      paras: [
        'By seven the gravel is raked and empty. By nine it is a river of phones.',
        'I found the gap in between and had the moss garden almost to myself.',
      ],
    },
    {
      title: 'Mezcal, straight from the still',
      city: oaxaca.id,
      author: admin.id,
      referredBy: carlos.id,
      date: '2026-01-17',
      excerpt: 'Carlos poured from the still into a gourd cup and explained why the smoke matters.',
      paras: [
        'The palenque is an hour of dirt road out of the city, past agave fields that look prehistoric.',
        'Carlos poured a warm, cloudy pour straight off the still and talked me through the smoke, the earth, and the patience of it.',
      ],
    },
    {
      title: 'The Lisbon tram to nowhere in particular',
      city: lisbon.id,
      author: author.id,
      date: '2026-02-25',
      excerpt: 'Sometimes the recommendation is just: get on the 28 and see where the hills take you.',
      paras: [
        'I rode the whole line twice. The second time I knew where to jump off for the view and where to hang on for the turns.',
      ],
    },
    {
      title: 'Second morning in Oaxaca',
      city: oaxaca.id,
      author: admin.id,
      date: '2026-03-30',
      excerpt: 'A market breakfast, a tlayuda the size of a steering wheel, and a plan for nothing.',
      paras: [
        'The market is loudest and best at eight. I ate standing up and let the day arrange itself around it.',
      ],
    },
    {
      title: 'Tokyo, the second time',
      city: tokyo.id,
      author: author.id,
      date: '2026-05-14',
      excerpt: 'Returning to a city you’ve been recommended into feels like having friends already.',
      paras: [
        'The second visit is different. You are not chasing sights; you are keeping appointments with places that were once tips.',
      ],
    },
    {
      title: 'Draft: notes from Sintra',
      city: lisbon.id,
      author: admin.id,
      date: '2026-06-01',
      excerpt: 'Unfinished — a day trip I haven’t written up yet.',
      paras: ['Placeholder body for an unpublished draft. Should never appear on the public site.'],
      status: 'draft',
    },
  ]

  const created: { title: string; id: number }[] = []
  for (const p of posts) {
    const doc = await payload.create({
      collection: 'posts',
      data: {
        title: p.title,
        excerpt: p.excerpt,
        body: body(p.paras),
        publishedDate: `${p.date}T00:00:00.000Z`,
        city: p.city,
        author: p.author,
        ...(p.referredBy ? { referredBy: p.referredBy } : {}),
        _status: p.status ?? 'published',
      },
      ...ctx,
    })
    created.push({ title: p.title, id: doc.id })
  }

  // Close the referral chain: Carlos was met via a specific write-up.
  const mezcalPost = created.find((c) => c.title.startsWith('Mezcal'))
  if (mezcalPost) {
    await payload.update({
      collection: 'people',
      id: carlos.id,
      data: { metVia: { relationTo: 'posts', value: mezcalPost.id } },
      ...ctx,
    })
  }

  const publishedCount = posts.filter((p) => (p.status ?? 'published') === 'published').length
  console.log(
    `Seed complete: 2 users, 3 countries, 5 cities, 4 people, ${publishedCount} published posts + 1 draft.`,
  )
  console.log('Admin login: admin@example.com / password')

  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
