const ADJECTIVES = [
  'Pixel', 'Neon', 'Cyber', 'Quantum', 'Sonic', 'Cosmic', 'Electric', 'Lunar',
  'Solar', 'Turbo', 'Shadow', 'Hyper', 'Velox', 'Apex', 'Astro', 'Zenith',
  'Pulse', 'Vector', 'Spectra', 'Nova', 'Mirage', 'Glitch', 'Vortex', 'Orbital'
];

const ANIMALS = [
  'Fox', 'Byte', 'Panda', 'Koala', 'Falcon', 'Lynx', 'Viper', 'Otter',
  'Hawk', 'Phoenix', 'Dragon', 'Tiger', 'Wolf', 'Dolphin', 'Raven', 'Puffin',
  'Jaguar', 'Gecko', 'Bison', 'Mantis', 'Cobra', 'Sparrow', 'Orion', 'Pulse'
];

const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-amber-400 to-orange-600',
  'from-fuchsia-500 to-pink-600',
  'from-indigo-500 to-cyan-500',
  'from-lime-400 to-emerald-600',
];

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}${animal}${num}`;
}

export function getRandomAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

const VISITOR_KEY = 'plug_chat_visitor_id';
const NICKNAME_KEY = 'plug_chat_nickname';
const COLOR_KEY = 'plug_chat_color';

export function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getStoredNickname(): string {
  const stored = localStorage.getItem(NICKNAME_KEY);
  if (stored && stored.trim()) {
    return sanitizeNickname(stored);
  }
  const newNick = generateRandomNickname();
  localStorage.setItem(NICKNAME_KEY, newNick);
  return newNick;
}

export function setStoredNickname(nickname: string): string {
  const sanitized = sanitizeNickname(nickname);
  localStorage.setItem(NICKNAME_KEY, sanitized);
  return sanitized;
}

export function getStoredAvatarColor(visitorId: string): string {
  let stored = localStorage.getItem(COLOR_KEY);
  if (!stored) {
    stored = getRandomAvatarColor(visitorId);
    localStorage.setItem(COLOR_KEY, stored);
  }
  return stored;
}

export function sanitizeNickname(input: string): string {
  let cleaned = input.trim().replace(/[<>/]/g, '');
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20);
  }
  if (!cleaned) {
    return generateRandomNickname();
  }
  // Prevent impersonation of system / admin reserved keywords
  if (/^(system|admin|moderator|official|plugchat)$/i.test(cleaned)) {
    return `User_${cleaned}`;
  }
  return cleaned;
}
