# Clausplex design direction

## Brief
Clausplex is an independent community adaptation of OpenSupaplex with the recognizable Claus character and all 111 original puzzles. The page must make playing obvious within the first frame, keep wallet-free name entry and one global leaderboard, and make the transition from the Claus Network feel immediate. The audience is the Claus community and returning puzzle players, on desktop and phones. Product copy is English.

The existing plain HTML/CSS/JavaScript stack stays: it fits the Claus static sandbox and keeps the original engine, level data, and replay verification intact. Fonts and imagery remain embedded; no new network dependencies. No content placeholders or invented metrics.

## Three concept territories
Scores are internal concept judgments, 1 to 5; portability is better when lower.

| Territory | Concept | Signature / emotion / screenshot | Specific anchor | Originality | Fit | Feasibility | Portability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Material | The escape cabinet: the live puzzle sits in a bold orange cabinet, with a compact player/level/start console beneath it. | A straight-edged ink cabinet moves from a real maze preview into the actual playfield. Curious, tactile, ready. Screenshot: gigantic escape-plan type opposite the real puzzle, with the player console joining both. | Claus orange, original Supaplex tile grid, and the actual playable maze. | 4 | 5 | 5 | 2 |
| Process | A route notebook: the whole experience uses map-like annotations, path lines, and open sketch pages. | A path crosses the page from entry to exit. Thoughtful, exploratory. Screenshot: handwritten route over a maze study. | Solving these puzzles means thinking ahead and testing a route. | 3 | 4 | 4 | 3 |
| Formal | The 111 index: every screen is organized by a strict three-digit level number and compact collection grid. | Large selected numbers reveal the corresponding maze. Archival, systematic. Screenshot: giant level number with a selected tile in an index of 111. | This release contains exactly 111 preserved original levels. | 4 | 4 | 5 | 3 |

Selected: the escape cabinet. It expresses the Claus world immediately, gives real gameplay the main image position, and produces a usable design system for both invitation and play. The other concepts would make navigating a collection more prominent than starting a game.

## Concept card
- **Idea:** One little Claus, 111 escape plans, and a cabinet ready for your next move.
- **Metaphor:** A compact puzzle cabinet with an invitation field, a visible playfield, and a deliberate control console.
- **Signature:** The real maze is the main visual. The selected level changes its preview; Play replaces the invitation with the same ink-framed game stage. Primary controls press and lift like physical pieces. Existing navigation remains immediate.
- **Emotion:** Curious and assured; the game is small enough to try, rich enough to stay.
- **Motion verb:** Click into place.
- **Screenshot:** Orange field, giant “A small escape plan.” type, real maze framed in ink, the Claus maze badge, and a single cream player console.

## Art system
Palette roles: orange ground `#f36b35`, ink `#20211e`, paper/playfield `#fff4d8`, terrain `#e8dec1`, muted ink `#665f50`, spark gold `#efbd55`. Additional object-only colors preserve useful gameplay distinctions: green exit, red disk, gray rock. They are shared by the CSS token layer and 16-color engine artwork palette, never separate per-page themes.

Type: supplied Bricolage Grotesque variable font, under the existing OFL license, covers display and UI. System monospace is only for the selected level reference. Display runs from 60 to 112 px, with tight negative tracking and 0.9 line height. Body runs 16 to 20 px; secondary UI remains 12 to 14 px. Numeric HUD values use tabular figures. Dialogue headings are restrained rather than matching the home display size.

Grid: desktop is a nearly equal 1:1.1 split between invitation and real puzzle, then a full-width three-part player console. Alignment anchors are the left page edge, the puzzle edge, and the console columns. A separate field guide has one title column and four object entries. The phone order is introduction, stacked player console, then the maze preview, so Play is easy to reach; it does not shrink the desktop design. The 80 px host-logo zone remains clear in the upper left.

Shape: 4 px corner radius for cabinets and controls. Only the brand badge, close control, and grab button are circular. No gradient wash, glass panels, fake hardware, glow, or decorative loader.

Motion: primary controls lift 2 to 3 px and press 2 px; arrows slide 3 px along the same direction. One ease family `cubic-bezier(.2,.7,.2,1)` and a 160 ms utility duration. The game remains still at rest by decision: the live puzzle and the original simulation are the meaningful motion. No idle decoration, smooth-scroll engine, or new animation runtime is added to a constrained game. The original gameplay clock remains untouched. Reduced motion removes UI motion while retaining all content.

## Composition

Home, a poster plus work-first asymmetrical pair:

    Clausplex                                  Leaderboard / How to play / All levels
    A community puzzle game                    CL / 001        Selected maze preview
    A small                                    ┌───────────────────────────────────┐
    escape plan.                               │ Actual level terrain and Claus    │
    One little Claus. 111 curious mazes.        └───────────────────────────────────┘
    111 original puzzles                       Maze badge / direct playing advice
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │ Optional nickname       Starting point                 Play / Watch a solve  │
    └──────────────────────────────────────────────────────────────────────────────┘

Field guide, an object strip:

    Meet your obstacles     Claus       Spark       Rock       Exit

Game, a focused cabinet:

    Level / 111, title                                      Pause Restart Home
    ┌──────────────────────────────────────────────────────────────────────────┐
    │ Sparks / Red disks                                               Time   │
    │                       Original playable map                            │
    │ Keyboard controls                                                      │
    └──────────────────────────────────────────────────────────────────────────┘
    Touch direction pad + grab when relevant. Clear progression/save feedback.

Inner states: large headline + small description; level collection grid with strong selected state; one global ranking table; dark pause/loading/result panels with accent action controls. A dedicated 404 is not meaningful inside the host-owned release router; unknown release paths remain handled by Claus rather than inventing an unconnected page.

## Gameplay artwork
The original 16 px atlas addresses, planar format, frame rectangles, movement, collision, timings and puzzles remain unchanged. Newly authored terrain uses a quiet circuit corner on the removable cells, faceted stones with broad faces, a gold four-point spark, green exit, and dark structural blocks. The page, selected preview and runtime all use the same artwork and palette. The official Claus character remains the presentation-layer player.

## Genericness test
A generic game landing page would center a slogan above a decorative mockup and three feature cards. This composition uses the real selected maze, a playable level collection, the exact 111 count, and the original puzzle objects. The orange comes from Claus rather than a palette trend. The removed underline flourish, tilted postcard and circular count stamp were accessories that did not help playing.

## Validation boundary
Production bundle and strict Claus sandbox must be tested at desktop and 390 px, with keyboard and reduced motion, before calling the design complete. Independent critic scores are subjective; accessibility/performance assertions require measured reports. Original engine replays must be rerun after re-embedding the changed visual resources. Never infer gameplay correctness from a screenshot.

## QA implementation notes
Two production-build review passes cover desktop, phone, gameplay, pause, help, levels, final-result fixture, a global leaderboard, pointer treatments, keyboard focus, and reduced CSS motion. The persistent screen-reader heading gives every game state a page-level heading. The embedded font uses a short block period to reduce fallback geometry changes. Startup assets and shared badge imagery are embedded once; the game engine stays on demand.

The original 111 replay solutions passed twice after the visual rebuild. Browser-reported layout and paint timings from background capture are recorded as limited local evidence, not certified mobile Web Vitals or public speed claims. Claus owns the outer black arrival veil and the routing, robots and missing-path responses. A separately prepared upstream veil patch is not deployed by this project.
