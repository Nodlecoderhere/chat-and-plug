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
const AVATAR_URL_KEY = 'plug_chat_avatar_url';

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

export function getStoredAvatarUrl(): string {
  return localStorage.getItem(AVATAR_URL_KEY) || '';
}

export function setStoredAvatarUrl(url: string): void {
  if (url) {
    localStorage.setItem(AVATAR_URL_KEY, url);
  } else {
    localStorage.removeItem(AVATAR_URL_KEY);
  }
}

export function sanitizeNickname(input: string): string {
  let cleaned = input.trim().replace(/[<>/]/g, '');
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20);
  }
  if (!cleaned) {
    return generateRandomNickname();
  }
  if (/^(system|admin|moderator|official|plugchat)$/i.test(cleaned)) {
    return `User_${cleaned}`;
  }
  return cleaned;
}

/**
 * Resizes and crops any uploaded user image file into an optimized 256x256 square data URL (~10-15KB)
 */
export function processProfilePicture(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select an image file (PNG, JPG, WebP)'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Failed to create canvas context'));
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Center square crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 256, 256);

        // Convert to optimized JPEG data URL (~10-15KB string)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to process image file'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
