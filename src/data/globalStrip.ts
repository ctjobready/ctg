import { fact } from './facts';

/**
 * "CodersTrust Around the World" (WP55, owner decisions 2026-10-17/18; synthesis 3.1): the chronological strip of seven tiles on Home and About, and its three-tile short form in the audience pages' "Our Track Record" band.
 * Each tile is one line, place and date first: the date and the line are the register's (TL-01 to TL-06: `stat.value` is the date, `stat.label` the line; the photographs and their captions are in src/data/photos.ts), so no
 * wording or date is typed here. The strip ends on Bangladesh, the country where most delivery has been: that tile's line is SC-03's own clause, "most delivery has been in Bangladesh".
 * TL-07 (the 2015–2016 Rockefeller Foundation grant for a feasibility study in Kenya and Nigeria) is not a tile: it is a line of the About timeline (src/data/timeline.ts), and Nigeria is not a location.
 * Albania has no photograph of the program (the only visual is the program's own cut-out, used on its case study), so its tile is a type tile: the program's name where a photograph would be.
 */
export interface StripTile {
  id: string;
  place: string;
  /** The date shown beside the place ("April 2014", "2016–2017", "Since 2014"). */
  when: string;
  /** The tile's one line, without its final period. */
  line: string;
  /** Photo registry key (src/data/photos.ts); a tile without one shows `mark`. */
  photo?: string;
  /** The text of a type tile (no photograph). */
  mark?: string;
  /** Register facts the tile states (data-fact). */
  factIds: string[];
  /** The last tile: wider, and the only one that says where most delivery has been. */
  wide?: boolean;
}

const dated = (factId: string, id: string, place: string, extra: Partial<StripTile> = {}): StripTile => {
  const s = fact(factId).stat;
  if (!s) throw new Error(`globalStrip: ${factId} has no stat`);
  return { id, place, when: s.value, line: s.label, factIds: [factId], ...extra };
};

// SC-03's detail reads "Bangladesh plus 15 other countries and territories; most delivery has been in Bangladesh."; the tile says its second clause.
const bangladeshClause = /; (most delivery has been in Bangladesh)\.?$/.exec(fact('SC-03').stat?.detail ?? '')?.[1];
if (!bangladeshClause) throw new Error('globalStrip: SC-03 detail no longer ends "...; most delivery has been in Bangladesh."');

const TILES: Record<string, StripTile> = {
  copenhagen: dated('TL-01', 'copenhagen', 'Copenhagen', { photo: 'global/copenhagen-launch-dinner' }),
  dubai: dated('TL-02', 'dubai', 'Dubai', { photo: 'global/dubai-start-up-event' }),
  somaliland: dated('TL-03', 'somaliland', 'Somaliland', { photo: 'global/somaliland-hour-of-code' }),
  kosovo: dated('TL-04', 'kosovo', 'Kosovo', { photo: 'general/kosovo-wow-group' }),
  albania: dated('TL-05', 'albania', 'Albania', { mark: 'Digital Jobs Albania' }),
  'new-york': dated('TL-06', 'new-york', 'New York', { photo: 'field/ccny-mou-signing' }),
  bangladesh: {
    id: 'bangladesh',
    place: 'Bangladesh',
    when: 'since 2014',
    line: bangladeshClause[0].toUpperCase() + bangladeshClause.slice(1),
    photo: 'general/women-learners-classroom',
    factIds: ['SC-03'],
    wide: true,
  },
};

/** The full strip: Home and About. */
export const WORLD_STRIP: StripTile[] = ['copenhagen', 'dubai', 'somaliland', 'kosovo', 'albania', 'new-york', 'bangladesh'].map((id) => TILES[id]);

/** The short form for the audience pages (Development Partners, Governments, Foundations): the launch, the Gulf and the first World Bank program. Somaliland is the Development Partners hero, so no photograph repeats on that page. */
export const WORLD_STRIP_SHORT: StripTile[] = ['copenhagen', 'dubai', 'kosovo'].map((id) => TILES[id]);
