# lil' buddy — enclosure

Parametric desk enclosure for the 4.2" 400×300 SSD1683 e-paper + ESP32-S3, with a
3-key HID "chin" control surface. Integrated ~15° wedge, 3 printed parts, serviceable back.

> Status: **first-pass parametric skeleton.** Geometry is coherent but the panel
> dimensions and board-peg positions are placeholders — confirm the `[MEASURE]`
> variables in `enclosure.scad` with calipers before printing a real unit.

## Parts

| Part | File var | Print orientation | Notes |
|------|----------|-------------------|-------|
| Front bezel | `part="bezel"` | **face down** | Smooth visible front; glass pocket + button holes face up |
| Wedge body | `part="body"` | base down | Holds boards; FFC channel + USB-C cutout; open back |
| Back lid | `part="lid"` | flat | M3 screws through lid into heat-set inserts in the body |

Open in [OpenSCAD](https://openscad.org), set `part` (top of the file) to
`bezel` / `body` / `lid` / `all` / `exploded`, then `F6` to render and export STL.

## Key parameters to dial in first

```
glass_w / glass_h / glass_t    // [MEASURE] real panel outline
active_dx / active_dy          // [MEASURE] active-area offset on the glass
bezel_border, chin_h           // visual frame + button strip height
n_buttons, btn_pitch, btn_hole // chin keys (4: Approve/Deny/Ack/Cycle; set 3 to drop Cycle)
lean, body_depth               // wedge stance + internal volume
esp_pegs / brk_pegs            // board mounting peg positions (refine in GUI)
```

## Glass retention (do this right or you crack panels)

- Glass seats in a back-side **pocket** against a front **lip** — never screw-clamped.
- A `gasket_t` PORON/foam layer behind the glass gives compliant capture.
- The FFC tail folds back into the body; keep a ≥3 mm fold radius (no sharp crease).

## Two tiers (same body CAD)

| | Base / kit | Premium |
|--|-----------|---------|
| Switches | Through-hole tact + printed caps | Kailh Choc v1 + custom keycaps |
| Finish | As-printed PETG | Sand → filler-prime → matte paint |
| Build | You solder | Assembled & tested |

Adjust `btn_hole` for the chosen switch/keycap (tact plunger vs Choc stem).

## Added BOM (beyond the electronics)

- PETG filament (PLA will sag on a sunny desk — use PETG)
- 4× M3 heat-set inserts + 4× M3 screws (back lid)
- PORON / EVA foam strip (glass gasket)
- Switches: tact (base) or Kailh Choc v1 + keycaps (premium)
- Optional baseboard PCB (carries switches + ESP32/breakout headers) — turns
  hand-wiring into solder-and-go; worth it even at 5–10 units/month.

## Open items before a printable v1

1. Replace `[MEASURE]` panel values with caliper readings.
2. Verify board-peg positions against the actual ESP32-S3 + breakout footprints.
3. Refine the FFC fold channel and USB-C throat strain-relief in the GUI.
4. Print a bezel-only test to check the glass pocket + lip fit before a full set.
