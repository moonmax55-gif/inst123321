import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { fetchJson } from '../lib/api';
import { ClassUser } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ClassUser;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onUpdated: (user: ClassUser) => void;
}

const AVATAR_COLORS = ['#1E40AF', '#1D4ED8', '#2563EB', '#0284C7', '#0369A1', '#0EA5E9'];

export function ProfileModal({
  isOpen,
  onClose,
  user,
  getAuthHeaders,
  onUpdated,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [studentNumber, setStudentNumber] = useState(
    user.studentNumber ? String(user.studentNumber) : ''
  );
  const [bio, setBio] = useState(user.bio || '');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || '#2563EB');
  const [teacherCode, setTeacherCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const parsedNum = studentNumber.trim() ? Number(studentNumber.trim()) : null;
      const data = await fetchJson<{ user: ClassUser }>('/api/users/me', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          displayName: displayName.trim(),
          studentNumber: parsedNum,
          bio: bio.trim(),
          avatarColor,
        }),
      });
      onUpdated(data.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClaimTeacher = async () => {
    if (!teacherCode.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const data = await fetchJson<{ user: ClassUser }>('/api/users/claim-teacher', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: teacherCode.trim() }),
      });
      onUpdated(data.user);
      setTeacherCode('');
      setSuccessMsg('선생님 권한이 확인되었습니다!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="profile-modal-title" className="text-lg font-bold text-slate-900">
            내 학급 프로필 설정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 hover:bg-blue-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-600 mb-1">
              이름 (학급에서 부르는 이름)
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {user.role === 'student' && (
            <div>
              <label htmlFor="profile-num" className="block text-xs font-semibold text-slate-600 mb-1">
                학급 번호 (선택)
              </label>
              <input
                id="profile-num"
                type="number"
                min={1}
                max={99}
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="예: 12"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-600 mb-1">
              한 줄 소개
            </label>
            <input
              id="profile-bio"
              type="text"
              maxLength={120}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="친구들에게 인사 한마디를 적어보세요"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">프로필 파랑 색상</p>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    avatarColor === c ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`색상 ${c}`}
                />
              ))}
            </div>
          </div>

          {user.role === 'student' && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                담임 선생님이신가요? (교사 코드 입력)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  placeholder="교사 인증 코드 (예: BLUE2026)"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={handleClaimTeacher}
                  disabled={saving || !teacherCode.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  교사 인증
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-800">
              {successMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
