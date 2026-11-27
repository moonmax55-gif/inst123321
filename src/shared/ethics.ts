export interface EthicsIssue {
  category: 'profanity' | 'bullying' | 'pii' | 'empty';
  title: string;
  guidance: string;
  matchedTerm?: string;
}

export interface EthicsCheckResult {
  passed: boolean;
  issues: EthicsIssue[];
}

const PROFANITY_PATTERNS: RegExp[] = [
  /씨발|시발|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|개새끼|새끼|지랄|ㅈㄹ|미친놈|미친년|미친새|닥쳐|꺼져|죽어|뒤져|존나|ㅈㄴ|썅|씹|느금|니엄|엠창|엿먹/i,
  /fuck|shit|bitch|asshole|bastard/i,
];

const BULLYING_PATTERNS: RegExp[] = [
  /왕따|찐따|찌질|극혐|혐오|못생겼|뚱보|돼지같|바보같|멍청이|꺼지라|놀리지|재수없|꼴보기/i,
];

const PHONE_PATTERN = /(01[016789]|02|0[3-6][1-5])[-\s.]?\d{3,4}[-\s.]?\d{4}/;
const RRN_PATTERN = /\b\d{6}[-\s]?\d{7}\b/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PASSWORD_HINT_PATTERN = /(비밀번호|비번|패스워드|계좌번호)\s*[:은는이가]?\s*[a-zA-Z0-9!@#$%^&*-]{4,}/i;

export function checkInternetEthics(text: string): EthicsCheckResult {
  const trimmed = text.trim();
  const issues: EthicsIssue[] = [];

  if (!trimmed) {
    issues.push({
      category: 'empty',
      title: '내용을 입력해 주세요',
      guidance: '글이나 따뜻한 메시지를 한 줄 이상 작성해야 게시할 수 있어요.',
    });
    return { passed: false, issues };
  }

  for (const pattern of PROFANITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      issues.push({
        category: 'profanity',
        title: '고운 말을 사용해 주세요',
        guidance: '비속어나 거친 표현은 읽는 친구의 마음을 아프게 할 수 있어요. 바르고 고운 표현으로 고쳐 볼까요?',
        matchedTerm: match[0],
      });
      break;
    }
  }

  for (const pattern of BULLYING_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      issues.push({
        category: 'bullying',
        title: '친구를 배려하는 마음이 필요해요',
        guidance: '외모 비하나 놀림, 따돌림을 연상시키는 말은 사이버 폭력이 될 수 있어요. 서로 존중하는 말을 써 주세요.',
        matchedTerm: match[0],
      });
      break;
    }
  }

  if (PHONE_PATTERN.test(trimmed)) {
    issues.push({
      category: 'pii',
      title: '전화번호가 포함되어 있어요',
      guidance: '개인정보 보호를 위해 본인이나 친구의 전화번호는 게시물에 올리지 않도록 지워 주세요.',
    });
  }

  if (RRN_PATTERN.test(trimmed)) {
    issues.push({
      category: 'pii',
      title: '중요 개인정보(주민번호 형태)가 감지되었어요',
      guidance: '소중한 개인정보가 유출되지 않도록 숫자 식별 정보를 삭제해 주세요.',
    });
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    issues.push({
      category: 'pii',
      title: '이메일 주소가 포함되어 있어요',
      guidance: '개인정보 보호를 위해 이메일 주소는 공개 게시글에 적지 않는 것이 안전해요.',
    });
  }

  if (PASSWORD_HINT_PATTERN.test(trimmed)) {
    issues.push({
      category: 'pii',
      title: '비밀번호 또는 계좌 정보가 포함되어 있어요',
      guidance: '비밀번호나 계좌번호 같은 민감한 정보는 절대 온라인에 올리면 안 돼요.',
    });
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

export const INTERNET_ETHICS_PRINCIPLES = [
  {
    id: 'kind-words',
    title: '바르고 고운 말 쓰기',
    description: '화면 너머 친구의 표정을 떠올리며 존중과 응원의 말을 건네요.',
  },
  {
    id: 'portrait-rights',
    title: '초상권과 사진 동의 지키기',
    description: '친구 얼굴이 나온 사진은 올리기 전에 꼭 허락을 구해요.',
  },
  {
    id: 'privacy',
    title: '소중한 개인정보 보호하기',
    description: '전화번호, 집 주소, 비밀번호는 게시물이나 댓글에 적지 않아요.',
  },
  {
    id: 'copyright',
    title: '출처 밝히고 저작권 지키기',
    description: '직접 찍은 사진이나 글이 아니라면 출처를 정확히 밝혀요.',
  },
] as const;
