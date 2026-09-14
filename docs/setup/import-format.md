# Liste de colisage import

Import unit: **one liste de colisage sheet = one truck + bags**.  
A company `.xlsx` can hold many `装` sheets; a CSV is one truck. Upload accepts one or more such files.

## Primary format: Luilu company export

Matches the official paper/CSV layout (letterhead, two-column truck header, bag table, TOTAL footer).

Canonical fixtures: [`fixtures/import/bp049-lu-ex-colisage.xlsx`](../../fixtures/import/bp049-lu-ex-colisage.xlsx) (original company workbook; packing lists on `1装`–`n装`), [`fixtures/import/luilu-liste-de-colisage-EX202609-0376.csv`](../../fixtures/import/luilu-liste-de-colisage-EX202609-0376.csv) (single-truck CSV).

Parsed fields:

| Paper label | System field |
|-------------|--------------|
| N° DE LISTE DE COLISAGE | `trucks.packing_list_number` |
| DESCRIPTION | `cargo_description` |
| DATE | `loading_date` |
| CHEVAL | `vehicle_registration` |
| CHARIOT-REMORQUE 1 | `trailer_registration` |
| CHARIOT-REMORQUE 2 | `trailer_registration_2` |
| CONDUCTEUR | `driver_name` |
| PASSPORT | `driver_passport_reference` |
| LIEU DE CHARGEMENT | `loading_location` |
| TRANSPORTEUR | `transporter_name` |
| TRANSIT | `transit_info` |
| BORDER | `border` |
| AGENT | `agent` |
| BAG NO. / NET WEIGHT(KG) / SEAL NO. | `bags.*` |

`NA`, `N/A`, `/` are treated as empty. The TOTAL row and signature block are ignored (bag weights are summed from bag rows).

Also accepts `.xlsx`. A company workbook may contain one `装` sheet per truck (skip `BP` / `发` / `放`). A CSV or single-sheet file is still one truck. Excel date cells use the displayed value (`11-Sep-26`). `LIEU DE CHARGEMENT` may share a cell with its value.

## Alternate formats (still supported)

- Denormalized CSV (truck fields repeated on each bag row) — see `liste-de-colisage-sample.csv`
- Simple key/value metadata + bag table — see `liste-de-colisage-keyvalue-sample.csv`

## Desktop flow

1. Import the Loading Order on Pre-alerts (expected trucks). The yard agent confirms arrival on the phone; unplanned register is only if the plate is not on a pre-alert.
2. Management imports a Loading Program / BP on Loading (or assigns arrived trucks to a program date on Yard — bridge for trucks not yet on a BP)
3. Upload (top nav) for that loading date
4. Select one or more `.csv` / `.xlsx` files (a BP049-style workbook imports every `装` sheet)
5. Preview trucks / bags / validation issues
6. Choose **Append** or **Replace**
7. Confirm import — bags attach to existing plates; a new truck is created only if that plate is not already open

Replace updates pending bags on waiting trucks. It does not delete yard-registered trucks.

Export/print (V1, ADR-002): **implemented** — desktop TopNav Export builds a PDF from truck+bags (letterhead close to this liste-de-colisage structure), downloads it, opens print, and writes an `exported` audit event. Pixel-identical paper clone is not required. Excel/CSV remains the **import** path (optional report CSV may come later). Mandarin letterhead glyph embedding is deferred (Latin Helvetica in V1 PDF).

## Loading Order / pre-alert

Same layout for every client. Canonical fixtures (Glencore Luilu sample): [`fixtures/import/loading-order-glencore-luilu.xlsx`](../../fixtures/import/loading-order-glencore-luilu.xlsx), [`fixtures/import/loading-order-glencore-luilu.json`](../../fixtures/import/loading-order-glencore-luilu.json).

Sheet `Luilu`. Header labels are exact: CLIENT, LOADING POINT, OFFLOADING POINT, MONTH, then columns S/N, TRANSPORTER, TRUCK, TRAILER 1, TRAILER 2, DRIVER NAME, PASSPORT, TONNAGE, EXIT BORDER, FINAL DESTINATION, ETA TO MINE.

Import creates **expected** trips (`arrival_status = expected`). `On Site` is not yard arrival. Matching later BPs uses normalized horse registration only — transporter names are stored exactly as written (FORSH is not rewritten).

Desktop: Pre-alerts → Import Loading Order → preview → confirm. Implausible ETA TO MINE years (before 2020 or after 2026) are warnings, never auto-corrected. Preview groups them under Requires review so management can keep the source date, edit it, or clear it; `eta_raw` remains the original cell value.

## Bulletin de pesage / Loading Program / BP

Canonical fixtures: [`fixtures/import/bp049-lu-ex-conc.xlsx`](../../fixtures/import/bp049-lu-ex-conc.xlsx) (original company workbook), [`fixtures/import/bp049-lu-ex-conc.csv`](../../fixtures/import/bp049-lu-ex-conc.csv), [`fixtures/import/bp049-lu-ex-conc.json`](../../fixtures/import/bp049-lu-ex-conc.json).

Sheet `BP` (skip workbook sheets 装 / 发 / 放). Header is `BULLETIN DE PESAGE/WEIGHTING SHEET:…`. Columns: NO., LOT NO., HORSE NO., TRAILER 1, TRAILER 2, CONTAINER NO, DRIVER NAME, PASSPORT, TRANSPORTER, BORDER, PKGS, G.W(T), N.W(T). Skip TOTAL / SIGNATURE. `NA` = empty. Excel date cells use the displayed value (`d-mmm-yy`, e.g. 11-Sep-26).

`loading_lists` is that entity (not a packing-list bundle). Identity: `bulletin_number` (full sheet title) + display `program_code` (e.g. BP049). Per-truck packing list remains `trucks.packing_list_number` (LOT / EXLOT) + `bags`.

Desktop: Loading → Import Loading Program / BP → preview matches by normalized horse plate → confirm. Unmatched horses may be created as unplanned. Yard-confirmed fields are never silently overwritten; management keeps yard (default) or applies BP. Export BP Excel clones the company BP049 sheet layout (letterhead including Chinese, column widths, merges, `11-Sep-26` date). TopNav Upload remains packing-list import; TopNav Export remains packing-list PDF. Do not export the 装 / 发 / 放 sheets from the source workbook.
