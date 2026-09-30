'use client';

import { useEffect } from 'react';
import { setLastCheckedTrain } from '@/utils/storage';

interface TrackLastCheckedTrainProps {
  trainNumber: string;
}

export const TrackLastCheckedTrain: React.FC<TrackLastCheckedTrainProps> = ({ trainNumber }) => {
  useEffect(() => {
    if (trainNumber) {
      setLastCheckedTrain(trainNumber);
    }
  }, [trainNumber]);

  return null;
};
