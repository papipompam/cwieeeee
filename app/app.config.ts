export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      secondary: 'purple',
      success: 'emerald',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      neutral: 'zinc',
    },
    icons: {
      loading: 'i-lucide-loader-circle',
      search: 'i-lucide-search',
    },
    toaster: {
      defaultVariants: {
        position: 'top-center',
      },
    },
    button: {
      slots: {
        base: 'cursor-pointer rounded-[var(--radius-control)] font-medium',
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-ink bg-primary hover:bg-primary/85 active:bg-primary/85',
        },
        {
          color: 'warning',
          variant: 'solid',
          class: 'text-ink bg-warning hover:bg-warning/85 active:bg-warning/85',
        },
      ],
    },
    input: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
      },
    },
    textarea: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
      },
    },
    select: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
        content: 'rounded-[var(--radius-panel)]',
      },
    },
    checkbox: {
      slots: {
        base: 'rounded cursor-pointer',
      },
    },
    formField: {
      slots: {
        label: 'block font-semibold text-ink text-sm',
        error: 'mt-1.5 text-xs font-medium text-danger',
      },
    },
    card: {
      slots: {
        root: 'rounded-[var(--radius-panel)] shadow-panel bg-canvas ring ring-divider divide-y divide-divider',
      },
    },
    table: {
      slots: {
        thead: 'relative bg-surface',
        tr: 'transition-colors hover:bg-surface/60 data-[selected=true]:bg-surface',
      },
    },
    modal: {
      slots: {
        content: 'bg-canvas divide-y divide-divider flex flex-col focus:outline-none rounded-[var(--radius-panel)] shadow-panel ring ring-divider',
      },
    },
    badge: {
      slots: {
        base: 'font-medium inline-flex items-center rounded-md',
      },
    },
    alert: {
      slots: {
        root: 'rounded-[var(--radius-control)]',
        title: 'text-sm font-semibold',
      },
      defaultVariants: {
        variant: 'subtle',
      },
    },
    dropdownMenu: {
      slots: {
        content: 'bg-canvas shadow-panel rounded-[var(--radius-panel)] ring ring-divider',
        viewport: 'divide-y divide-divider',
        separator: 'bg-divider',
        item: 'rounded-[var(--radius-control)]',
      },
    },
    pagination: {
      slots: {
        list: 'flex items-center gap-1',
      },
    },
    tabs: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'pill',
          class: {
            trigger: 'data-[state=active]:text-ink',
          },
        },
      ],
    },
  },
})
