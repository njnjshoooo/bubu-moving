import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, RefreshCw, AlertCircle, CheckCircle2, Wand2, Pencil, Save, X } from 'lucide-react';
import { supabase, QuoteRecording, T } from '../../lib/supabase';
import { useBasePath } from '../../lib/useBasePath';

// notes 可能是 string 或 string[]，統一轉為陣列
function notesToArray(notes: string | string[] | null | undefined): string[] {
  if (!notes) return [];
  if (Array.isArray(notes)) return notes.filter(Boolean);
  return notes.split(/\r?\n/).map(s => s.replace(/^[-•*●・]\s*/, '').trim()).filter(Boolean);
}

export default function QuoteRecordingDetail() {
  const { recordingId } = useParams();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [rec, setRec] = useState<QuoteRecording | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Title edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const load = async () => {
    if (!recordingId) return;
    setLoading(true);
    const { data } = await supabase.from(T.quoteRecordings)
      .select('*').eq('id', recordingId).maybeSingle();
    setRec(data as QuoteRecording | null);
    if (data?.audio_url) {
      const { data: urlData } = await supabase.storage.from('quote-recordings')
        .createSignedUrl(data.audio_url, 3600);
      setAudioUrl(urlData?.signedUrl ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(() => {
      setRec(prev => {
        if (prev && ['uploaded', 'transcribing', 'extracting'].includes(prev.status)) {
          load();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const saveTitle = async () => {
    if (!rec) return;
    setBusy(true);
    try {
      await supabase.from(T.quoteRecordings)
        .update({ title: titleDraft.trim() || rec.title }).eq('id', rec.id);
      await load();
      setEditingTitle(false);
    } finally {
      setBusy(false);
    }
  };

  const retryTranscribe = async () => {
    if (!rec) return;
    setBusy(true);
    setMsg(null);
    try {
      await supabase.from(T.quoteRecordings)
        .update({ status: 'uploaded', error_message: null }).eq('id', rec.id);
      const { data, error } = await supabase.functions.invoke('transcribe-recording', {
        body: { recording_id: rec.id },
      });
      if (error && !data) throw error;
      if (data?.error) throw new Error(data.error);
      await load();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '重試失敗' });
    } finally {
      setBusy(false);
    }
  };

  const convertToQuote = async () => {
    if (!rec || !rec.extracted_data) return;
    const ext = rec.extracted_data;
    const notesArr = notesToArray(ext.notes);

    // 若已綁定報價單 → 補充更新；否則 → 建立新報價單
    if (rec.quote_id) {
      if (!confirm('要將此錄音的解析結果補充到原報價單嗎？\n\n（客戶資料以「沒填的欄位」為準補入；注意事項追加到備註；作業排程追加到排程區）')) return;
      setBusy(true);
      setMsg(null);
      try {
        const { data: existing } = await supabase.from(T.quotes)
          .select('*').eq('id', rec.quote_id).maybeSingle();
        if (!existing) throw new Error('原報價單不存在');

        // 合併欄位（不覆蓋已有資料）
        const updates: any = {};
        if (!existing.customer_name && ext.customer_name) updates.customer_name = ext.customer_name;
        if (!existing.phone && ext.phone) updates.phone = ext.phone;
        if (!existing.email && ext.email) updates.email = ext.email;
        if (!existing.address_from && ext.address_from) updates.address_from = ext.address_from;
        if (!existing.address_to && ext.address_to) updates.address_to = ext.address_to;
        // 地址細節
        if (!existing.address_from_type && ext.address_from_type) updates.address_from_type = ext.address_from_type;
        if (!existing.address_from_parking && ext.address_from_parking) updates.address_from_parking = ext.address_from_parking;
        if (!existing.address_from_basement && ext.address_from_basement) updates.address_from_basement = ext.address_from_basement;
        if (!existing.address_from_guard && ext.address_from_guard) updates.address_from_guard = ext.address_from_guard;
        if (!existing.address_to_type && ext.address_to_type) updates.address_to_type = ext.address_to_type;
        if (!existing.address_to_parking && ext.address_to_parking) updates.address_to_parking = ext.address_to_parking;
        if (!existing.address_to_basement && ext.address_to_basement) updates.address_to_basement = ext.address_to_basement;
        if (!existing.address_to_guard && ext.address_to_guard) updates.address_to_guard = ext.address_to_guard;

        // 合併備註（追加，不覆蓋）
        let existingNotes: string[] = [];
        try {
          const parsed = existing.remark_notes ? JSON.parse(existing.remark_notes) : [];
          existingNotes = Array.isArray(parsed) ? parsed : [];
        } catch { /* ignore */ }
        const merged = [...existingNotes, ...notesArr.filter(n => !existingNotes.includes(n))];
        if (notesArr.length > 0) updates.remark_notes = JSON.stringify(merged);

        if (Object.keys(updates).length > 0) {
          await supabase.from(T.quotes).update(updates).eq('id', rec.quote_id);
        }

        // 追加作業排程到 bubu_quote_schedule_items
        if (ext.schedule_items && ext.schedule_items.length > 0) {
          const { data: existingSched } = await supabase.from(T.quoteSchedule)
            .select('sort_order').eq('quote_id', rec.quote_id).order('sort_order', { ascending: false }).limit(1);
          let nextOrder = (existingSched?.[0]?.sort_order ?? -1) + 1;
          const rows = ext.schedule_items
            .filter(s => s.work_date && s.start_time && s.label)
            .map(s => ({
              quote_id: rec.quote_id,
              work_date: s.work_date,
              start_time: `${s.start_time}:00`,
              end_time: `${(s.end_time && s.end_time !== 'null') ? s.end_time : s.start_time}:00`,
              label: s.label,
              category: '',
              sort_order: nextOrder++,
            }));
          if (rows.length > 0) {
            await supabase.from(T.quoteSchedule).insert(rows);
          }
        }

        // 同步更新計劃書（merge，不覆蓋）
        if (ext.moving_date || ext.large_furniture || notesArr.length > 0) {
          const { data: existingPlan } = await supabase.from(T.movingPlans)
            .select('id, estimation').eq('quote_id', rec.quote_id).maybeSingle();
          const oldEst: any = existingPlan?.estimation ?? {};
          const planEst: any = {
            ...oldEst,
            expected_moving_date: oldEst.expected_moving_date || ext.moving_date,
            arrival_time: oldEst.arrival_time || ext.arrival_time,
            old_elevator: oldEst.old_elevator || ext.old_elevator,
            new_elevator: oldEst.new_elevator || ext.new_elevator,
            family_adults: oldEst.family_adults ?? ext.family_adults,
            family_kids: oldEst.family_kids ?? ext.family_kids,
            family_pets: oldEst.family_pets ?? ext.family_pets,
            large_furniture: oldEst.large_furniture ?? ext.large_furniture?.map(f => ({ ...f, need_disassembly: false })),
            large_appliances: oldEst.large_appliances ?? ext.large_appliances,
            service_packing: oldEst.service_packing ?? ext.service_packing,
            service_moving: oldEst.service_moving ?? ext.service_moving,
            service_unpacking: oldEst.service_unpacking ?? ext.service_unpacking,
            service_screening: oldEst.service_screening ?? ext.service_screening,
            notes: oldEst.notes ? `${oldEst.notes}\n${notesArr.join('\n')}` : notesArr.join('\n'),
            supplies: oldEst.supplies ?? {},
          };
          if (existingPlan) {
            await supabase.from(T.movingPlans).update({ estimation: planEst }).eq('id', existingPlan.id);
          } else {
            await supabase.from(T.movingPlans).insert({
              quote_id: rec.quote_id, estimation: planEst, execution: {}, review: {}, status: 'draft',
            });
          }
        }

        await supabase.from(T.quoteRecordings)
          .update({ status: 'converted', converted_at: new Date().toISOString() })
          .eq('id', rec.id);
        navigate(`${basePath}/quotes/${rec.quote_id}`);
      } catch (err: any) {
        setMsg({ type: 'err', text: err.message ?? '更新失敗' });
      } finally {
        setBusy(false);
      }
      return;
    }

    // 沒綁定 → 建立新報價單
    if (!confirm('要把此錄音解析的資料建立為新報價單嗎？')) return;
    setBusy(true);
    setMsg(null);
    try {
      const ts = new Date();
      const quoteNumber = `Q${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;

      const { data: q, error } = await supabase.from(T.quotes).insert({
        quote_number: quoteNumber,
        customer_name: ext.customer_name ?? rec.customer_name ?? '',
        phone: ext.phone ?? rec.phone ?? '',
        email: ext.email ?? null,
        address_from: ext.address_from ?? null,
        address_to: ext.address_to ?? null,
        address_from_type: ext.address_from_type ?? null,
        address_from_parking: ext.address_from_parking ?? null,
        address_from_basement: ext.address_from_basement ?? null,
        address_from_guard: ext.address_from_guard ?? null,
        address_to_type: ext.address_to_type ?? null,
        address_to_parking: ext.address_to_parking ?? null,
        address_to_basement: ext.address_to_basement ?? null,
        address_to_guard: ext.address_to_guard ?? null,
        remark_notes: notesArr.length > 0 ? JSON.stringify(notesArr) : null,
        subtotal: 0, total: 0, deposit: 0, status: '草稿',
        consultant_id: rec.consultant_id,
      }).select('id').single();
      if (error) throw error;

      // 寫入作業排程
      if (ext.schedule_items && ext.schedule_items.length > 0) {
        const rows = ext.schedule_items
          .filter(s => s.work_date && s.start_time && s.label)
          .map((s, i) => ({
            quote_id: q.id,
            work_date: s.work_date,
            start_time: `${s.start_time}:00`,
            end_time: `${(s.end_time && s.end_time !== 'null') ? s.end_time : s.start_time}:00`,
            label: s.label,
            category: '',
            sort_order: i,
          }));
        if (rows.length > 0) {
          await supabase.from(T.quoteSchedule).insert(rows);
        }
      }

      if (ext.moving_date || ext.large_furniture || notesArr.length > 0) {
        await supabase.from(T.movingPlans).insert({
          quote_id: q.id,
          estimation: {
            expected_moving_date: ext.moving_date,
            arrival_time: ext.arrival_time,
            old_elevator: ext.old_elevator,
            new_elevator: ext.new_elevator,
            family_adults: ext.family_adults,
            family_kids: ext.family_kids,
            family_pets: ext.family_pets,
            large_furniture: ext.large_furniture?.map(f => ({ ...f, need_disassembly: false })),
            large_appliances: ext.large_appliances,
            service_packing: ext.service_packing,
            service_moving: ext.service_moving,
            service_unpacking: ext.service_unpacking,
            service_screening: ext.service_screening,
            notes: notesArr.join('\n'),
            supplies: {},
          },
          execution: {}, review: {}, status: 'draft',
        });
      }

      await supabase.from(T.quoteRecordings)
        .update({ status: 'converted', quote_id: q.id, converted_at: new Date().toISOString() })
        .eq('id', rec.id);

      navigate(`${basePath}/quotes/${q.id}`);
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '建立失敗' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-brand-500" />
    </div>;
  }

  if (!rec) {
    return <div className="text-center text-gray-400 py-12">找不到錄音</div>;
  }

  const ext = rec.extracted_data;
  const notesList = ext ? notesToArray(ext.notes) : [];
  const isProcessing = ['uploaded', 'transcribing', 'extracting'].includes(rec.status);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`${basePath}/recordings`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                autoFocus
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button onClick={saveTitle} disabled={busy}
                className="p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingTitle(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 truncate">{rec.title || '（未命名錄音）'}</h1>
              <button onClick={() => { setTitleDraft(rec.title); setEditingTitle(true); }}
                className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0" title="編輯標題">
                <Pencil size={14} className="text-gray-400" />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(rec.created_at).toLocaleString('zh-TW')}
            {rec.audio_duration_sec ? ` ・ 時長 ${Math.floor(rec.audio_duration_sec/60)}:${String(rec.audio_duration_sec%60).padStart(2,'0')}` : ''}
          </p>
        </div>
        {ext && (
          <button onClick={convertToQuote} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
            <Wand2 size={15} />
            {rec.quote_id ? '更新報價單' : '轉成報價單'}
          </button>
        )}
        {rec.quote_id && (
          <Link to={`${basePath}/quotes/${rec.quote_id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-sm rounded-xl">
            <FileText size={15} />已連結報價單
          </Link>
        )}
      </div>

      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-blue-800">
              {rec.status === 'uploaded' && '等待開始轉錄...'}
              {rec.status === 'transcribing' && '正在轉錄逐字稿...（約 30~60 秒）'}
              {rec.status === 'extracting' && '正在用 AI 解析報價資訊...'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">本頁面會自動更新，請稍候</p>
          </div>
        </div>
      )}

      {rec.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">處理失敗</p>
            <p className="text-sm text-red-700 mt-0.5">{rec.error_message || '未知錯誤'}</p>
            <button onClick={retryTranscribe} disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg">
              <RefreshCw size={13} />重試
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {audioUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">🎙 錄音檔</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {ext && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-gray-800">🤖 AI 解析結果</p>
            {rec.status === 'converted' && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={12} />{rec.quote_id ? '已連結' : '已建立'}報價單
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="客戶姓名" value={ext.customer_name} />
            <Row label="電話" value={ext.phone} />
            <Row label="Email" value={ext.email} />
            <Row label="預計搬家日" value={ext.moving_date} />
            <Row label="進場時間" value={ext.arrival_time} />
            <Row label="家中成員" value={
              [ext.family_adults && `大人 ${ext.family_adults}`,
               ext.family_kids && `小孩 ${ext.family_kids}`,
               ext.family_pets && `寵物 ${ext.family_pets}`].filter(Boolean).join('、')
            } />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <Row label="舊址" value={ext.address_from} />
            <Row label="新址" value={ext.address_to} />
          </div>
          {ext.large_furniture && ext.large_furniture.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">大型家具：</p>
              <p className="text-sm">{ext.large_furniture.map(f => `${f.name}×${f.qty}`).join('、')}</p>
            </div>
          )}
          {ext.large_appliances && ext.large_appliances.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">大型家電：</p>
              <p className="text-sm">{ext.large_appliances.map(a => `${a.name}×${a.qty}`).join('、')}</p>
            </div>
          )}

          {/* 地址細節 */}
          {(ext.address_from_type || ext.address_from_parking || ext.address_from_basement || ext.address_from_guard) && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">🏠 舊家環境</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label="類型" value={ext.address_from_type} />
                <Row label="停車" value={ext.address_from_parking} />
                <Row label="地下室" value={ext.address_from_basement} />
                <Row label="管理室" value={ext.address_from_guard} />
              </div>
            </div>
          )}
          {(ext.address_to_type || ext.address_to_parking || ext.address_to_basement || ext.address_to_guard) && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">🏡 新家環境</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label="類型" value={ext.address_to_type} />
                <Row label="停車" value={ext.address_to_parking} />
                <Row label="地下室" value={ext.address_to_basement} />
                <Row label="管理室" value={ext.address_to_guard} />
              </div>
            </div>
          )}

          {/* 作業排程 */}
          {ext.schedule_items && ext.schedule_items.length > 0 && (
            <div className="mt-3 bg-purple-50 border-l-4 border-purple-400 p-3">
              <p className="font-semibold text-purple-800 mb-2 text-sm">📅 作業排程（將寫入報價單排程區）</p>
              <ul className="space-y-1 text-sm text-purple-900">
                {ext.schedule_items.map((s, i) => (
                  <li key={i}>
                    {s.work_date} {s.start_time}{s.end_time && s.end_time !== 'null' ? `–${s.end_time}` : ''} ・ {s.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notesList.length > 0 && (
            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3">
              <p className="font-semibold text-yellow-800 mb-2 text-sm">📌 注意事項（將帶入報價單備註）</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-900">
                {notesList.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {rec.transcript && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-3">📝 逐字稿</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{rec.transcript}</p>
        </div>
      )}
    </div>
  );
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-gray-500 shrink-0 w-20">{label}：</span>
    <span className="text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</span>
  </div>
);
