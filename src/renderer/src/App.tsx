import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { BrandingProvider } from '@/branding/branding-provider'
import { useBranding } from '@/branding/branding-context'
import { LockScreen } from '@/branding/lock-screen'
import { SetupPage } from '@/branding/setup-page'
import { AppLayout } from '@/components/layout/app-layout'
import { CustomerEditPage } from '@/pages/customer-edit'
import { DashboardPage } from '@/pages/dashboard'
import { CustomersPage } from '@/pages/customers'
import { KeysPage } from '@/pages/keys'
import { PartsPage } from '@/pages/parts'
import { QuoteEditorPage } from '@/pages/quote-editor'
import { QuotesListPage } from '@/pages/quotes-list'
import { SettingsPage } from '@/pages/settings'
import { VehicleDetailPage } from '@/pages/vehicle-detail'
import { VehicleNewPage } from '@/pages/vehicle-new'
import { VehiclesPage } from '@/pages/vehicles'

/** Sem configuração inicial, só o assistente; com senha e bloqueado, só a tela de senha. */
function SetupGate() {
  const { branding } = useBranding()
  if (!branding.setupCompleted) return <SetupPage />
  if (branding.locked) return <LockScreen />
  return <Outlet />
}

const router = createHashRouter([
  {
    element: <SetupGate />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/painel" replace /> },
          { path: 'painel', element: <DashboardPage /> },
          { path: 'orcamentos', element: <QuotesListPage /> },
          { path: 'orcamentos/novo', element: <QuoteEditorPage /> },
          { path: 'orcamentos/:id', element: <QuoteEditorPage /> },
          { path: 'clientes', element: <CustomersPage /> },
          { path: 'clientes/:id', element: <CustomerEditPage /> },
          { path: 'veiculos', element: <VehiclesPage /> },
          { path: 'veiculos/novo', element: <VehicleNewPage /> },
          { path: 'veiculos/:plate', element: <VehicleDetailPage /> },
          { path: 'pecas', element: <PartsPage /> },
          { path: 'chaves', element: <KeysPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/painel" replace /> }
        ]
      }
    ]
  }
])

export function App() {
  return (
    <BrandingProvider>
      <RouterProvider router={router} />
    </BrandingProvider>
  )
}
