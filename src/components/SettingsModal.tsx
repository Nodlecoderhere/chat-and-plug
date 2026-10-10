import React, { useState, useRef } from 'react';
import { generateRandomNickname, sanitizeNickname, processProfilePicture } from '../lib/nickname';
import { 
  X, 
  Palette, 
  UserCheck, 
  Image as ImageIcon, 
  Dices, 
  Check, 
  Trash2,
  Sparkles,
  Sliders,
  Camera,
  Upload,
  User,
  Loader2
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  onSaveNickname: (newNickname: string) => void;
  avatarUrl: string;
  onChangeAvatarUrl: (url: string) => void;
  accentColor: string;
  onChangeAccentColor: (color: string) => void;
  chatBgImage: string;
  onChangeChatBgImage: (url: string) => void;
  chatBgOpacity: number;
  onChangeChatBgOpacity: (opacity: number) => void;
}

const COLOR_PRESETS = [
  { name: 'Pixel Blue', hex: '#a8c7fa' },
  { name: 'Mint Green', hex: '#81c995' },
  { name: 'Sunset Gold', hex: '#fdd663' },
  { name: 'Rose Coral', hex: '#f2b8b5' },
  { name: 'Lavender', hex: '#d7aefb' },
  { name: 'Electric Cyan', hex: '#38bdf8' },
  { name: 'Emerald', hex: '#34d399' },
  { name: 'Hot Pink', hex: '#f472b6' },
];

const BG_PRESETS = [
  { name: 'Default Dark', url: '' },
  { name: 'Dark Mesh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Minimal Lines', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentNickname,
  onSaveNickname,
  avatarUrl,
  onChangeAvatarUrl,
  accentColor,
  onChangeAccentColor,
  chatBgImage,
  onChangeChatBgImage,
  chatBgOpacity,
  onChangeChatBgOpacity,
}) => {
  const [nickInput, setNickInput] = useState(currentNickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [currentPfp, setCurrentPfp] = useState<string>(avatarUrl);
  const [isProcessingPfp, setIsProcessingPfp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [customBgInput, setCustomBgInput] = useState(chatBgImage);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleRandomizeNick = () => {
    setNickInput(generateRandomNickname());
    setNickError(null);
  };

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPfp(true);
    setNickError(null);

    try {
      // Crop and resize to 512x512
      const processedDataUrl = await processProfilePicture(file);
      setCurrentPfp(processedDataUrl);
      onChangeAvatarUrl(processedDataUrl);
    } catch (err: unknown) {
      console.error('Failed to process PFP:', err);
      setNickError(err instanceof Error ? err.message : 'Error uploading profile picture');
    } finally {
      setIsProcessingPfp(false);
    }
  };

  const handleRemovePfp = () => {
    setCurrentPfp('');
    onChangeAvatarUrl('');
  };

  const handleSaveAll = () => {
    const trimmed = nickInput.trim();
    if (!trimmed) {
      setNickError('Nickname cannot be empty');
      return;
    }
    if (trimmed.length > 20) {
      setNickError('Nickname cannot exceed 20 characters');
      return;
    }

    const sanitized = sanitizeNickname(trimmed);
    onSaveNickname(sanitized);

    if (customBgInput !== chatBgImage) {
      onChangeChatBgImage(customBgInput.trim());
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-[#1e1f20] border border-[#282a2d] p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282a2d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#282a2d] text-[#a8c7fa]">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#e3e2e6] font-['Google_Sans']">
                Profile &amp; Appearance Settings
              </h3>
              <p className="text-xs text-[#8e9099]">
                Upload 512x512 profile photo, customize nickname, and change theme
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#c4c6d0] hover:bg-[#282a2d] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-[#0f5223] p-3 text-xs text-[#c2ebd0] animate-fadeIn">
            <Check className="h-4 w-4 shrink-0" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* 1. Profile Picture Upload (512x512) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
            <Camera className="h-4 w-4" />
            <span>Profile Photo (512x512 Square)</span>
          </h4>

          <div className="flex items-center gap-4 bg-[#282a2d] p-4 rounded-2xl">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              {currentPfp ? (
                <img
                  src={currentPfp}
                  alt="Profile Picture"
                  className="h-20 w-20 rounded-full object-cover border-2 border-[#a8c7fa] shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#004a77] text-white font-bold text-2xl font-['Google_Sans']">
                  {nickInput.charAt(0).toUpperCase() || <User className="h-10 w-10" />}
                </div>
              )}

              {isProcessingPfp && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-[#a8c7fa]" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePfpUpload}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPfp}
                  className="flex items-center gap-2 rounded-full bg-[#a8c7fa] px-4 py-2 text-xs font-bold text-[#00315a] hover:bg-[#c2e7ff] transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{currentPfp ? 'Change Photo (512x512)' : 'Upload Photo'}</span>
                </button>

                {currentPfp && (
                  <button
                    type="button"
                    onClick={handleRemovePfp}
                    className="flex items-center gap-1.5 rounded-full bg-[#3c1414] px-3.5 py-2 text-xs font-semibold text-[#f2b8b5] hover:bg-[#4d1818] transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#8e9099]">
                Supports PNG, JPG, or WebP. Auto-crops &amp; resizes to 512x512 px.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Change Nickname (Visible to all) */}
        <div className="space-y-3 border-t border-[#282a2d] pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
            <UserCheck className="h-4 w-4" />
            <span>Display Nickname (Visible to all)</span>
          </h4>

          <div className="relative">
            <input
              type="text"
              value={nickInput}
              onChange={(e) => {
                setNickInput(e.target.value);
                if (nickError) setNickError(null);
              }}
              maxLength={20}
              placeholder="e.g. PixelFox42"
              className="w-full rounded-2xl bg-[#282a2d] px-4 py-3 font-mono text-sm text-[#e3e2e6] placeholder-[#8e9099] focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
            />
            <button
              type="button"
              onClick={handleRandomizeNick}
              className="absolute right-2 top-2 rounded-xl bg-[#383a3d] p-2 text-[#e3e2e6] transition hover:bg-[#484a4d] hover:text-[#a8c7fa]"
              title="Randomize Nickname"
            >
              <Dices className="h-4 w-4" />
            </button>
          </div>

          {nickError && (
            <p className="text-xs text-[#f2b8b5] font-medium">{nickError}</p>
          )}
        </div>

        {/* 3. Theme Accent Selector */}
        <div className="space-y-3 border-t border-[#282a2d] pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
            <Palette className="h-4 w-4" />
            <span>Theme Accent Color (User side only)</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => onChangeAccentColor(preset.hex)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                  accentColor.toLowerCase() === preset.hex.toLowerCase()
                    ? 'border-white bg-[#383a3d] text-white shadow-md'
                    : 'border-[#383a3d] bg-[#282a2d] text-[#c4c6d0] hover:bg-[#333538]'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full shadow-inner"
                  style={{ backgroundColor: preset.hex }}
                />
                <span>{preset.name}</span>
                {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs text-[#8e9099] font-medium">Custom Color:</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => onChangeAccentColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <span className="font-mono text-xs text-[#a8c7fa] font-bold">{accentColor}</span>
            </div>
          </div>
        </div>

        {/* 4. Custom Chat Background */}
        <div className="space-y-3 border-t border-[#282a2d] pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
            <ImageIcon className="h-4 w-4" />
            <span>Custom Chat Background Image (User side only)</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setCustomBgInput(preset.url);
                  onChangeChatBgImage(preset.url);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition ${
                  chatBgImage === preset.url
                    ? 'border-[#a8c7fa] bg-[#383a3d] text-white shadow-md'
                    : 'border-[#282a2d] bg-[#282a2d] text-[#c4c6d0] hover:bg-[#333538]'
                }`}
              >
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] text-[#8e9099] mb-1 font-medium">
              Image URL (https://... or data image URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customBgInput}
                onChange={(e) => setCustomBgInput(e.target.value)}
                placeholder="https://example.com/wallpaper.jpg"
                className="flex-1 rounded-2xl bg-[#282a2d] px-4 py-2 text-xs font-mono text-[#e3e2e6] placeholder-[#8e9099] focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
              />
              {customBgInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBgInput('');
                    onChangeChatBgImage('');
                  }}
                  className="rounded-2xl bg-[#3c1414] px-3 text-[#f2b8b5] hover:bg-[#4d1818]"
                  title="Clear background"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {chatBgImage && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-[#8e9099] mb-1">
                <span>Overlay Dimness:</span>
                <span className="font-mono font-bold text-[#a8c7fa]">{Math.round(chatBgOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={chatBgOpacity}
                onChange={(e) => onChangeChatBgOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#a8c7fa] bg-[#282a2d] rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#282a2d] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#282a2d] px-5 py-2.5 text-xs font-semibold text-[#e3e2e6] hover:bg-[#333538]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 rounded-full bg-[#a8c7fa] px-6 py-2.5 text-xs font-bold text-[#00315a] hover:bg-[#c2e7ff] transition font-['Google_Sans'] shadow-md"
          >
            <Sparkles className="h-4 w-4" />
            <span>Save All Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
};
