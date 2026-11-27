import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { INTERNET_ETHICS_PRINCIPLES } from '../shared/ethics';

interface EthicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ethicsAgreed?: boolean;
  onAgree?: () => Promise<void>;
}

export function EthicsModal({ isOpen, onClose, ethicsAgreed, onAgree }: EthicsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ethics-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-sky-200" />
            <h2 id="ethics-modal-title" className="text-lg font-bold">
              우리 반 인터넷 윤리 4대 약속
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            푸른별 학급그램은 우리 반 친구 모두가 안심하고 마음을 나눌 수 있는 공간이에요.
            글과 사진을 올릴 때 아래 네 가지 약속을 꼭 지켜 주세요.
          </p>

          <div className="divide-y divide-slate-100 border border-blue-100 rounded-2xl bg-blue-50/40">
            {INTERNET_ETHICS_PRINCIPLES.map((item, idx) => (
              <div key={item.id} className="p-4 flex items-start gap-3">
                <span className="text-sm font-bold text-blue-700 tabular-nums shrink-0 mt-0.5">
                  0{idx + 1}.
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {onAgree && !ethicsAgreed ? (
              <button
                type="button"
                onClick={async () => {
                  await onAgree();
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                네, 인터넷 윤리를 지킬게요
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                확인했어요
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
