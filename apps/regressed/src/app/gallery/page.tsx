'use client';

// B4 DEFECT, route 1 of 2. Byte-identical to apps/baseline/src/app/gallery/page.tsx.
// Client Component on purpose: a Server Component would render the icons to HTML and
// ship no JS at all, hiding the defect. The only difference from baseline is
// next.config — baseline lists react-feather under experimental.optimizePackageImports,
// this app does not, so the whole barrel ships.
import {
  Anchor,
  Aperture,
  Award,
  Camera,
  Cloud,
  CloudSnow,
  Compass,
  Droplet,
  Feather,
  Flag,
  Map,
  Moon,
  Navigation,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
} from 'react-feather';

import GlobalTicker from '../GlobalTicker';

const ICONS = [
  { Icon: Map, label: 'mapped' },
  { Icon: Compass, label: 'navigation' },
  { Icon: Droplet, label: 'waterfall' },
  { Icon: Sun, label: 'exposed' },
  { Icon: CloudSnow, label: 'glacier' },
  { Icon: Wind, label: 'ridge' },
  { Icon: Cloud, label: 'overcast' },
  { Icon: Thermometer, label: 'alpine' },
  { Icon: Flag, label: 'summit' },
  { Icon: Navigation, label: 'loop' },
  { Icon: Camera, label: 'viewpoint' },
  { Icon: Feather, label: 'birding' },
  { Icon: Anchor, label: 'lakeside' },
  { Icon: Aperture, label: 'panorama' },
  { Icon: Award, label: 'classic' },
  { Icon: Moon, label: 'night-hike' },
  { Icon: Star, label: 'featured' },
  { Icon: Sunrise, label: 'dawn-patrol' },
  { Icon: Sunset, label: 'golden-hour' },
  { Icon: Umbrella, label: 'rain-gear' },
];

export default function GalleryPage() {
  return (
    <>
      <GlobalTicker />
      <h1>Feature gallery</h1>
      <div className="icon-grid">
        {ICONS.map(({ Icon, label }) => (
          <div className="icon-cell" key={label}>
            <Icon size={28} strokeWidth={1.5} />
            {label}
          </div>
        ))}
      </div>
    </>
  );
}
