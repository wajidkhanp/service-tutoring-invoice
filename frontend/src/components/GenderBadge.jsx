import { Mars, Venus } from 'lucide-react';

export default function GenderBadge({ gender }) {
  if (!gender) return null;
  const isMale = gender === 'male';
  return (
    <span className={`gender-badge gender-badge-${gender}`}>
      {isMale ? <Mars size={11} strokeWidth={2.5} /> : <Venus size={11} strokeWidth={2.5} />}
    </span>
  );
}
