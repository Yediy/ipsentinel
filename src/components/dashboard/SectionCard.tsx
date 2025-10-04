import { ReactNode } from 'react';

export function SectionCard({
  title,
  description,
  children,
  id,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
