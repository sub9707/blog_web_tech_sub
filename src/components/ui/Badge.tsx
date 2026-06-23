interface Props {
  children: React.ReactNode;
}

export default function Badge({ children }: Props) {
  return (
    <span className="text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-slate-400">
      {children}
    </span>
  );
}
