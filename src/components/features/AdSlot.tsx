import { useEffect, useState } from 'react';
import { getActiveAds } from '@/lib/api';
import { AdPlacement } from '@/types/database';

interface AdSlotProps {
  position: 'feed' | 'sidebar' | 'profile' | 'video';
  className?: string;
}

export function AdSlot({ position, className = '' }: AdSlotProps) {
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    loadAds();
  }, [position]);

  const loadAds = async () => {
    const data = await getActiveAds(position);
    setAds(data);
  };

  if (ads.length === 0) return null;

  const currentAd = ads[currentAdIndex];

  return (
    <div className={`ad-slot ${className}`}>
      <div className="text-xs text-muted-foreground mb-1 text-center">Advertisement</div>
      <div 
        dangerouslySetInnerHTML={{ __html: currentAd.ad_code }}
        className="border rounded-lg p-4 bg-muted/50"
      />
    </div>
  );
}
