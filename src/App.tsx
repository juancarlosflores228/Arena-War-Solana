import { useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ConnectionProvider, WalletProvider }    from '@solana/wallet-adapter-react'
import { WalletModalProvider }                   from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter }                  from '@solana/wallet-adapter-phantom'
import '@solana/wallet-adapter-react-ui/styles.css'

import { TournamentProvider } from './context/TournamentContext'
import { LangProvider }       from './context/LangContext'
import Navbar           from './components/Navbar'
import Footer           from './components/Footer'
import ActivityFeed     from './components/ActivityFeed'
import Home             from './pages/Home'
import CreateTournament from './pages/CreateTournament'
import Dashboard        from './pages/Dashboard'
import AdminPanel       from './pages/AdminPanel'
import MundialTab       from './components/Mundial/MundialTab'

export default function App() {
  const endpoint = useMemo(() => 'https://mainnet.helius-rpc.com/?api-key=b82c6ef8-3fda-4dfb-a818-33342fc750c1', [])
  const wallets  = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TournamentProvider>
            <LangProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-arena-bg font-body text-arena-text flex flex-col">
                  <Navbar />
                  <div className="flex-1 flex items-start">
                    <main className="flex-1 min-w-0">
                      <Routes>
                        <Route path="/"          element={<Home />}             />
                        <Route path="/create"    element={<CreateTournament />} />
                        <Route path="/dashboard" element={<Dashboard />}        />
                        <Route path="/admin"     element={<AdminPanel />}       />
                        <Route path="/mundial"   element={<MundialTab />}       />
                      </Routes>
                    </main>
                    {/* Activity sidebar — visible only on XL screens */}
                    <aside className="hidden xl:flex w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
                      <ActivityFeed />
                    </aside>
                  </div>
                  <Footer />
                </div>
              </BrowserRouter>
            </LangProvider>
          </TournamentProvider>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111827',
                color:      '#E5E7EB',
                border:     '1px solid #1F2937',
              },
            }}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}