import { NextResponse } from 'next/server';
import { generateTrails } from '@testbed/data';
import { extractSeasons, scoreAll } from '@testbed/compute';
import { normalizeQuery } from '@testbed/compute/slow/normalize.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get('q') ?? '');
  const trails = generateTrails();

  const scored = scoreAll(trails);
  const seasons = extractSeasons(trails);
  const matches = query
    ? trails.filter((t) => t.name.toLowerCase().includes(query))
    : trails.slice(0, 50);

  return NextResponse.json({
    query,
    matched: matches.length,
    scored: scored.length,
    seasons: seasons.length,
    top: matches.slice(0, 10).map((t) => ({ slug: t.slug, name: t.name, region: t.region })),
  });
}
