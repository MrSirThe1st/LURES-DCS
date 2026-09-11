# Liste de colisage import

Import unit: **one liste de colisage file = one truck + bags**.  
A packing list (bulletin bundle) is imported by selecting **multiple** such files in one session.

## Primary format: Luilu company export

Matches the official paper/CSV layout (letterhead, two-column truck header, bag table, TOTAL footer).

Canonical fixture: [`fixtures/import/luilu-liste-de-colisage-EX202609-0376.csv`](../../fixtures/import/luilu-liste-de-colisage-EX202609-0376.csv)

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

Also accepts `.xlsx` with the same sheet layout.

## Alternate formats (still supported)

- Denormalized CSV (truck fields repeated on each bag row) — see `liste-de-colisage-sample.csv`
- Simple key/value metadata + bag table — see `liste-de-colisage-keyvalue-sample.csv`

## Desktop flow

1. Upload (top nav)
2. Choose loading date + optional bulletin reference
3. Select one or more `.csv` / `.xlsx` files
4. Preview trucks / bags / validation issues
5. Choose **Append** or **Replace**
6. Confirm import

Export/print (V1, ADR-002): **implemented** — desktop TopNav Export builds a PDF from truck+bags (letterhead close to this liste-de-colisage structure), downloads it, opens print, and writes an `exported` audit event. Pixel-identical paper clone is not required. Excel/CSV remains the **import** path (optional report CSV may come later). Mandarin letterhead glyph embedding is deferred (Latin Helvetica in V1 PDF).