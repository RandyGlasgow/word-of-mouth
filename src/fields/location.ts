import type { Field } from 'payload'

/**
 * A `location` group shared by any collection that pins to a place on the map.
 * Authors paste a Google Maps link into `mapsUrl`; the `resolveLocation` hook
 * fills `lat`/`lng` (and `placeName` when it can) on save. Everything is
 * optional and hand-editable — a legacy row may carry a URL but no coordinates.
 *
 * Stored as two numbers rather than Payload's native `point` type: `point` maps
 * to a PostGIS `geometry(Point)` column, and the project's Postgres image ships
 * without PostGIS. The feature only ever reads the pair back to render a marker,
 * so a spatial column would buy nothing.
 */
export const locationField = (): Field => ({
  name: 'location',
  type: 'group',
  admin: {
    description: 'Paste a Google Maps link and the coordinates fill in on save.',
  },
  fields: [
    {
      name: 'mapsUrl',
      type: 'text',
      label: 'Google Maps URL',
      admin: {
        description:
          'Paste a Google Maps link — a full browser URL or a maps.app.goo.gl share link. Coordinates and place name fill in when you save.',
      },
    },
    {
      name: 'placeName',
      type: 'text',
      admin: {
        description: 'Prefilled from the link when possible; edit freely.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lat',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Auto-filled from the link; hand-editable.',
          },
        },
        {
          name: 'lng',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Auto-filled from the link; hand-editable.',
          },
        },
      ],
    },
  ],
})
