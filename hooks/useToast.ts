import toast from 'react-hot-toast'

export function useArenaToast() {
  const success = (msg: string) =>
    toast.success(msg, {
      duration: 4000,
      style: {
        background: '#0D1117',
        color:      '#00FF87',
        border:     '1px solid #00FF87',
        fontFamily: '"DM Mono", monospace',
        fontSize:   '0.85rem',
      },
      iconTheme: { primary: '#00FF87', secondary: '#0D1117' },
    })

  const error = (msg: string) =>
    toast.error(msg, {
      duration: 5000,
      style: {
        background: '#0D1117',
        color:      '#E5202E',
        border:     '1px solid #E5202E',
        fontFamily: '"DM Mono", monospace',
        fontSize:   '0.85rem',
      },
      iconTheme: { primary: '#E5202E', secondary: '#0D1117' },
    })

  const loading = (msg: string) =>
    toast.loading(msg, {
      style: {
        background: '#0D1117',
        color:      '#F5A623',
        border:     '1px solid #F5A623',
        fontFamily: '"DM Mono", monospace',
        fontSize:   '0.85rem',
      },
    })

  const info = (msg: string) =>
    toast(msg, {
      duration: 4000,
      style: {
        background: '#0D1117',
        color:      '#00D9FF',
        border:     '1px solid #00D9FF',
        fontFamily: '"DM Mono", monospace',
        fontSize:   '0.85rem',
      },
      icon: '⚡',
    })

  return { success, error, loading, info, dismiss: toast.dismiss }
}
