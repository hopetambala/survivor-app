import AdminHeader from "../../../components/AdminHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}
