import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliographyService } from '../service/bibliography.service';
import { db } from '../../../db';
import { BadRequestError } from '../../../exceptions/AppError';

vi.mock('../../../db', () => {
  const mockDb: any = {
    query: {
      bibliographies: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      authors: { findFirst: vi.fn() },
      subjects: { findFirst: vi.fn() },
      publishers: { findFirst: vi.fn() },
      publicationPlaces: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue({}),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  };
  mockDb.transaction = vi.fn(async (cb: any) => cb(mockDb));
  return { db: mockDb };
});

vi.mock('../../../db/schema', () => ({
  bibliographies: {},
  bibliographyAuthors: {},
  bibliographySubjects: {},
  authors: {},
  subjects: {},
  publishers: {},
  publicationPlaces: {},
  items: {},
  studyPrograms: {},
  bibliographyFaculties: {},
  bibliographyStudyPrograms: {},
}));

vi.mock('../../audit/service/audit.service', () => ({
  default: { createLog: vi.fn() },
}));

vi.mock('../../shared/utils/stock-sync', () => ({
  syncCollectionAvailableStock: vi.fn(),
}));

describe('BibliographyService - checkDuplicate', () => {
  let service: BibliographyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BibliographyService();
  });

  it('harus return empty jika tidak ada duplikat', async () => {
    (db.query.bibliographies.findMany as any).mockResolvedValue([]);

    const result = await service.checkDuplicate({ isbn: 'ISBN 978-xxx' });
    expect(result.duplicates).toHaveLength(0);
    expect(result.hasExactMatch).toBe(false);
  });

  it('harus deteksi duplikat via ISBN exact match', async () => {
    (db.query.bibliographies.findMany as any).mockResolvedValue([
      { id: '1', title: 'Pemrograman Web', isbn: '978-xxx', isbnIssn: 'ISBN 978-xxx', classification: '005', callNumber: '005.1', bibliographyAuthors: [] },
    ]);

    const result = await service.checkDuplicate({ isbn: 'ISBN 978-xxx' });
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].similarity).toBe('isbn');
    expect(result.hasExactMatch).toBe(true);
  });

  it('harus deteksi duplikat via ISSN match', async () => {
    (db.query.bibliographies.findMany as any).mockResolvedValue([
      { id: '1', title: 'Jurnal Komputer', issn: '1234-5678', isbnIssn: 'ISSN 1234-5678', classification: '005', callNumber: '005.1', bibliographyAuthors: [] },
    ]);

    const result = await service.checkDuplicate({ issn: '1234-5678' });
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].similarity).toBe('issn');
    expect(result.hasExactMatch).toBe(true);
  });

  it('harus mengabaikan excludeId saat checkDuplicate', async () => {
    (db.query.bibliographies.findMany as any).mockResolvedValue([
      { id: '1', title: 'Pemrograman Web', isbn: '978-1234567890', isbnIssn: '978-1234567890', classification: '005', callNumber: '005.1', bibliographyAuthors: [] },
    ]);

    const result = await service.checkDuplicate({ isbn: '978-1234567890', excludeId: '1' });
    expect(result.duplicates).toHaveLength(0);
    expect(result.hasExactMatch).toBe(false);
  });

  it('harus deteksi duplikat via title + author fuzzy match', async () => {
    (db.query.bibliographies.findMany as any).mockResolvedValue([
      {
        id: '2', title: 'Belajar TypeScript', isbnIssn: null, classification: '005.13', callNumber: '005.13',
        bibliographyAuthors: [{ author: { name: 'John Doe' } }],
      },
    ]);

    const result = await service.checkDuplicate({ title: 'TypeScript', author: 'John' });
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].similarity).toBe('title_author');
  });

  it('harus deduplikasi hasil ISBN dan title', async () => {
    (db.query.bibliographies.findMany as any)
      .mockResolvedValueOnce([
        { id: '1', title: 'Web Dev', isbnIssn: 'ISBN 978-xxx', classification: null, callNumber: null, bibliographyAuthors: [] },
      ])
      .mockResolvedValueOnce([
        { id: '1', title: 'Web Dev', isbnIssn: 'ISBN 978-xxx', classification: null, callNumber: null, bibliographyAuthors: [] },
      ]);

    const result = await service.checkDuplicate({ isbn: 'ISBN 978-xxx', title: 'Web Dev' });
    expect(result.duplicates).toHaveLength(1);
  });

  it('harus tolak create jika ISBN sudah ada di database', async () => {
    vi.spyOn(service, 'findConflictByIsbn').mockResolvedValue({
      id: 'existing-id',
      title: 'Buku Lama',
      isbn: '978-602-123-001-1',
      issn: null,
      isbnIssn: '978-602-123-001-1',
    });

    await expect(
      service.create({
        title: 'Buku Baru',
        isbn: '978-602-123-001-1',
      } as any)
    ).rejects.toThrow(BadRequestError);
  });

  it('harus tolak create jika ISSN sudah ada di database', async () => {
    vi.spyOn(service, 'findConflictByIssn').mockResolvedValue({
      id: 'existing-id',
      title: 'Jurnal Lama',
      isbn: null,
      issn: '1234-5678',
      isbnIssn: 'ISSN 1234-5678',
    });

    await expect(
      service.create({
        title: 'Jurnal Baru',
        issn: '1234-5678',
      } as any)
    ).rejects.toThrow(BadRequestError);
  });

  it('harus tolak update jika ISBN bentrok dengan buku lain', async () => {
    vi.spyOn(service, 'findConflictByIsbn').mockResolvedValue({
      id: 'other-id',
      title: 'Buku Milik Lain',
      isbn: '978-602-123-001-1',
      issn: null,
      isbnIssn: '978-602-123-001-1',
    });

    await expect(
      service.update('current-id', {
        isbn: '978-602-123-001-1',
      } as any)
    ).rejects.toThrow(BadRequestError);
  });
});
