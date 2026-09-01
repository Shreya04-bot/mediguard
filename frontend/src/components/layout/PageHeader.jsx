import React from "react";

export function PageHeader({ title, description, children, action }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {(action || children) && <div className="flex shrink-0 items-center gap-2">{action || children}</div>}
    </header>
  );
}
