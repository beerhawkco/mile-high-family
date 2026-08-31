import { snapshotId } from './ids.ts';
import { addDays, emptyStore } from './store.ts';
import type { GarageStore, SentimentNote, Snapshot, Trend, Vehicle, VehicleId } from './types.ts';

const THOR_HERO =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Motorhome-RV-Class-C-Sprinter-Ford-Chassis.jpg?width=1600';
const TESLA_HERO =
  'https://commons.wikimedia.org/wiki/Special:FilePath/2023_Tesla_Model_Y,_front_11.11.23.jpg?width=1600';

const vehicles: Vehicle[] = [
  {
    id: 'thor-majestic-28a',
    year: 2019,
    make: 'Thor',
    model: 'Majestic',
    trim: '28A',
    kind: 'rv',
    intent: 'sell',
    name: '2019 Thor Majestic 28A',
    shortName: 'Majestic 28A',
    category: 'Class C motorhome',
    summary:
      'Our coach, for sale. Ford E-450 Class C with a street-side slide. Comps are 250 miles of Denver so we can price a real Front Range sale — and later use this same RV section to shop the next one.',
    notes: '',
    hero: THOR_HERO,
    heroAlt: 'A Thor Motor Coach Class C on a Ford chassis, representative of the body style',
    heroCredit: 'Wikimedia Commons · Thor Four Winds Class C, not this exact 28A',
    specs: [
      { label: 'Class', value: 'Class C' },
      { label: 'Length', value: '29 ft 10 in' },
      { label: 'Sleeps', value: '6–8' },
      { label: 'Chassis', value: 'Ford E-450' },
      { label: 'Fuel', value: 'Gasoline' },
      { label: 'Slide', value: 'One street-side' },
      { label: 'Typical GVWR', value: '14,500 lb' },
    ],
    owned: {
      status: 'preparing',
      askingPrice: null,
      targetPrice: 65000,
      listedOn: '',
      miles: null,
      hours: null,
      condition: '',
      listingUrl: '',
      soldPrice: null,
      soldOn: '',
      notes: 'Set our miles, hours, and ask on the desk before it goes live.',
    },
  },
  {
    id: 'tesla-model-y-lr',
    year: 2024,
    make: 'Tesla',
    model: 'Model Y',
    trim: 'Long Range',
    kind: 'car',
    intent: 'sell',
    name: '2024 Tesla Model Y Long Range',
    shortName: 'Model Y LR',
    category: 'Used compact electric SUV',
    summary:
      'Our car, for sale. Dual-motor AWD. Used 2024 Long Range asks inside 250 miles of Denver are still sliding as newer Juniper-bodied Ys stack up against Highland cars.',
    notes: '',
    hero: TESLA_HERO,
    heroAlt: 'A 2023 Tesla Model Y Long Range photographed from the front three-quarter',
    heroCredit: 'Wikimedia Commons',
    specs: [
      { label: 'Drivetrain', value: 'Dual motor AWD' },
      { label: 'Range (EPA)', value: '~310–320 mi' },
      { label: 'Seats', value: '5 (7 optional)' },
      { label: '0–60', value: '~4.8 sec' },
      { label: 'Charge port', value: 'NACS' },
      { label: 'Body', value: 'Highland (pre-Juniper)' },
    ],
    owned: {
      status: 'preparing',
      askingPrice: null,
      targetPrice: 36500,
      listedOn: '',
      miles: null,
      hours: null,
      condition: '',
      listingUrl: '',
      soldPrice: null,
      soldOn: '',
      notes: 'Set our miles and ask on the desk. Compare to sold prints first.',
    },
  },
];

function lerp(start: number, end: number, t: number) {
  return Math.round(start + (end - start) * t);
}

function trendFromDelta(delta: number): Trend {
  if (delta > 250) return 'up';
  if (delta < -250) return 'down';
  return 'flat';
}

function datesBetween(start: string, end: string) {
  const out: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) out.push(date);
  return out;
}

function thorSnapshots(dates: string[]): Snapshot[] {
  return dates.map((date, index) => {
    const t = dates.length === 1 ? 1 : index / (dates.length - 1);
    const median = lerp(68500, 66200, t);
    const week = index < 7 ? median : lerp(68500, 66200, (index - 7) / (dates.length - 1));
    const weekend = new Date(`${date}T12:00:00Z`).getUTCDay() % 6 === 0;
    return {
      id: snapshotId('thor-majestic-28a', date),
      vehicleId: 'thor-majestic-28a',
      date,
      askingLow: lerp(54800, 52900, t),
      askingHigh: lerp(81900, 79200, t),
      askingMedian: median,
      soldMedian: lerp(65200, 63400, t),
      soldCount: 3,
      listingCount: lerp(38, 46, t) + (weekend ? 2 : 0),
      daysOnMarket: lerp(54, 61, t),
      medianDaysToSale: lerp(68, 71, t),
      sentiment: t > 0.7 ? 'cool' : 'warm',
      sentimentScore: lerp(12, -18, t),
      trend: trendFromDelta(median - week),
      headline:
        t > 0.75
          ? 'Buyers waiting out high-mile 28As'
          : 'Class C ask still drifting, not crashing',
      brief:
        t > 0.75
          ? 'More 2018–2020 gasoline Class Cs sitting past 60 days. Clean, under-40k-mile 28As still clear near the middle of the range; tired coaches are the ones getting cut.'
          : 'Asking bands are wide. Condition and generator hours matter more than the window sticker this week.',
      source: 'seed',
      needsReview: false,
    };
  });
}

function teslaSnapshots(dates: string[]): Snapshot[] {
  return dates.map((date, index) => {
    const t = dates.length === 1 ? 1 : index / (dates.length - 1);
    const median = lerp(38900, 37400, t);
    const week = index < 7 ? median : lerp(38900, 37400, (index - 7) / (dates.length - 1));
    return {
      id: snapshotId('tesla-model-y-lr', date),
      vehicleId: 'tesla-model-y-lr',
      date,
      askingLow: lerp(33900, 32800, t),
      askingHigh: lerp(44900, 42900, t),
      askingMedian: median,
      soldMedian: lerp(37600, 36100, t),
      soldCount: 2,
      listingCount: lerp(210, 248, t),
      daysOnMarket: lerp(18, 22, t),
      medianDaysToSale: lerp(16, 12, t),
      sentiment: t > 0.55 ? 'cool' : 'warm',
      sentimentScore: lerp(8, -22, t),
      trend: trendFromDelta(median - week),
      headline:
        t > 0.6 ? 'Used 2024 LR still sliding under Juniper pressure' : 'Highland LR asking prices ease again',
      brief:
        t > 0.6
          ? 'Inventory of 2024 Long Range dual-motors is thick. Sub-20k-mile examples still ask a premium; 30k-mile cars are where the median lives.'
          : 'Volume is high and days-on-market stay short relative to the RV. Price discovery is happening in public.',
      source: 'seed',
      needsReview: false,
    };
  });
}

const comps = [
  {
    id: 'cmp_thor_01',
    vehicleId: 'thor-majestic-28a',
    title: '2019 Thor Majestic 28A · one slide · Ford E-450',
    year: 2019,
    price: 67900,
    miles: 28400,
    hours: 210,
    location: 'Castle Rock, CO',
    condition: 'Clean, recent roof inspection',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-22',
    status: 'active',
    notes: 'Closest local comp. Generator serviced 2025.',
  },
  {
    id: 'cmp_thor_02',
    vehicleId: 'thor-majestic-28a',
    title: '2019 Majestic 28A · private party',
    year: 2019,
    price: 59900,
    miles: 41200,
    hours: 340,
    location: 'Colorado Springs, CO',
    condition: 'Used hard, faded graphics',
    source: 'Private',
    url: '',
    listedOn: '2026-08-18',
    status: 'active',
    notes: 'Price cut from $64,500 on Aug 26.',
  },
  {
    id: 'cmp_thor_03',
    vehicleId: 'thor-majestic-28a',
    title: '2018 Thor Majestic 28A',
    year: 2018,
    price: 54900,
    miles: 51200,
    hours: 410,
    location: 'Pueblo, CO',
    condition: 'High miles, working slide',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-09',
    status: 'active',
    notes: 'Year-back comp. Useful floor, not a price ceiling.',
  },
  {
    id: 'cmp_thor_04',
    vehicleId: 'thor-majestic-28a',
    title: '2020 Thor Majestic 28A',
    year: 2020,
    price: 74900,
    miles: 19100,
    hours: 160,
    location: 'Fort Collins, CO',
    condition: 'Low miles, stored indoors',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-12',
    status: 'active',
    notes: 'Year-forward. Sets the top of the local band.',
  },
  {
    id: 'cmp_thor_05',
    vehicleId: 'thor-majestic-28a',
    title: '2019 Majestic 28A sold in Parker',
    year: 2019,
    price: 63500,
    soldPrice: 63500,
    miles: 33600,
    hours: 255,
    location: 'Parker, CO',
    condition: 'Average',
    source: 'Sold',
    url: '',
    listedOn: '2026-08-04',
    daysListed: 71,
    status: 'sold',
    notes: 'Sat 71 days. Sold $4,400 under original ask. Inside the 250-mile Denver ring.',
  },
  {
    id: 'cmp_thor_06',
    vehicleId: 'thor-majestic-28a',
    title: '2019 Majestic 28A · Salt Lake lot',
    year: 2019,
    price: 69995,
    miles: 24800,
    hours: 190,
    location: 'Greeley, CO',
    condition: 'Retail-ready',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-27',
    status: 'active',
    notes: 'Inside 250 miles of Denver.',
  },
  {
    id: 'cmp_thor_07',
    vehicleId: 'thor-majestic-28a',
    title: '2019 Majestic 28A expired listing',
    year: 2019,
    price: 72900,
    miles: 22100,
    hours: 175,
    location: 'Denver, CO',
    condition: 'Optimistic ask',
    source: 'Private',
    url: '',
    listedOn: '2026-07-19',
    status: 'expired',
    notes: 'Never moved. Treat as a warning, not a comp.',
  },
  {
    id: 'cmp_y_01',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y Long Range AWD · Stealth Grey',
    year: 2024,
    price: 37990,
    miles: 18400,
    hours: null,
    location: 'Denver, CO',
    condition: 'One owner, FSD untransferred',
    source: 'Tesla Used',
    url: '',
    listedOn: '2026-08-28',
    status: 'active',
    notes: 'Closest clean local example.',
  },
  {
    id: 'cmp_y_02',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y LR · Quicksilver',
    year: 2024,
    price: 36450,
    miles: 27600,
    hours: null,
    location: 'Aurora, CO',
    condition: 'Minor curb rash',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-25',
    status: 'active',
    notes: 'Price-cut $1,200 on Aug 29.',
  },
  {
    id: 'cmp_y_03',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y LR 7-seat',
    year: 2024,
    price: 39900,
    miles: 12100,
    hours: null,
    location: 'Boulder, CO',
    condition: 'Low miles, 20s',
    source: 'Private',
    url: '',
    listedOn: '2026-08-21',
    status: 'active',
    notes: 'Seven-seat cars still ask a premium here.',
  },
  {
    id: 'cmp_y_04',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y LR sold · Colorado Springs',
    year: 2024,
    price: 35800,
    miles: 31200,
    hours: null,
    location: 'Colorado Springs, CO',
    condition: 'Average',
    source: 'Sold',
    url: '',
    soldPrice: 35800,
    listedOn: '2026-08-16',
    daysListed: 9,
    status: 'sold',
    notes: 'Nine days on market. Good sold print.',
  },
  {
    id: 'cmp_y_05',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y LR · Ultra Red',
    year: 2024,
    price: 41490,
    miles: 8900,
    hours: null,
    location: 'Fort Collins, CO',
    condition: 'Near-new',
    source: 'Tesla Used',
    url: '',
    listedOn: '2026-08-24',
    status: 'active',
    notes: 'Paint and miles justify the ask only if you need a new-ish car.',
  },
  {
    id: 'cmp_y_06',
    vehicleId: 'tesla-model-y-lr',
    title: '2023 Model Y LR (year-back)',
    year: 2023,
    price: 32900,
    miles: 38400,
    hours: null,
    location: 'Lakewood, CO',
    condition: 'Pre-Highland interior',
    source: 'Dealer',
    url: '',
    listedOn: '2026-08-19',
    status: 'active',
    notes: 'Floor, not a 2024 match.',
  },
  {
    id: 'cmp_y_07',
    vehicleId: 'tesla-model-y-lr',
    title: '2025 Model Y LR Juniper (year-forward)',
    year: 2025,
    price: 44990,
    miles: 6200,
    hours: null,
    location: 'Denver, CO',
    condition: 'New body, low miles',
    source: 'Tesla Used',
    url: '',
    listedOn: '2026-08-26',
    status: 'active',
    notes: 'Shows why 2024 Highland cars keep getting cut.',
  },
  {
    id: 'cmp_y_08',
    vehicleId: 'tesla-model-y-lr',
    title: '2024 Model Y LR sold · Longmont',
    year: 2024,
    price: 35100,
    soldPrice: 35100,
    miles: 29800,
    hours: null,
    location: 'Longmont, CO',
    condition: 'Average',
    source: 'Sold',
    url: '',
    listedOn: '2026-08-11',
    daysListed: 14,
    status: 'sold',
    notes: 'Fourteen days listed. Inside the Denver 250-mile ring.',
  },
];

const sentiments: SentimentNote[] = [
  {
    id: 'sen_thor_01',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-30',
    source: 'RV trader chatter',
    tone: 'negative',
    summary: 'Gasoline Class C shoppers keep saying “wait for September cuts.” Lots of 2018–2020 inventory, few sold reports under 50 days.',
    url: '',
  },
  {
    id: 'sen_thor_02',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-27',
    source: 'Owner group',
    tone: 'neutral',
    summary: '28A floorplan still liked for bunks + dinette. Complaints cluster on roof seals and the Ford 6.8/V10 fuel burn, not the layout.',
    url: '',
  },
  {
    id: 'sen_thor_03',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-21',
    source: 'Dealer lot notes',
    tone: 'negative',
    summary: 'Two Front Range lots quietly dropped 2019 gasoline Class Cs after Labor Day ads failed. Slide coaches with service files still get calls.',
    url: '',
  },
  {
    id: 'sen_thor_04',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-16',
    source: 'Insurance / finance',
    tone: 'neutral',
    summary: 'Lenders still treating 7-year gasoline Class Cs as normal collateral. No new credit freeze — this is a price story, not a funding story.',
    url: '',
  },
  {
    id: 'sen_thor_05',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-08',
    source: 'Camping season',
    tone: 'positive',
    summary: 'August use is high. Coaches that show “ready this weekend” photos do better than units staged in gravel lots.',
    url: '',
  },
  {
    id: 'sen_y_01',
    vehicleId: 'tesla-model-y-lr',
    date: '2026-08-30',
    source: 'Used EV forums',
    tone: 'negative',
    summary: 'Consensus: do not pay 2024 new-car money for a Highland LR. Juniper residual pressure is the weekly talking point.',
    url: '',
  },
  {
    id: 'sen_y_02',
    vehicleId: 'tesla-model-y-lr',
    date: '2026-08-28',
    source: 'Family EV owners',
    tone: 'positive',
    summary: 'People who already live with a Y still defend the package: winter range, seats, cargo. The sour mood is price, not usefulness.',
    url: '',
  },
  {
    id: 'sen_y_03',
    vehicleId: 'tesla-model-y-lr',
    date: '2026-08-24',
    source: 'Service / quality',
    tone: 'neutral',
    summary: 'Suspension creak and door-seal threads are unchanged. No new 2024-specific recall chatter this week.',
    url: '',
  },
  {
    id: 'sen_y_04',
    vehicleId: 'tesla-model-y-lr',
    date: '2026-08-19',
    source: 'Insurance',
    tone: 'negative',
    summary: 'Colorado premiums for 2024 Ys remain the objection after the sticker. Shoppers asking for “out the door including insurance.”',
    url: '',
  },
  {
    id: 'sen_y_05',
    vehicleId: 'tesla-model-y-lr',
    date: '2026-08-12',
    source: 'Inventory desks',
    tone: 'neutral',
    summary: 'Tesla used lots are turning 2024 LRs faster than franchise lots. Private-party asks above $40k are going stale unless miles are tiny.',
    url: '',
  },
];

export const SEED_START = '2026-08-14';
export const SEED_END = '2026-08-31';

export function createSeedStore(end = SEED_END, start = SEED_START): GarageStore {
  const dates = datesBetween(start, end);
  const store = emptyStore(`${end}T16:00:00.000Z`);
  store.vehicles = vehicles;
  store.snapshots = [...thorSnapshots(dates), ...teslaSnapshots(dates)];
  store.comps = comps.map((comp) => ({
    soldPrice: null,
    daysListed: null,
    ...comp,
  }));
  store.sentiments = sentiments.filter((note) => note.date <= end);
  return store;
}

export function seedHeadline(vehicleId: VehicleId): string {
  return vehicleId === 'thor-majestic-28a'
    ? '2019 Thor Majestic 28A market pulse'
    : '2024 Tesla Model Y Long Range market pulse';
}
