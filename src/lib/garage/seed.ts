import { emptyStore } from './store.ts';
import type { GarageStore, Vehicle, VehicleId } from './types.ts';

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
    summary: 'Our 2019 Thor Majestic 28A. Ford E-450 Class C, one street-side slide.',
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
      notes: '',
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
    summary: 'Our 2024 Tesla Model Y Long Range. Dual-motor AWD, Highland body.',
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
      notes: '',
    },
  },
];

export function createSeedStore(updatedAt = '2026-08-31T16:00:00.000Z'): GarageStore {
  const store = emptyStore(updatedAt);
  store.vehicles = vehicles;
  store.snapshots = [];
  store.comps = [];
  store.sentiments = [];
  store.listings = [];
  return store;
}

export function seedHeadline(vehicleId: VehicleId): string {
  return vehicleId === 'thor-majestic-28a'
    ? '2019 Thor Majestic 28A Denver prices'
    : '2024 Tesla Model Y Long Range Denver prices';
}
