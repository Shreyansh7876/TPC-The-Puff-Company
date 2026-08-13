import React, { useState, useEffect } from 'react';
import { settingsStore } from '../services/settingsStore';
import { Store } from 'lucide-react';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'badge' | 'minimal';
  theme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  logoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 'md',
  logoUrl: propLogoUrl,
}) => {
  const [storeLogoUrl, setStoreLogoUrl] = useState<string>(
    propLogoUrl !== undefined ? propLogoUrl : settingsStore.getSettings().storeProfile.storeLogoUrl || ''
  );
  const [storeName, setStoreName] = useState<string>(
    settingsStore.getSettings().storeProfile.storeName || 'The Puff Co.'
  );
  const [storeTagline, setStoreTagline] = useState<string>(
    settingsStore.getSettings().storeProfile.storeTagline || 'Pure Veg Gourmet Puffs'
  );

  useEffect(() => {
    if (propLogoUrl !== undefined) {
      setStoreLogoUrl(propLogoUrl);
      return;
    }
    return settingsStore.subscribeSettings((settings) => {
      setStoreLogoUrl(settings.storeProfile.storeLogoUrl || '');
      setStoreName(settings.storeProfile.storeName || 'The Puff Co.');
      setStoreTagline(settings.storeProfile.storeTagline || 'Pure Veg Gourmet Puffs');
    });
  }, [propLogoUrl]);

  // Dimensions map
  const dimensions = {
    sm: { icon: 'w-7 h-7', text: 'text-sm', title: 'text-base', container: 'gap-2' },
    md: { icon: 'w-10 h-10', text: 'text-base', title: 'text-xl', container: 'gap-3' },
    lg: { icon: 'w-14 h-14', text: 'text-lg', title: 'text-2xl', container: 'gap-3.5' },
    xl: { icon: 'w-20 h-20', text: 'text-2xl', title: 'text-4xl', container: 'gap-4' }
  }[size];

  const primaryTextColor = theme === 'dark' ? 'text-[#f4efe8]' : 'text-[#2e211d]';

  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${dimensions.container} ${className}`}>
        <div className={`${dimensions.icon} rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
          {storeLogoUrl ? (
            <img src={storeLogoUrl} alt={storeName} className="w-full h-full object-contain" />
          ) : (
            <Store className="w-5 h-5 text-[#8c3a27]" />
          )}
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-['Cinzel'] tracking-[0.2em] text-[9px] font-bold text-[#8c3a27] uppercase">
            {storeTagline.length > 25 ? storeTagline.slice(0, 25) + '...' : storeTagline}
          </span>
          <span className={`font-['Playfair_Display'] font-black tracking-wider ${dimensions.title} ${primaryTextColor} uppercase`}>
            {storeName}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {storeLogoUrl ? (
          <img src={storeLogoUrl} alt={storeName} className={`${dimensions.icon} object-contain`} />
        ) : (
          <div className={`${dimensions.icon} rounded-lg bg-[#e2d7c9]/40 border border-[#a19284]/30 flex items-center justify-center`}>
            <Store className="w-5 h-5 text-[#8c3a27]" />
          </div>
        )}
        <span className={`font-['Playfair_Display'] font-black tracking-widest ${dimensions.title} ${primaryTextColor} uppercase`}>
          {storeName}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative flex flex-col items-center">
        <span className="font-['Cinzel'] text-[10px] md:text-xs font-bold tracking-[0.25em] text-[#8c3a27] uppercase mb-1">
          {storeTagline}
        </span>

        <div className="relative my-1 flex flex-col items-center">
          <div className="relative w-20 h-20 md:w-24 md:h-24 p-2 rounded-2xl bg-white border-2 border-[#e2d7c9] shadow-inner flex items-center justify-center overflow-hidden">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName} className="w-full h-full object-contain" />
            ) : (
              <Store className="w-10 h-10 text-[#8c3a27]" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center mt-2 leading-tight">
          <h1 className={`font-['Playfair_Display'] font-black text-2xl md:text-3xl tracking-[0.15em] ${primaryTextColor} uppercase my-0.5`}>
            {storeName}
          </h1>
        </div>
      </div>
    </div>
  );
};
