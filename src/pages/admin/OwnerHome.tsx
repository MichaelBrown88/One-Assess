import { useOwnerConsoleContext } from '@/hooks/useOwnerConsoleContext';
import { useOwnerTrends } from '@/hooks/useOwnerTrends';
import { OwnerPulseBand } from '@/components/admin/owner/OwnerPulseBand';
import { OwnerTrendBand } from '@/components/admin/owner/OwnerTrendBand';
import { OwnerPayMixBand } from '@/components/admin/owner/OwnerPayMixBand';
import { OwnerNeedsYouBand } from '@/components/admin/owner/OwnerNeedsYouBand';

const OwnerHome = () => {
  const { pulse, needsYou, allStudios } = useOwnerConsoleContext();
  const { loading: trendsLoading, points } = useOwnerTrends();

  return (
    <>
      <OwnerPulseBand pulse={pulse} />
      <OwnerTrendBand points={points} loading={trendsLoading} />
      <OwnerPayMixBand studios={allStudios} />
      <OwnerNeedsYouBand studios={needsYou} />
    </>
  );
};

export default OwnerHome;
