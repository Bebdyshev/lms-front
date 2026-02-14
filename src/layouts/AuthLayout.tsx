import MaintenanceBanner from '../components/MaintenanceBanner.tsx';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-blue-500">
      {/* <MaintenanceBanner /> */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            {children}
        </div>
      </div>
    </div>
  );
}
