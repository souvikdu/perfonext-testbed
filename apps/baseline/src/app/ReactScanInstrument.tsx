'use client';

// instrument() MUST run at module-evaluation time, not inside useEffect.
// react-scan installs __REACT_DEVTOOLS_GLOBAL_HOOK__, and React only reads that hook
// while initialising its renderer during hydration. A useEffect fires after hydration,
// so the hook lands too late and every capture silently ends with commitCount: 0.
// render-mcp documents instrumentation-client.js for this reason; that file needs
// Next 15.3+, so on 15.1 a module-scope side effect is the earliest equivalent.
//
// The endpoint and session id come from a runtime global rather than NEXT_PUBLIC_* env,
// because Next inlines those at build time and the session id changes every capture.
// Playwright injects the global with addInitScript, which runs before any page script.
import { instrument } from 'react-scan/lite';

declare global {
  interface Window {
    __PERFONEXT__?: { endpoint: string; sessionId: string };
    __PERFONEXT_STATE__?: string;
    __PERFONEXT_EVENT_COUNT__?: number;
  }
}

if (typeof window !== 'undefined') {
  const injected = window.__PERFONEXT__;
  const endpoint = injected?.endpoint ?? process.env.NEXT_PUBLIC_PERFONEXT_ENDPOINT;
  const sessionId = injected?.sessionId ?? process.env.NEXT_PUBLIC_PERFONEXT_SESSION_ID;

  if (!endpoint || !sessionId) {
    window.__PERFONEXT_STATE__ = 'skipped: no endpoint/sessionId';
  } else {
    try {
      instrument({
        endpoint,
        sessionId,
        recordChangeDescriptions: true,
        includeFiberSource: true,
        includeFiberIdentity: true,
        onEvent: () => {
          window.__PERFONEXT_EVENT_COUNT__ = (window.__PERFONEXT_EVENT_COUNT__ ?? 0) + 1;
        },
      });
      window.__PERFONEXT_STATE__ = 'instrumented';
    } catch (error) {
      window.__PERFONEXT_STATE__ = `failed: ${(error as Error).message}`;
    }
  }
}

export default function ReactScanInstrument() {
  return null;
}
