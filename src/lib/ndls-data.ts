// Realistic NDLS (New Delhi Railway Station) static data — simulates live feed.
// 16 platforms, real train numbers/routes.

export type TrainStatus = "on-time" | "delayed" | "arriving" | "boarding" | "departed";
export type CrowdLevel = "low" | "medium" | "high" | "critical";

export interface Train {
  id: string;
  number: string;
  name: string;
  origin: string;
  destination: string;
  platform: number;
  scheduled: string;     // HH:MM
  expected: string;      // HH:MM
  status: TrainStatus;
  delayMin: number;
  capacity: number;
  estimatedPax: number;  // current/expected passengers
  coachCount: number;
  nextStop: { name: string; eta: string; distanceKm: number };
  timeline: { time: string; event: string; done: boolean }[];
}

export interface PlatformInfo {
  id: number;
  name: string;
  length: number;
  segments: 3;
  type: "terminal" | "through";
}

export const STATION = {
  code: "NDLS",
  name: "New Delhi Railway Station",
  city: "New Delhi",
  zone: "Northern Railway",
  platforms: 16,
};

export const PLATFORMS: PlatformInfo[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `PF ${i + 1}`,
  length: 600,
  segments: 3,
  type: i < 4 ? "terminal" : "through",
}));

export const TRAINS: Train[] = [
  {
    id: "t1", number: "12302", name: "Howrah Rajdhani Exp",
    origin: "New Delhi", destination: "Howrah Jn",
    platform: 3, scheduled: "16:55", expected: "16:55",
    status: "boarding", delayMin: 0, capacity: 1280, estimatedPax: 1088,
    coachCount: 22,
    nextStop: { name: "Kanpur Central", eta: "17:55", distanceKm: 440 },
    timeline: [
      { time: "16:20", event: "Rake placed on platform", done: true },
      { time: "16:30", event: "Reservation chart prepared", done: true },
      { time: "16:40", event: "Passenger boarding started", done: true },
      { time: "16:55", event: "Scheduled departure", done: false },
    ],
  },
  {
    id: "t2", number: "12952", name: "Mumbai Rajdhani Exp",
    origin: "New Delhi", destination: "Mumbai Central",
    platform: 1, scheduled: "17:00", expected: "17:08",
    status: "delayed", delayMin: 8, capacity: 1320, estimatedPax: 1188,
    coachCount: 20,
    nextStop: { name: "Kota Jn", eta: "19:42", distanceKm: 458 },
    timeline: [
      { time: "16:25", event: "Rake placement (delayed)", done: true },
      { time: "16:45", event: "Chart prepared", done: true },
      { time: "17:00", event: "Boarding in progress", done: false },
      { time: "17:08", event: "Revised departure", done: false },
    ],
  },
  {
    id: "t3", number: "12004", name: "Lucknow Shatabdi Exp",
    origin: "New Delhi", destination: "Lucknow",
    platform: 12, scheduled: "15:35", expected: "15:35",
    status: "departed", delayMin: 0, capacity: 1100, estimatedPax: 0,
    coachCount: 14,
    nextStop: { name: "Ghaziabad", eta: "15:55", distanceKm: 24 },
    timeline: [
      { time: "15:20", event: "Boarding completed", done: true },
      { time: "15:35", event: "Departed on time", done: true },
    ],
  },
  {
    id: "t4", number: "12259", name: "Sealdah Duronto Exp",
    origin: "Sealdah", destination: "New Delhi",
    platform: 7, scheduled: "16:50", expected: "16:54",
    status: "arriving", delayMin: 4, capacity: 1240, estimatedPax: 1116,
    coachCount: 21,
    nextStop: { name: "Terminating · NDLS", eta: "17:00", distanceKm: 0 },
    timeline: [
      { time: "16:32", event: "Departed Ghaziabad", done: true },
      { time: "16:48", event: "Entered NDLS yard", done: true },
      { time: "16:54", event: "Arriving at PF 7", done: false },
      { time: "17:05", event: "Passenger de-boarding", done: false },
    ],
  },
  {
    id: "t5", number: "12626", name: "Kerala Express",
    origin: "New Delhi", destination: "Thiruvananthapuram",
    platform: 9, scheduled: "17:15", expected: "17:15",
    status: "on-time", delayMin: 0, capacity: 1480, estimatedPax: 740,
    coachCount: 24,
    nextStop: { name: "Mathura Jn", eta: "18:32", distanceKm: 141 },
    timeline: [
      { time: "16:30", event: "Rake under maintenance", done: true },
      { time: "16:55", event: "Rake placement scheduled", done: false },
      { time: "17:15", event: "Departure", done: false },
    ],
  },
  {
    id: "t6", number: "12423", name: "Dibrugarh Rajdhani",
    origin: "New Delhi", destination: "Dibrugarh",
    platform: 5, scheduled: "16:45", expected: "16:45",
    status: "boarding", delayMin: 0, capacity: 1260, estimatedPax: 1071,
    coachCount: 21,
    nextStop: { name: "Moradabad", eta: "18:55", distanceKm: 150 },
    timeline: [
      { time: "16:10", event: "Rake placed", done: true },
      { time: "16:25", event: "Boarding started", done: true },
      { time: "16:45", event: "Departure", done: false },
    ],
  },
  {
    id: "t7", number: "22691", name: "KSR Bengaluru Rajdhani",
    origin: "Hazrat Nizamuddin", destination: "KSR Bengaluru",
    platform: 14, scheduled: "17:30", expected: "17:30",
    status: "on-time", delayMin: 0, capacity: 1240, estimatedPax: 620,
    coachCount: 20,
    nextStop: { name: "Mathura Jn", eta: "18:12", distanceKm: 141 },
    timeline: [
      { time: "17:00", event: "Rake placement", done: false },
      { time: "17:15", event: "Boarding starts", done: false },
      { time: "17:30", event: "Departure", done: false },
    ],
  },
  {
    id: "t8", number: "12309", name: "Rajendra Nagar Rajdhani",
    origin: "Rajendra Nagar T", destination: "New Delhi",
    platform: 16, scheduled: "16:40", expected: "16:58",
    status: "delayed", delayMin: 18, capacity: 1280, estimatedPax: 1152,
    coachCount: 22,
    nextStop: { name: "Terminating · NDLS", eta: "17:00", distanceKm: 0 },
    timeline: [
      { time: "16:15", event: "Departed Aligarh", done: true },
      { time: "16:50", event: "Held at outer signal", done: true },
      { time: "16:58", event: "Arriving at PF 16 (revised)", done: false },
    ],
  },
];

export const ZONES = [
  { id: "ent-paharganj", label: "Entry • Paharganj", type: "entry", x: 6, y: 18 },
  { id: "ent-ajmeri", label: "Entry • Ajmeri Gate", type: "entry", x: 6, y: 82 },
  { id: "exit-main", label: "Exit • Main Concourse", type: "exit", x: 94, y: 50 },
  { id: "wait-1", label: "Waiting Hall A", type: "waiting", x: 18, y: 30 },
  { id: "wait-2", label: "AC Lounge", type: "waiting", x: 18, y: 70 },
  { id: "rest-1", label: "Restricted • Track Yard", type: "restricted", x: 82, y: 10 },
  { id: "med-1", label: "Medical Room A", type: "medical", x: 30, y: 8 },
  { id: "med-2", label: "Medical Room B", type: "medical", x: 70, y: 92 },
  { id: "rpf-1", label: "RPF Post North", type: "rpf", x: 26, y: 92 },
  { id: "rpf-2", label: "RPF Post South", type: "rpf", x: 74, y: 8 },
  { id: "food", label: "Food Court", type: "facility", x: 50, y: 95 },
  { id: "ticket", label: "Ticketing Counter", type: "facility", x: 12, y: 50 },
] as const;

export const SOP_TEMPLATES: Record<string, string[]> = {
  medical: [
    "Medical team dispatched",
    "Patient stabilized on-site",
    "First-aid administered",
    "Stretcher / wheelchair arranged",
    "Patient moved to Medical Room",
    "Family / kin notified",
    "Incident logged in register",
  ],
  intrusion: [
    "RPF squad deployed",
    "Suspect detained / cleared",
    "Track inspection performed",
    "Loco pilot alerted",
    "CCTV footage secured",
    "FIR filed at RPF post",
  ],
  crowd: [
    "PA announcement issued",
    "Additional RPF deployed",
    "Crowd-control barricades placed",
    "Entry temporarily regulated",
    "Medical standby positioned",
    "Adjacent platform opened",
    "Crowd density restored to safe levels",
  ],
  fire: [
    "Fire alarm activated",
    "Evacuation announcement made",
    "Fire tenders called",
    "Affected zone isolated",
    "Passenger headcount conducted",
    "Power isolated in zone",
  ],
};

export const STAFF_MATRIX = {
  rpf: { name: "RPF", min: 4, max: 6, color: "info" },
  ticket: { name: "Ticket Checking", min: 3, max: 4, color: "accent" },
  crowd: { name: "Crowd Management", min: 6, max: 8, color: "primary" },
  medical: { name: "Medical Support", min: 1, max: 2, color: "success" },
};
