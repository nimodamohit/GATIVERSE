import React from 'react';
import { notFound } from 'next/navigation';
import { getTrainByNumber, MOCK_TRAINS } from '@/data/mockTrains';
import { TrainDetailsClient } from '@/components/TrainDetailsClient';

interface PageProps {
  params: Promise<{
    trainNumber: string;
  }>;
}

export default async function TrainDetailsPage({ params }: PageProps) {
  const { trainNumber } = await params;
  const train = getTrainByNumber(trainNumber) || MOCK_TRAINS[0];

  if (!train) {
    notFound();
  }

  return <TrainDetailsClient train={train} />;
}


