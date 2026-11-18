import { useOwnerConsoleContext } from '@/hooks/useOwnerConsoleContext';
import { OwnerStudioListBand } from '@/components/admin/owner/OwnerStudioListBand';

const OwnerStudios = () => {
  const { studios, search, setSearch } = useOwnerConsoleContext();

  return <OwnerStudioListBand studios={studios} search={search} onSearchChange={setSearch} />;
};

export default OwnerStudios;
