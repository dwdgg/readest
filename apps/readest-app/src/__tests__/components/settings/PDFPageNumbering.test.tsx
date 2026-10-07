import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PDFPageNumbering from '@/components/settings/PDFPageNumbering';
import { useBookDataStore, flushPendingLibrarySave } from '@/store/bookDataStore';
import { useLibraryStore } from '@/store/libraryStore';
import { setBookProgress, clearBookProgress } from '@/store/readerProgressStore';
import type { Book, BookProgress } from '@/types/book';
import { deserializeConfig, serializeConfig } from '@/utils/serializer';
import {
  DEFAULT_BOOK_SEARCH_CONFIG,
  DEFAULT_BOOK_LAYOUT,
  DEFAULT_VIEW_CONFIG,
} from '@/services/constants';
import type { ViewSettings } from '@/types/book';

const globalSettings = { ...DEFAULT_BOOK_LAYOUT, ...DEFAULT_VIEW_CONFIG } as ViewSettings;

const io = vi.hoisted(() => ({
  saveBookConfig: vi.fn().mockResolvedValue(undefined),
  saveLibraryBooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (text: string, values?: Record<string, unknown>) =>
    text.replace(/{{(\w+)}}/g, (match, name) => String(values?.[name] ?? match)),
}));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: { getAppService: async () => io } }),
}));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (s: { settings: object }) => unknown) => selector({ settings: {} }),
}));

const book: Book = {
  hash: 'pdfbook',
  format: 'PDF',
  title: 'Sample',
  author: '',
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  io.saveBookConfig.mockClear();
  useLibraryStore.getState().setLibrary([book]);
  useBookDataStore.setState({
    booksData: {
      pdfbook: {
        id: 'pdfbook',
        book,
        file: null,
        bookDoc: null,
        isFixedLayout: true,
        config: { updatedAt: 1, progress: [3, 10], location: 'original-location' },
      },
    },
  });
  setBookProgress('pdfbook', {
    section: { current: 2, total: 10 },
  } as BookProgress);
});

afterEach(async () => {
  cleanup();
  clearBookProgress('pdfbook');
  await flushPendingLibrarySave();
});

describe('PDF page number calibration', () => {
  it('lets the reader set the current body page to 1 and saves without turning a page', async () => {
    const { getByRole } = render(<PDFPageNumbering bookKey='pdfbook' />);
    const input = getByRole('textbox', { name: 'Set Current Page Number' });
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(io.saveBookConfig).toHaveBeenCalledTimes(1));
    expect(useBookDataStore.getState().getConfig('pdfbook')).toMatchObject({
      pdfPageOffset: -2,
      progress: [3, 10],
      location: 'original-location',
    });
    expect(io.saveBookConfig.mock.calls[0]?.[1]).toMatchObject({ pdfPageOffset: -2 });
  });

  it('retains the calibration through serialization and reopening, and persists reset', async () => {
    const { getByRole, unmount } = render(<PDFPageNumbering bookKey='pdfbook' />);
    fireEvent.change(getByRole('textbox', { name: 'Set Current Page Number' }), {
      target: { value: '1' },
    });
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(io.saveBookConfig).toHaveBeenCalledTimes(1));
    const saved = serializeConfig(
      io.saveBookConfig.mock.calls[0]?.[1],
      globalSettings,
      DEFAULT_BOOK_SEARCH_CONFIG,
    );
    unmount();
    useBookDataStore
      .getState()
      .setConfig('pdfbook', deserializeConfig(saved, globalSettings, DEFAULT_BOOK_SEARCH_CONFIG));
    const reopened = render(<PDFPageNumbering bookKey='pdfbook' />);
    expect((reopened.getByRole('textbox') as HTMLInputElement).value).toBe('1');
    fireEvent.click(reopened.getByRole('button', { name: 'Restore Original Page Numbers' }));
    await waitFor(() => expect(io.saveBookConfig).toHaveBeenCalledTimes(2));
    const resetSaved = serializeConfig(
      io.saveBookConfig.mock.calls[1]?.[1],
      globalSettings,
      DEFAULT_BOOK_SEARCH_CONFIG,
    );
    expect(
      deserializeConfig(resetSaved, globalSettings, DEFAULT_BOOK_SEARCH_CONFIG).pdfPageOffset,
    ).toBeNull();
    expect((reopened.getByRole('textbox') as HTMLInputElement).value).toBe('3');
  });

  it.each(['-1', '0'])('accepts %s as the label of the current page', async (label) => {
    const { getByRole } = render(<PDFPageNumbering bookKey='pdfbook' />);
    fireEvent.change(getByRole('textbox'), { target: { value: label } });
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(io.saveBookConfig).toHaveBeenCalledTimes(1));
    expect(useBookDataStore.getState().getConfig('pdfbook')?.pdfPageOffset).toBe(Number(label) - 3);
  });

  it('rejects decimals and does not save them', () => {
    const { getByRole } = render(<PDFPageNumbering bookKey='pdfbook' />);
    fireEvent.change(getByRole('textbox'), { target: { value: '1.5' } });
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    expect(getByRole('alert').textContent).toContain('whole page number');
    expect(io.saveBookConfig).not.toHaveBeenCalled();
  });

  it('restores the previous calibration and reports a failed save', async () => {
    io.saveBookConfig.mockRejectedValueOnce(new Error('disk unavailable'));
    const { getByRole } = render(<PDFPageNumbering bookKey='pdfbook' />);
    fireEvent.change(getByRole('textbox'), { target: { value: '1' } });
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(getByRole('alert').textContent).toContain('Failed to save'));
    expect(useBookDataStore.getState().getConfig('pdfbook')?.pdfPageOffset).toBeUndefined();
  });
});
