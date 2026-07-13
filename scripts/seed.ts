/**
 * Development seed for Word of Mouth.
 *
 * Wipes the content collections and rebuilds a small but realistic travel
 * journal: one admin + one author, four countries, one region (California),
 * six cities, five people (with a "met via" chain), nine published posts across
 * 2025/2026, and one draft. All writes go through Payload's Local API so
 * validation and hooks run exactly as they would in production.
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

  // --- Wipe content in a dependency-safe order: posts and people reference
  // places, places reference cities, cities reference countries. ---
  await payload.delete({ collection: 'post-views', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'tags', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'posts', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'people', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'places', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'cities', where: { id: { exists: true } }, ...ctx })
  await payload.delete({ collection: 'regions', where: { id: { exists: true } }, ...ctx })
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
  const usa = await payload.create({
    collection: 'countries',
    data: {
      name: 'USA',
      intro: 'A continent of regions — where the state you are in changes the whole conversation.',
    },
    ...ctx,
  })

  // --- Regions (optional level between Country and City). Only some countries
  // use one: California gives "Sacramento, CA"; Portugal/Japan/Mexico cities
  // stay region-less ("Tokyo"), so both label forms exist in seed data. ---
  const california = await payload.create({
    collection: 'regions',
    data: { name: 'California', code: 'CA', country: usa.id },
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
      // City-level location: posts in Tokyo without their own spot fall back to this.
      location: { mapsUrl: 'https://www.google.com/maps/place/Tokyo/@35.6764,139.6500,11z' },
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
  // The one city with a region: renders "Sacramento, CA" via city.region.
  const sacramento = await payload.create({
    collection: 'cities',
    data: {
      name: 'Sacramento',
      country: usa.id,
      region: california.id,
      intro: 'Delta breezes, farm-to-fork tables, and a downtown that hides its best bars in plain sight.',
    },
    ...ctx,
  })

  // --- Incidental Place: a spot with no write-up, where an encounter happened.
  // It anchors the Place → Person → Place chain (rooftop → Tomás → Alfama bar). ---
  const rooftop = await payload.create({
    collection: 'places',
    data: {
      name: 'Maria’s rooftop',
      city: lisbon.id,
      note: 'A friend’s rooftop in Alfama — where a good night, and a good tip, started.',
    },
    ...ctx,
  })

  // --- People. metAt = where you met them (a Place), metThrough = who
  // introduced you (a Person), metOn = when. Carlos' metAt is wired below to the
  // Place behind his write-up, closing a full Place → Person → Place chain. ---
  const tomas = await payload.create({
    collection: 'people',
    data: {
      name: 'Tomás',
      note: 'Bartender at a tiny place in Alfama, Lisbon.',
      metAt: rooftop.id,
      metOn: '2025-03-20T00:00:00.000Z',
    },
    ...ctx,
  })
  const yuki = await payload.create({
    collection: 'people',
    data: {
      name: 'Yuki',
      note: 'Coffee roaster in Nakameguro. Tomás’ friend from culinary school.',
      metThrough: tomas.id,
      metOn: '2025-09-15T00:00:00.000Z',
    },
    ...ctx,
  })
  const elena = await payload.create({
    collection: 'people',
    data: {
      name: 'Elena',
      note: 'Guesthouse owner in Porto who knows every cellar by name.',
      metThrough: yuki.id,
      metOn: '2025-05-28T00:00:00.000Z',
    },
    ...ctx,
  })
  const carlos = await payload.create({
    collection: 'people',
    data: { name: 'Carlos', note: 'Mezcal maker outside Oaxaca. Met at his palenque.' },
    ...ctx,
  })
  const sam = await payload.create({
    collection: 'people',
    data: {
      name: 'Sam',
      note: 'Bartender in downtown Sacramento who keeps a list of where to go next.',
      metThrough: elena.id,
      metOn: '2026-04-02T00:00:00.000Z',
    },
    ...ctx,
  })

  // --- Tags ---
  const tag = async (name: string) =>
    (await payload.create({ collection: 'tags', data: { name }, ...ctx })).id
  const coffee = await tag('coffee')
  const bars = await tag('bars')
  const food = await tag('food')
  const views = await tag('views')
  const markets = await tag('markets')

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
    mapsUrl?: string
    tags?: number[]
  }

  const posts: PostSeed[] = [
    {
      title: 'The Alfama bar with no sign',
      city: lisbon.id,
      author: admin.id,
      referredBy: tomas.id,
      date: '2025-04-12',
      // Post-level spot: exercises the Maps-URL hook and the rail map at place zoom.
      mapsUrl:
        'https://www.google.com/maps/place/Tasca+do+Chico/@38.7101,-9.1444,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d38.7112696!4d-9.1315945',
      tags: [bars],
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
      tags: [bars, food],
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
      tags: [coffee, food],
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
      tags: [views],
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
      tags: [bars],
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
      tags: [views],
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
      tags: [markets, food],
      excerpt: 'A market breakfast, a tlayuda the size of a steering wheel, and a plan for nothing.',
      paras: [
        'The market is loudest and best at eight. I ate standing up and let the day arrange itself around it.',
      ],
    },
    {
      title: 'The Sacramento bar behind the alley door',
      city: sacramento.id,
      author: admin.id,
      referredBy: sam.id,
      date: '2026-04-08',
      tags: [bars],
      excerpt: 'Sam sent me down an alley off K Street to a room that runs on regulars and rye.',
      paras: [
        'You would never find it from the street. Sam drew me a map on a coaster: the alley, the unmarked door, the nod you give the person behind it.',
        'Inside, it is all dark wood and Delta breezes through a propped door. The rye list is longer than the food menu, and that is the point.',
      ],
    },
    {
      title: 'Tokyo, the second time',
      city: tokyo.id,
      author: author.id,
      date: '2026-05-14',
      tags: [coffee, food],
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

  const created: { title: string; id: number; placeId: number }[] = []
  for (const p of posts) {
    // A Post is a write-up of a Place; the pin and city live on the Place.
    const place = await payload.create({
      collection: 'places',
      data: {
        name: p.title,
        city: p.city,
        ...(p.mapsUrl ? { location: { mapsUrl: p.mapsUrl } } : {}),
      },
      ...ctx,
    })
    const doc = await payload.create({
      collection: 'posts',
      data: {
        title: p.title,
        excerpt: p.excerpt,
        body: body(p.paras),
        publishedDate: `${p.date}T00:00:00.000Z`,
        place: place.id,
        author: p.author,
        ...(p.referredBy ? { referredBy: p.referredBy } : {}),
        ...(p.tags ? { tags: p.tags } : {}),
        _status: p.status ?? 'published',
      },
      ...ctx,
    })
    created.push({ title: p.title, id: doc.id, placeId: place.id })
  }

  // Close a full Place → Person → Place chain: Carlos was met at the palenque
  // his write-up is about, and he then pointed the way onward.
  const mezcalPost = created.find((c) => c.title.startsWith('Mezcal'))
  if (mezcalPost) {
    await payload.update({
      collection: 'people',
      id: carlos.id,
      data: { metAt: mezcalPost.placeId },
      ...ctx,
    })
  }

  // Sam tends (and recommended) the Sacramento bar, so that Place is also where
  // we met him. Its city carries a region, so the encounter caption reads
  // "Met at …, Sacramento, CA" — the region-aware path the detail page renders.
  const sacramentoPost = created.find((c) => c.title.startsWith('The Sacramento bar'))
  if (sacramentoPost) {
    await payload.update({
      collection: 'people',
      id: sam.id,
      data: { metAt: sacramentoPost.placeId },
      ...ctx,
    })
  }

  const publishedCount = posts.filter((p) => (p.status ?? 'published') === 'published').length
  console.log(
    `Seed complete: 2 users, 4 countries, 1 region, 6 cities, ${created.length + 1} places, 5 people, 5 tags, ${publishedCount} published posts + 1 draft.`,
  )
  console.log('Admin login: admin@example.com / password')

  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
