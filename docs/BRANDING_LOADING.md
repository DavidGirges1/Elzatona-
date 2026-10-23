# Owner logo and page-loading animation

The owner explicitly supplied the olive logo and green three-circle loading animation. Their artwork colors are preserved; the rest of Elzatona's teal/pastel design tokens and Arabic typography remain unchanged.

## Original logo

`public/brand/elzatona-logo.png` is the exact PNG extracted from the owner's RAR: **2000×2000**, RGBA, **416,165 bytes**, alpha range **0–255**. SHA-256: `db64786e7939ec5d8c79be732c95c3f31b7d5188b0cd842115a3eb664898624e`.

`BrandName` and `BrandMark` in `src/components/brand.tsx` are used by the landing, Auth, student and admin shells and the illustrative product preview. Header marks occupy 40px (36px mobile), rail marks 48px, with an 8px name gap. CSS accounts for the source's transparent margins without changing its pixels or clipping opaque artwork. Next Image serves small optimized variants. Paired images have empty alt text; the rail link keeps its Arabic accessible name. Navigation destinations are retained.

## Loading animation

The unchanged uploaded archive is retained at `public/animations/loading.lottie` (**1,057 bytes**, SHA-256 `859fb777ed5e28eeca95dbeda9eaa0778aae22004aa9647b802fe3dabeda6f0c`). Its inspected JSON contains three vector circles and no external assets or expressions.

The extracted source is `src/components/loading/animation.json`. `scripts/export-loading-animation.mjs` converts this specific inspected asset to `motion.json`: original circle sizes/colors, stacking order, curved paths, anchors, cubic easing and two-second loop. It is deliberately not a general Lottie importer. Regenerate with:

```bash
node scripts/export-loading-animation.mjs
```

`PageLoading` renders SVG circles animated by CSS motion paths. This begins while the HTML response is still streaming, without hydration or any animation-player dependency. Reduced-motion preferences, and browsers without motion-path support, receive the static first frame and an Arabic loading status. Root and platform `loading.tsx` use the same component. The fallback disappears naturally when the actual route is ready; no artificial delay or minimum spinner duration is added.

## Verification

Run `node --env-file=.env.local scripts/verify-loading.mjs` against a running local **development** server. It temporarily installs an eight-second Suspense fixture at `/qa-loading-check`, runs the responsive brand/loading suite, and removes the fixture in `finally`. It refuses remote hosts, Vercel execution and overwriting an existing route. This intentional delay is **test-only**, not product behavior. The fixture route must not be committed or deployed.

Brand tests also run against production builds and the deployed domain; fixture-only tests explicitly skip there. Browser checks cover actual image loading, no overflow, rail replacement, moving frames before HTML completion, live reduced-motion switching and removal when the route resolves. A separate local browser check verified animation while application JavaScript was disabled. See IMPLEMENTATION_STATUS.md for exact results and deployment boundaries.

Deployment evidence: application commit `8125ac55b1e37a5a01a7ee3d7cd664e473146272`, Vercel `dpl_3z5MqAu97uizwGtkhwb4jiuXJp39` **READY**. Live browser checks: **52 passed, 8 intentional skips, 1.5 minutes**. Original PNG and dotLottie downloads match the hashes above; the temporary fixture is absent (HTTP 404). Actual moving frames during a pending HTML response, removal when ready, reduced motion, and motion without application JavaScript were verified locally before publication.
