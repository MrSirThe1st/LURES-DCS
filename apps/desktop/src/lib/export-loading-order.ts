import type { LoadingOrderRow, Tables } from '@lures-dcs/data-access';
import * as XLSX from 'xlsx';
import { downloadBytes } from './download';
import { formatEtaDate } from './format';

const HEADER_FILL = '002060';

export function downloadLoadingOrderExcel(input: {
  order: Tables<'pre_alerts'>;
  rows: LoadingOrderRow[];
  onSiteLabel: string;
}): void {
  const { order, rows, onSiteLabel } = input;
  const sheet = XLSX.utils.aoa_to_sheet([
    ['', '', 'CLIENT', order.client_name ?? '', '', '', '', '', '', 'MT', 'TRUCKS'],
    [
      '',
      '',
      'LOADING POINT',
      order.loading_point ?? '',
      '',
      '',
      '',
      '',
      'ALLOCATION',
      order.allocation_mt ?? '',
      order.allocation_truck_count ?? '',
    ],
    [
      '',
      '',
      'OFFLOADING POINT',
      order.offloading_point ?? '',
      '',
      '',
      '',
      '',
      'BOOKED',
      order.booked_mt ?? '',
      order.booked_truck_count ?? '',
    ],
    [
      '',
      '',
      'MONTH',
      order.period_month ?? '',
      '',
      '',
      '',
      '',
      'BALANCE',
      order.balance_mt ?? '',
      order.balance_truck_count ?? '',
    ],
    [],
    [
      'S/N',
      'TRANSPORTER',
      'TRUCK',
      'TRAILER 1',
      'TRAILER 2',
      'DRIVER NAME',
      'PASSPORT',
      'TONNAGE',
      'EXIT BORDER',
      'FINAL DESTINATION',
      'ETA TO MINE',
    ],
    ...rows.map((row, index) => [
      row.sequence ?? index + 1,
      row.transporter_name ?? '',
      row.vehicle_registration,
      row.trailer_registration ?? '',
      row.trailer_registration_2 ?? '',
      row.driver_name ?? '',
      row.driver_passport_reference ?? '',
      row.planned_tonnage ?? '',
      row.border ?? '',
      row.final_destination ?? '',
      row.on_site ? onSiteLabel : formatEtaDate(row.eta_to_mine),
    ]),
  ]);

  const labelCells = ['C1', 'C2', 'C3', 'C4', 'I2', 'I3', 'I4', 'J1', 'K1', 'A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'J6', 'K6'];
  for (const addr of labelCells) {
    const cell = sheet[addr] as XLSX.CellObject | undefined;
    if (!cell) continue;
    cell.s = { fill: { fgColor: { rgb: HEADER_FILL }, patternType: 'solid' }, font: { color: { rgb: 'FFFFFF' }, bold: true } };
  }

  sheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Loading Order');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', cellStyles: true }) as Uint8Array;
  const base = order.original_filename?.replace(/\.(xlsx|xls|csv)$/i, '') ?? `loading-order-${order.client_name ?? 'export'}`;
  downloadBytes(bytes, `${base}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
