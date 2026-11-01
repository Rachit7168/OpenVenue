# Performance

Measured on 1 November 2026 on this computer. The display refresh caps animation frames at about 16.6 ms (60 fps). A scene that stays on that number did not drop a frame during the sample. It does not show how much spare time is left.

## Machine

- GPU: Mesa Intel UHD Graphics (TGL GT1), integrated
- Chrome renderer: ANGLE (Intel, Mesa Intel(R) UHD Graphics (TGL GT1), OpenGL 4.6)
- Firefox renderer: Intel HD Graphics (Firefox hides the exact device name)
- Window: 1280×720
- Safari: not installed. This computer is Linux.
- A second, mid-range GPU: not present. Only the integrated Intel graphics were measured.

## Scenes

Both halls are one room with a grid of simple boxes, spaced so they do not overlap.

- **500 tables.** Each table is its own mesh, 1.2 × 0.75 × 0.8 m, on a 1.6 m grid.
- **2,000 chairs.** Same size, 0.46 × 0.88 × 0.46 m, on a 0.8 m grid. The 3D view draws them as one instanced mesh.

## Building the halls

Timed in Node after one warmup run, with the same code the editor uses.

| Scene        | Build the 3D group | Planning checks | Capacity |
| ------------ | -----------------: | --------------: | -------: |
| 500 tables   |              21 ms |           27 ms |        — |
| 2,000 chairs |              21 ms |          253 ms |    49 ms |

Checks report no warnings. Capacity counts 2,000 seats. The tests in `packages/editor-core` and `packages/renderer-3d` fail if these steps become several seconds slower.

## Drawing a frame

Thirty frames after a short warmup, high quality unless noted. Both browsers stayed on the 60 fps cap.

| Scene                |  Chrome | Firefox |
| -------------------- | ------: | ------: |
| 500 tables, high     | 16.6 ms | 16.3 ms |
| 2,000 chairs, high   | 16.6 ms | 16.6 ms |
| 2,000 chairs, simple | 16.6 ms | 16.6 ms |

Chrome also spent 25 ms building the 500-table hall and 18 ms building the 2,000-chair hall. Firefox spent 45 ms and 13 ms. Checks in the page matched the Node timings within a few hundred milliseconds.

## Repeat

Start the editor, then:

```bash
node scripts/browser-benchmark.mjs
```

The page is `/benchmark`. It is not linked from the site. The script opens Chrome and Firefox, asks each one to post its timings, and prints the JSON.
