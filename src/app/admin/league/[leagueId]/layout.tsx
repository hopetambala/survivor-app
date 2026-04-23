import AdminHeader from "../../../../components/AdminHeader";

export default function LeagueAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}
