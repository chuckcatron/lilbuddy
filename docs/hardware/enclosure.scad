// =====================================================================
//  lil' buddy — desk enclosure (parametric)
//  4.2" 400x300 SSD1683 e-paper · ESP32-S3 · 3-key HID chin
//  Integrated ~15° wedge · 3 printed parts (PETG) · serviceable back
//
//  Everything is a variable. The numbers below are PLACEHOLDERS keyed
//  off datasheet/ballpark values — confirm the ones marked [MEASURE]
//  with calipers on the real panel before printing.
//
//  Open in OpenSCAD, set `part` to preview/export each piece.
// =====================================================================

/* [Render] */
part   = "all";   // [bezel, body, lid, all, exploded]
$fn    = 64;

/* [Panel — MEASURE the real part] */
glass_w   = 91.0;   // [MEASURE] glass outline width
glass_h   = 77.0;   // [MEASURE] glass outline height
glass_t   = 1.2;    // [MEASURE] glass thickness
active_w  = 84.8;   // visible active area width  (400 px @ 0.212 mm)
active_h  = 63.6;   // visible active area height (300 px @ 0.212 mm)
active_dx = 0.0;    // [MEASURE] active-area offset from glass center, X
active_dy = 4.0;    // [MEASURE] active-area offset from glass center, Y
gasket_t  = 0.8;    // PORON/foam behind glass (compliant capture)

/* [Bezel] */
bezel_border = 8.0;   // frame around the active area
chin_h       = 18.0;  // extra bottom border that carries the buttons
front_t      = 3.0;   // bezel face thickness (the visible lip)
corner_r     = 6.0;   // outer corner radius
pocket_extra = 0.4;   // glass pocket clearance per side

/* [Chin buttons] */
n_buttons = 4;        // Approve / Deny / Ack / Cycle  (3 drops Cycle)
btn_hole  = 14.0;     // plunger / keycap-stem clearance hole dia
btn_pitch = 24.0;     // center-to-center spacing (24 keeps 4 keys clear of the corners)
btn_row_dy = 0.0;     // nudge the button row within the chin

/* [Body / wedge] */
lean        = 15;     // back-lean of the screen face, degrees
body_depth  = 75.0;   // front-to-back footprint at the base
wall        = 2.4;    // shell wall thickness
cavity_back_clear = 6.0; // air gap behind boards before the lid

/* [Back lid + fasteners] */
screw_d   = 3.2;      // M3 clearance hole (lid)
insert_d  = 4.0;      // heat-set insert pilot OD (body bosses)
boss_d    = 8.0;      // screw boss diameter
lid_clr   = 0.2;      // print-fit clearance, lid into body
n_screws  = 4;

/* [USB-C rear cutout] */
usb_w = 12.0; usb_h = 7.0; usb_z = 8.0;  // width, height, height above base

/* [Board mounting pegs — placeholder positions, refine in GUI] */
// [x, y] in bezel-face coords (origin = face center). Pilot pegs for
// self-tapping M2/M2.5 into the ESP32 board and the eInk breakout.
esp_pegs    = [[-24,-6], [24,-6], [-24,18], [24,18]];
brk_pegs    = [[-30,-22], [-12,-22]];
peg_h       = 6.0;
peg_d       = 5.0;
peg_pilot_d = 1.8;

/* ---- derived ---- */
face_w = active_w + 2*bezel_border;
face_h = active_h + 2*bezel_border + chin_h;
// screen window center sits ABOVE face center because the chin is at the bottom
scr_cy = chin_h/2 + active_dy;
chin_cy = -(face_h/2 - chin_h/2) + btn_row_dy;
pocket_t = glass_t + gasket_t;          // depth of the glass pocket from the back face
front_h_y = face_h*cos(lean);           // projected height of the leaned face
front_top_x = face_h*sin(lean);

// guard: the chin button row must fit within the bezel face (minus rounded corners)
btn_span = (n_buttons-1)*btn_pitch + btn_hole;
assert(btn_span <= face_w - 2*corner_r,
       "Chin button row too wide for the bezel face — reduce btn_pitch or n_buttons");

// ---------------------------------------------------------------------
//  helpers
// ---------------------------------------------------------------------
module rslab(w, h, t, r) {           // rounded slab, centered in XY, base z=0
    hull() for (sx=[-1,1], sy=[-1,1])
        translate([sx*(w/2-r), sy*(h/2-r), 0]) cylinder(h=t, r=r);
}

// ---------------------------------------------------------------------
//  PART 1 — front bezel  (printed face-DOWN for a smooth front)
// ---------------------------------------------------------------------
module bezel() {
    difference() {
        rslab(face_w, face_h, front_t + pocket_t, corner_r);

        // glass + gasket pocket, opened from the BACK
        translate([active_dx, scr_cy, front_t])
            rslab(glass_w + 2*pocket_extra, glass_h + 2*pocket_extra, pocket_t + 1, 2);

        // viewing window through the front lip = active area
        translate([active_dx, scr_cy, -1])
            rslab(active_w, active_h, front_t + 2, 1.5);

        // chin button holes
        for (i = [0:n_buttons-1])
            translate([(i-(n_buttons-1)/2)*btn_pitch, chin_cy, -1])
                cylinder(h = front_t + pocket_t + 2, d = btn_hole);
    }
}

// ---------------------------------------------------------------------
//  PART 2 — wedge body  (open at the back for the lid)
//  Side profile in XY (X = depth, Y = height), extruded across width.
// ---------------------------------------------------------------------
module wedge_solid(depth, width, inset=0) {
    // outer trapezoid: front face leans back by `lean`
    p0 = [0 + inset,              0 + inset];
    p1 = [depth - inset,          0 + inset];
    p2 = [depth - inset,          front_h_y - inset];
    p3 = [front_top_x + inset,    front_h_y - inset];
    translate([0,0,-width/2])
        linear_extrude(width)
            polygon([p0,p1,p2,p3]);
}

module body() {
    difference() {
        // outer shell, width = face_w
        wedge_solid(body_depth, face_w);

        // hollow cavity (leave walls)
        translate([wall, wall, 0])
            wedge_solid(body_depth - 2*wall, face_w - 2*wall, inset=0);

        // open the BACK face for the lid (cut a rectangular mouth)
        translate([body_depth - wall - 0.01, wall, -face_w/2 + wall])
            cube([wall + 1, front_h_y, face_w - 2*wall]);

        // USB-C cutout on the back wall
        translate([body_depth - wall - 1, usb_z, -usb_w/2])
            cube([wall + 2, usb_h, usb_w]);
    }

    // board mounting pegs rise off the inner front face (approx — refine in GUI)
    for (p = concat(esp_pegs, brk_pegs))
        translate([wall + 2, front_h_y/2 + p[1], p[0]])
            rotate([0,90,0]) difference() {
                cylinder(h = peg_h, d = peg_d);
                translate([0,0,1]) cylinder(h = peg_h, d = peg_pilot_d);
            }
}

// ---------------------------------------------------------------------
//  PART 3 — back lid  (heat-set inserts go in the BODY; screws through lid)
// ---------------------------------------------------------------------
module lid() {
    difference() {
        translate([0,0,0])
            rslab(face_w - 2*wall - 2*lid_clr, front_h_y - 2*lid_clr, wall, 3);
        for (i = [0:n_screws-1]) {
            ang = 90*i + 45;
            rx = (face_w/2 - boss_d) * cos(ang);
            ry = (front_h_y/2 - boss_d) * sin(ang);
            translate([rx, ry, -1]) cylinder(h = wall + 2, d = screw_d);
        }
    }
}

// ---------------------------------------------------------------------
//  assemblies
// ---------------------------------------------------------------------
module assembled() {
    color("gainsboro") body();
    // bezel rotated onto the leaned front face
    color("white")
        rotate([0,0,0])
        translate([0, 0, 0])
        rotate([0, lean, 0])
        translate([ -1, front_h_y/2, 0])
        rotate([90,0,90]) bezel();
    color("dimgray")
        translate([body_depth - wall - lid_clr, front_h_y/2, 0])
        rotate([0,90,0]) lid();
}

module exploded() {
    spacing = 60;
    color("gainsboro") body();
    color("white")
        translate([-spacing, front_h_y/2, 0]) rotate([0,lean,0]) rotate([90,0,90]) bezel();
    color("dimgray")
        translate([body_depth + spacing, front_h_y/2, 0]) rotate([0,90,0]) lid();
}

// ---------------------------------------------------------------------
//  dispatch
// ---------------------------------------------------------------------
if      (part == "bezel")    bezel();
else if (part == "body")     body();
else if (part == "lid")      lid();
else if (part == "exploded") exploded();
else                         assembled();
