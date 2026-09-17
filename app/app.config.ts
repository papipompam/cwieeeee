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
        base: 'cursor-pointer',
      },
    },
  },
})
