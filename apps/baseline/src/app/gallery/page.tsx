'use client';

// B4 fixture, route 1 of 2. Must be a Client Component: a Server Component renders
// icons to HTML and ships zero JS, which makes the barrel defect unobservable.
// Same import syntax as apps/regressed — the only difference is that baseline's
// next.config enables optimizePackageImports for react-feather, which is exactly
// the fix suggest_optimizations recommends.
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
