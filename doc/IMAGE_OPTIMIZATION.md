# Lossless image optimization — 5 November 2026

Image dimensions, crops, responsive sizes, preview quality settings and motion
remain unchanged. This update optimizes stored PNGs, full-resolution screenshot
downloads and cache behavior. It does not claim a measured first-load speedup.

## Results

| Full-resolution screenshot | Previous PNG bytes | Lossless WebP bytes | Reduction |
| --- | ---: | ---: | ---: |
| Branch overview | 578,377 | 377,786 | 34.7% |
| Arrival management | 211,134 | 66,586 | 68.5% |
| Expenses | 227,338 | 77,906 | 65.7% |
| Total | 1,016,849 | 522,278 | 48.64% |

Six existing PNG files were also recompressed in place, from 3,520,172 to
2,802,806 bytes: 717,366 bytes saved (20.38%). This includes images not requested
by the current page. Old PNG URLs remain available. The portrait's source bytes
are unchanged; lossless re-encoding made that already-compressed file larger.

## Pixel and delivery guarantees

- `scripts/optimize-images.cjs` uses the installed Sharp package. PNG output uses
  compression level 9, adaptive filtering and no palette reduction. Full-size
  WebP output uses lossless mode with effort 6. Existing metadata is retained.
- Before writing, the script compares complete decoded RGBA buffers, bit depth and image
  dimensions with the input. All six PNGs and all three full-size WebPs passed.
  SHA-256 hashes of the decoded buffers are recorded in the local result manifest.
- Resized page previews retain PNG input and their existing quality 88. Changing
  their input format to WebP produced a different resampling result despite
  identical full-size source pixels, so that path was rejected.
- Nine Next.js-generated WebP previews (three screenshots at widths 480, 750
  and 2560) were compared against previews generated from the previous PNGs.
  Their decoded pixel hashes matched exactly. Hero source bytes, quality 75/88,
  and every existing `sizes` value are unchanged.
- Static imports in `src/lib/portfolioImages.ts` produce content-hashed URLs.
  Work and the first case chapter use the same imported PNG source. Only the
  full-screenshot links use the corresponding lossless WebP via `fullSrc`.
- Production-mode local HTTP checks found `immutable` cache headers on the raw
  hashed assets and Next.js resized responses. Asset changes generate a new URL,
  so long caching does not prevent later image updates.

## Verification

The final isolated production build and its TypeScript check passed. The existing
visual regression passed: the hovered shared frame covers its destination,
reverse restores its position within 1px, and the default-text responsive checks
passed at 320/390/768/1024px with reduced motion.

Touch emulation at 390×844 verified one mobile portrait request at quality 75,
deferred later case screenshots, all three loaded figures, no horizontal
overflow, matching Work/case source URLs, and HTTP 200 for old PNG links. All
full-size WebPs returned the expected byte counts and `image/webp`; a real tap
opened the 2800×2640 screenshot in another tab.

Evidence and original comparison files are under the ignored
`.shots/image-optimization-2026-11-05` folder. Run
`node scripts/optimize-images.cjs` to regenerate and verify assets. This is a
manual maintenance command, not a build or page-load step. No dependency was added.

Physical-device/Safari checks remain pending. This work does not fix the earlier
mobile audit's larger-text layout, startup JavaScript or liquid-footer issues.

Application commit `f807f0d` was published to GitHub main and Vercel production.
Deployment `dpl_GHmeiCF233LQ69FY5cme3aCJdgHb` reached READY. Hosted full-size
downloads matched the verified local files' SHA-256 hashes, returned HTTP 200 and
had one-year immutable caching; the legacy branch PNG also returned 200.
A second optimization run left all image files byte-identical.
