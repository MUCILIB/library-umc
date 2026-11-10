import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliographyService } from '../service/bibliography.service';
import { db } from '../../../db';
import { syncCollectionAvailableStock } from '../../shared/utils/stock-sync';

vi.mock('../../../db', () => {
  const mockDb: any = {
    query: {
      bibliographies: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
  };
  mockDb.transaction = vi.fn(async (cb: any) => cb(mockDb));
  return { db: mockDb };
});

vi.mock('../../../db/schema', () => ({
  bibliographies: {},
  items: {},
  reservations: {},
}));

vi.mock('../../shared/utils/stock-sync', () => ({
  syncCollectionAvailableStock: vi.fn(),
}));

vi.mock('../../audit/service/audit.service', () => ({
  default: { createLog: vi.fn() },
}));

describe('BibliographyService - deduplicateBibliographies (TDD)', () => {
  let service: BibliographyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BibliographyService();
  });

  it('should detect duplicate titles, keep canonical with items, re-point and soft-delete duplicates', async () => {
    const mockBibliographies = [
      {
        id: 'bib-canon-1',
        title: 'Bahasa Indonesia',
        isbn: '9786232663961',
        createdAt: new Date('2026-01-01'),
        items: [{ id: 'item-1', status: 'available' }, { id: 'item-2', status: 'available' }],
      },
      {
        id: 'bib-dupe-1',
        title: 'Bahasa Indonesia',
        isbn: '9786232663961',
        createdAt: new Date('2026-01-02'),
        items: [],
      },
      {
        id: 'bib-dupe-2',
        title: 'Bahasa Indonesia ',
        isbn: '9786232663961',
        createdAt: new Date('2026-01-03'),
        items: [],
      },
      {
        id: 'bib-unique',
        title: 'Buku Pemrograman Go',
        isbn: '978602000001',
        createdAt: new Date('2026-01-01'),
        items: [{ id: 'item-3', status: 'available' }],
      },
    ];

    (db.query.bibliographies.findMany as any).mockResolvedValue(mockBibliographies);

    const result = await service.deduplicateBibliographies();

    expect(result.processedGroups).toBe(1);
    expect(result.cleanedDuplicates).toBe(2);
    expect(db.update).toHaveBeenCalled();
    expect(syncCollectionAvailableStock).toHaveBeenCalledWith(expect.anything(), 'bib-canon-1');
  });
});
