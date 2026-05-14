import { UserRound } from 'lucide-react';

export default function GenderBadge({ gender }) {
  if (!gender) return null;
  return (
    <span className={`gender-badge gender-badge-${gender}`}>
      <UserRound size={11} strokeWidth={2.5} />
    </span>
  );
}
