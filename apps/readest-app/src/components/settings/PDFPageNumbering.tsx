import React, { useEffect, useState } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useBookDataStore } from '@/store/bookDataStore';
import { useBookProgress } from '@/store/readerProgressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { parsePageInput } from '@/app/reader/components/footerbar/pageJump';
import { BoxedList, SettingsRow } from './primitives';

const PDFPageNumbering: React.FC<{ bookKey: string }> = ({ bookKey }) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const settings = useSettingsStore((s) => s.settings);
  const bookData = useBookDataStore((s) => s.getBookData(bookKey));
  const progress = useBookProgress(bookKey);
  const offset = bookData?.config?.pdfPageOffset;
  const current = progress?.section.current;
  const total = progress?.section.total;
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(current === undefined ? '' : String(current + 1 + (offset ?? 0)));
  }, [bookKey, current, offset]);

  if (bookData?.book?.format !== 'PDF' || current === undefined || !total) return null;

  const saveOffset = async (nextOffset: number | null) => {
    const store = useBookDataStore.getState();
    setSaving(true);
    setError('');
    store.setConfig(bookKey, { pdfPageOffset: nextOffset });
    try {
      const config = store.getConfig(bookKey);
      if (config) await store.saveConfig(envConfig, bookKey, config, settings);
    } catch {
      store.setConfig(bookKey, { pdfPageOffset: offset });
      setError(_('Failed to save page numbering. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const page = parsePageInput(draft, true);
    const nextOffset = page === null ? NaN : page - current - 1;
    if (!Number.isSafeInteger(nextOffset) || !Number.isSafeInteger(total + nextOffset)) {
      setError(_('Enter a whole page number, including negative numbers or zero.'));
      return;
    }
    void saveOffset(nextOffset);
  };

  return (
    <BoxedList
      title={_('Page Number Calibration')}
      description={
        <>
          {_('Only this PDF. Negative page numbers and zero are allowed.')}{' '}
          {_('Choose Page Number or Reference Pages to show calibrated numbering.')}
        </>
      }
      data-setting-id='settings.layout.pdfPageNumbering'
    >
      <SettingsRow
        label={_('Set Current Page Number')}
        description={_('File page {{current}} of {{total}}', { current: current + 1, total })}
      >
        <form
          onSubmit={apply}
          onKeyDown={(event) => event.stopPropagation()}
          className='flex shrink-0 items-center gap-2'
        >
          <input
            type='text'
            inputMode='text'
            enterKeyHint='done'
            aria-label={_('Set Current Page Number')}
            aria-invalid={!!error}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError('');
            }}
            disabled={saving}
            className='input input-bordered eink-bordered h-9 w-20 text-center'
          />
          <button type='submit' disabled={saving} className='btn btn-sm btn-contrast'>
            {_('Apply')}
          </button>
        </form>
      </SettingsRow>
      <SettingsRow label={_('Original Page Numbers')}>
        <button
          type='button'
          aria-label={_('Restore Original Page Numbers')}
          title={_('Restore Original Page Numbers')}
          disabled={saving || offset == null}
          onClick={() => void saveOffset(null)}
          className='btn btn-sm btn-ghost eink-bordered'
        >
          {_('Reset')}
        </button>
      </SettingsRow>
      {error && (
        <p role='alert' className='text-error py-2 pe-4 text-sm'>
          {error}
        </p>
      )}
    </BoxedList>
  );
};

export default PDFPageNumbering;
