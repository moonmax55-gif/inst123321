import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  ImagePlus,
  Lock,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { compressImageToDataUrl } from '../lib/imageUtils';
import { checkInternetEthics, INTERNET_ETHICS_PRINCIPLES } from '../shared/ethics';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  defaultVisibility?: 'public' | 'secret';
  alreadyAgreedEthics?: boolean;
}

const CARD_THEMES = [
  { id: 'cobalt', label: '코발트 블루', className: 'from-blue-600 to-blue-800' },
  { id: 'sky', label: '맑은 하늘색', className: 'from-sky-500 to-blue-600' },
  { id: 'ocean', label: '깊은 바다색', className: 'from-cyan-600 to-blue-800' },
  { id: 'indigo', label: '밤하늘 파랑', className: 'from-blue-800 to-indigo-900' },
];

export function CreatePostModal({
  isOpen,
  onClose,
  onCreated,
  getAuthHeaders,
  defaultVisibility = 'public',
  alreadyAgreedEthics = false,
}: CreatePostModalProps) {
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cardTheme, setCardTheme] = useState('cobalt');
  const [visibility, setVisibility] = useState<'public' | 'secret'>(defaultVisibility);
  const [ethicsAgreed, setEthicsAgreed] = useState(alreadyAgreedEthics);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ethicsResult = useMemo(() => checkInternetEthics(caption), [caption]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setImageUrl(compressed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '사진을 불러오지 못했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ethicsAgreed) {
      setError('인터넷 윤리 4대 약속에 체크해 주세요.');
      return;
    }

    if (!ethicsResult.passed) {
      setError(ethicsResult.issues[0]?.guidance || '인터넷 윤리 기준을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          caption: caption.trim(),
          imageUrl,
          cardTheme,
          visibility,
          ethicsAgreed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '게시글을 올리지 못했습니다.');
      }

      setCaption('');
      setImageUrl(null);
      await onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '게시 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-blue-100">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-100">
          <h2 id="create-post-title" className="text-lg font-bold text-slate-900">
            새 학급 이야기 올리기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Visibility selector */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">누구에게 보여줄까요?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
                  visibility === 'public'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                <Globe className={`w-5 h-5 shrink-0 ${visibility === 'public' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold whitespace-nowrap">전체 공개</div>
                  <div className="text-xs text-slate-500 truncate">우리 반 모두에게 보여요</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('secret')}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
                  visibility === 'secret'
                    ? 'border-blue-700 bg-blue-900 text-white ring-2 ring-blue-700/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                <Lock className={`w-5 h-5 shrink-0 ${visibility === 'secret' ? 'text-sky-300' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold whitespace-nowrap">학생 비밀글</div>
                  <div className={`text-xs truncate ${visibility === 'secret' ? 'text-blue-100' : 'text-slate-500'}`}>
                    나와 선생님만 볼 수 있어요
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Photo upload or blue text-card theme */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">사진 첨부 (선택)</p>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  사진 지우기
                </button>
              )}
            </div>

            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-blue-100 bg-blue-50">
                <img
                  src={imageUrl}
                  alt="업로드 미리보기"
                  className="w-full max-h-72 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-2 text-blue-700"
                >
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-sm font-semibold">사진을 선택해 올려보세요</span>
                  <span className="text-xs text-slate-500">
                    사진 없이 글만 올릴 수도 있어요 (친구 얼굴 사진은 미리 동의를 구해주세요)
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">글 카드 파랑 배경:</span>
                  <div className="flex items-center gap-2">
                    {CARD_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setCardTheme(theme.id)}
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.className} transition-transform ${
                          cardTheme === theme.id ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-75 hover:opacity-100'
                        }`}
                        title={theme.label}
                        aria-label={theme.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Caption textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="post-caption" className="text-xs font-semibold text-slate-600">
                오늘의 이야기
              </label>
              <span className="text-xs text-slate-400 tabular-nums">{caption.length}/1000</span>
            </div>
            <textarea
              id="post-caption"
              rows={4}
              maxLength={1000}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                visibility === 'secret'
                  ? '선생님에게만 전하고 싶은 고민이나 감사한 이야기를 적어보세요...'
                  : '우리 반 친구들과 나누고 싶은 즐거운 순간을 적어보세요...'
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Real-time Internet Ethics Feedback */}
          {caption.trim().length > 0 && (
            <div
              className={`rounded-2xl p-3.5 border text-sm ${
                ethicsResult.passed
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              {ethicsResult.passed ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">인터넷 윤리 검사 통과: 따뜻하고 안전한 글이에요.</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {ethicsResult.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-xs">{issue.title}</p>
                        <p className="text-xs text-amber-900 mt-0.5">{issue.guidance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Internet Ethics 4-point pledge */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>게시 전 인터넷 윤리 약속 확인</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
              {INTERNET_ETHICS_PRINCIPLES.map((p, i) => (
                <li key={p.id} className="flex items-start gap-1.5">
                  <span className="font-semibold text-blue-700 tabular-nums">0{i + 1}.</span>
                  <span>{p.title}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ethicsAgreed}
                onChange={(e) => setEthicsAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-xs font-semibold text-slate-800">
                고운 말, 초상권 존중, 개인정보 보호 약속을 확인하고 게시합니다.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !ethicsAgreed || !ethicsResult.passed}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {submitting
                ? '올리는 중...'
                : visibility === 'secret'
                ? '비밀글로 올리기'
                : '우리 반에 올리기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
