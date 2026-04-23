type Props = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ShowPasswordToggle({ id, checked, onChange }: Props) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-brand-line text-brand-red focus:ring-brand-red/30 dark:border-brand-panel-border"
      />
      <label htmlFor={id} className="cursor-pointer select-none text-sm text-brand-muted dark:text-brand-surface/70">
        Показать пароль
      </label>
    </div>
  );
}
